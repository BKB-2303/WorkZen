const Task=require('../models/Task'),Note=require('../models/Note'),Bookmark=require('../models/Bookmark'),Share=require('../models/Share');
const M={task:Task,note:Note,bookmark:Bookmark};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const person=u=>u?{id:u._id,name:u.name||u.username,username:u.username,avatar:u.avatar||'',online:!!u.lastSeen&&Date.now()-new Date(u.lastSeen).getTime()<90000}:null;
const strip=d=>{const {user,...rest}=d;return rest;};
const folderLabel=f=>{f=f||{};const p=[];if(f.year)p.push(f.year);if(f.month!=null)p.push(MONTHS[f.month]);if(f.project)p.push(f.year?f.project:'Project '+f.project);return p.length?p.join(' › '):'All tasks';};
// tasks that belong to a shared folder (always live: new tasks added to the folder appear automatically)
const folderQuery=s=>{
 const f=s.folder||{},q={user:s.from._id||s.from};
 if(f.year){
  const date=new RegExp('^'+f.year+(f.month!=null?'-'+String(f.month+1).padStart(2,'0'):''));
  q.$or=[{startDate:date},{startDate:{$in:['',null]},dueDate:date}];
 }
 if(f.project)q.project=f.project;
 return q;
};
// shares must have `from` (and optionally `team`) populated
async function resolve(list,me){
 const out=[],dead=[];
 for(const s of list){
  if(!s.from||s.from.active===false)continue;
  const base={id:s._id,kind:s.kind,from:person(s.from),perm:s.perm||'view',sharedAt:s.createdAt,mine:String(s.from._id)===String(me),canCopy:!!s.canCopy||String(s.from._id)===String(me),expiresAt:s.expiresAt||null,team:s.team&&s.team._id?{id:s.team._id,name:s.team.name}:null};
  if(s.kind==='folder'){
   const tasks=await Task.find(folderQuery(s)).sort({dueDate:-1,createdAt:-1}).limit(500).lean();
   out.push({...base,label:folderLabel(s.folder),folder:{year:(s.folder||{}).year||null,month:(s.folder||{}).month??null,project:(s.folder||{}).project||null},tasks:tasks.map(strip)});
  }else{
   const d=M[s.kind]&&await M[s.kind].findOne({_id:s.item,user:s.from._id}).lean();
   if(!d){dead.push(s._id);continue;}
   out.push({...base,item:strip(d)});
  }
 }
 if(dead.length)Share.deleteMany({_id:{$in:dead}}).catch(()=>{});
 return out;
}
// ids of every task/note/bookmark a list of shares gives access to (folders expand to their tasks)
async function scopeIds(list){
 const ids=[];
 for(const s of list){
  if(s.kind==='folder')(await Task.find(folderQuery(s)).select('_id').limit(1000).lean()).forEach(t=>ids.push(t._id));
  else if(s.item)ids.push(s.item);
 }
 return ids;
}
module.exports={scopeIds,M,MONTHS,person,strip,folderLabel,folderQuery,resolve};
