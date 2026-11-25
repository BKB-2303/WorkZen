const r=require('express').Router();const bcrypt=require('bcryptjs');
const Task=require('../models/Task'),Note=require('../models/Note'),Bookmark=require('../models/Bookmark'),VaultItem=require('../models/VaultItem');
const {auth,userOnly}=require('../middleware/auth');const {encrypt,decrypt}=require('../utils/vaultCrypto');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const s=(v,n)=>String(v??'').slice(0,n);
const MAX=5000;

// login password required before anything containing saved passwords is exported / imported
const fails=new Map();
const checkPw=async(req)=>{
 const k=String(req.user._id),f=fails.get(k)||{n:0,until:0};
 if(f.until>Date.now())throw new Error(`Too many attempts. Try again in ${Math.ceil((f.until-Date.now())/1000)}s`);
 if(!(await bcrypt.compare(String(req.body?.password||''),req.user.password))){
  f.n++;if(f.n>=5){f.until=Date.now()+60000;f.n=0;}fails.set(k,f);throw new Error('Incorrect login password');
 }
 fails.delete(k);
};

r.post('/export',wrap(async(req,res)=>{
 const withPw=!!req.body?.includePasswords;
 if(withPw)await checkPw(req);
 const u=req.user._id;
 const [tasks,notes,bookmarks]=await Promise.all([
  Task.find({user:u}).sort({createdAt:1}).lean(),Note.find({user:u}).sort({createdAt:1}).lean(),Bookmark.find({user:u}).sort({createdAt:1}).lean()]);
 const out={app:'WorkZen',format:1,exportedAt:new Date().toISOString(),account:{username:req.user.username,name:req.user.name},
  tasks:tasks.map(t=>({title:t.title,notes:t.notes,project:t.project,priority:t.priority,status:t.status,dueDate:t.dueDate,checklist:t.checklist||[],completedAt:t.completedAt,createdAt:t.createdAt})),
  notes:notes.map(n=>({title:n.title,content:n.content,category:n.category,color:n.color,pinned:n.pinned,createdAt:n.createdAt,updatedAt:n.updatedAt})),
  bookmarks:bookmarks.map(b=>({title:b.title,url:b.url,description:b.description,category:b.category,favorite:b.favorite,visits:b.visits,createdAt:b.createdAt}))};
 if(withPw){
  const docs=await VaultItem.find({user:u,type:'password'}).sort({createdAt:1}).lean();
  out.passwords=[];let skipped=0;
  for(const d of docs){try{const x=decrypt(d.blob,u);out.passwords.push({title:x.title,url:x.url,username:x.username,password:x.password,notes:x.notes,category:x.category,favorite:!!x.favorite,createdAt:d.createdAt});}catch(e){skipped++;}}
  if(skipped)out.passwordsSkipped=skipped;
 }
 res.json(out);
}));

const date=v=>{const d=new Date(v);return isNaN(d)?undefined:d;};
const today=()=>new Date().toISOString().slice(0,10);
const key=(...a)=>a.map(x=>String(x||'').trim().toLowerCase()).join('\u0001');

r.post('/import',wrap(async(req,res)=>{
 const d=req.body?.data;
 if(!d||d.app!=='WorkZen'||typeof d!=='object')throw new Error('This is not a WorkZen backup file');
 const arr=k=>Array.isArray(d[k])?d[k].slice(0,MAX):[];
 const hasPw=arr('passwords').length>0;
 if(hasPw)await checkPw(req);
 const u=req.user._id,added={tasks:0,notes:0,bookmarks:0,passwords:0},skipped={tasks:0,notes:0,bookmarks:0,passwords:0};

 // tasks
 const haveT=new Set((await Task.find({user:u}).select('title dueDate project').lean()).map(t=>key(t.title,t.dueDate,t.project)));
 const T=[];
 for(const t of arr('tasks')){
  const title=s(t?.title,200).trim();if(!title)continue;
  const dueDate=/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate||'')?t.dueDate:today();
  const project=s(t.project,60).trim()||'General',k=key(title,dueDate,project);
  if(haveT.has(k)){skipped.tasks++;continue;}haveT.add(k);
  const status=['todo','inprogress','done'].includes(t.status)?t.status:'todo';
  T.push({user:u,title,notes:s(t.notes,2000),project,priority:['Low','Medium','High'].includes(t.priority)?t.priority:'Medium',status,dueDate,
   checklist:(Array.isArray(t.checklist)?t.checklist:[]).slice(0,50).map(c=>({text:s(c?.text,200),done:!!c?.done})).filter(c=>c.text.trim()),
   completedAt:status==='done'?(date(t.completedAt)||new Date()):null,createdAt:date(t.createdAt)});
 }
 if(T.length)await Task.insertMany(T);added.tasks=T.length;

 // notes
 const haveN=new Set((await Note.find({user:u}).select('title content').lean()).map(n=>key(n.title,n.content)));
 const N=[];
 for(const n of arr('notes')){
  const title=s(n?.title,120).trim(),content=s(n?.content,20000);if(!title&&!content.trim())continue;
  const k=key(title,content);if(haveN.has(k)){skipped.notes++;continue;}haveN.add(k);
  N.push({user:u,title,content,category:s(n.category,40).trim()||'General',color:['default','yellow','green','blue','pink','purple'].includes(n.color)?n.color:'default',pinned:!!n.pinned,createdAt:date(n.createdAt),updatedAt:date(n.updatedAt)});
 }
 if(N.length)await Note.insertMany(N);added.notes=N.length;

 // bookmarks
 const haveB=new Set((await Bookmark.find({user:u}).select('url').lean()).map(b=>key(b.url)));
 const B=[];
 for(const b of arr('bookmarks')){
  let url=s(b?.url,2000).trim();if(!url)continue;if(!/^https?:\/\//i.test(url))url='https://'+url;
  try{new URL(url);}catch(e){continue;}
  if(haveB.has(key(url))){skipped.bookmarks++;continue;}haveB.add(key(url));
  B.push({user:u,url,title:s(b.title,120).trim()||new URL(url).hostname.replace(/^www\./,''),description:s(b.description,300),category:s(b.category,40).trim()||'General',favorite:!!b.favorite,visits:Math.max(0,parseInt(b.visits)||0),createdAt:date(b.createdAt)});
 }
 if(B.length)await Bookmark.insertMany(B);added.bookmarks=B.length;

 // saved passwords (re-encrypted with this server's key)
 if(hasPw){
  const have=new Set();
  for(const v of await VaultItem.find({user:u,type:'password'}).lean()){try{const x=decrypt(v.blob,u);have.add(key(x.title,x.username,x.url));}catch(e){}}
  const P=[];
  for(const p of arr('passwords')){
   const x={title:s(p?.title,120).trim(),url:s(p?.url,500).trim(),username:s(p?.username,200),password:s(p?.password,500),notes:s(p?.notes,2000),category:s(p?.category,40).trim()||'General',favorite:!!p?.favorite};
   if(!x.title)continue;const k=key(x.title,x.username,x.url);
   if(have.has(k)){skipped.passwords++;continue;}have.add(k);
   P.push({user:u,type:'password',blob:encrypt(x,u)});
  }
  if(P.length)await VaultItem.insertMany(P);added.passwords=P.length;
 }
 res.json({added,skipped});
}));
module.exports=r;
