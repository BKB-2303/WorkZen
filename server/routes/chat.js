const r=require('express').Router();
const Message=require('../models/Message'),ChatRead=require('../models/ChatRead'),Team=require('../models/Team'),User=require('../models/User'),Share=require('../models/Share'),Task=require('../models/Task');
const {auth,userOnly}=require('../middleware/auth');
const {incoming,normFolder,keys,resolveThread,isId}=require('../utils/access');
const {M,folderLabel,folderQuery}=require('../utils/shareResolve');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(e.code>=400&&e.code<600?e.code:400).json({message:e.message||'Bad request'}));
const bad=(m,code=400)=>Object.assign(new Error(m),{code});
const ref=req=>({...(req.query||{}),...(req.body||{})});            // conversation reference sent by the client
const out=(d,me)=>({id:d._id,text:d.deleted?'':d.text,deleted:!!d.deleted,at:d.createdAt,editedAt:d.editedAt||null,
 sender:d.sender&&d.sender._id?{id:d.sender._id,name:d.sender.name||d.sender.username,username:d.sender.username}:{id:null,name:'Deleted user',username:''},
 you:!!d.sender&&String(d.sender._id||d.sender)===String(me),replyTo:d.replyTo&&d.replyTo.id?{id:d.replyTo.id,name:d.replyTo.name,text:d.replyTo.text}:null});
const info=t=>({key:t.key,type:t.scope,title:t.title,sub:t.sub,canModerate:t.canModerate,other:t.other||null});
const touch=(me,thread,at=new Date())=>ChatRead.updateOne({user:me,thread},{$set:{at}},{upsert:true}).catch(()=>{});

// ---------- conversations (list, unread) ----------
// Everything shared (by me or with me) that can have its own chat
async function itemEntries(me){
 const inc=await Share.find(await incoming(me)).lean();
 const mine=await Share.find({from:me}).lean();
 const ent=new Map(),want={task:new Set(),note:new Set(),bookmark:new Set()};
 for(const s of [...inc,...mine]){
  if(s.kind==='folder'){
   const f=normFolder(s.folder),key=keys.folder(s.from,f);
   if(!ent.has(key))ent.set(key,{key,type:'folder',title:folderLabel(f),owner:String(s.from),ref:{type:'folder',owner:String(s.from),year:f.year,month:f.month,project:f.project}});
   (await Task.find(folderQuery(s)).select('_id').limit(300).lean()).forEach(t=>want.task.add(String(t._id)));
  }else if(s.item&&want[s.kind])want[s.kind].add(String(s.item));
 }
 for(const k of Object.keys(want)){
  if(!want[k].size)continue;
  const docs=await M[k].find({_id:{$in:[...want[k]]}}).select('title user').lean();
  for(const d of docs){const key=keys.item(d._id);if(!ent.has(key))ent.set(key,{key,type:'item',kind:k,title:d.title||'Untitled note',owner:String(d.user),ref:{type:'item',kind:k,item:String(d._id)}});}
 }
 return ent;
}
async function allEntries(me,want={teams:true,direct:true,items:true}){
 const ent=new Map();
 if(want.teams)for(const t of await Team.find({'members.user':me}).select('name members').lean())
  ent.set(keys.team(t._id),{key:keys.team(t._id),type:'team',title:t.name,sub:`${t.members.length} member${t.members.length>1?'s':''}`,ref:{type:'team',team:String(t._id)},always:true});
 if(want.direct){
  const dms=await Message.aggregate([{$match:{scope:'direct',pair:me}},{$group:{_id:'$thread',pair:{$first:'$pair'}}}]);
  const others=dms.map(d=>d.pair.find(p=>String(p)!==String(me))).filter(Boolean);
  const us=others.length?await User.find({_id:{$in:others},active:{$ne:false}}).select('name username').lean():[];
  const um=new Map(us.map(u=>[String(u._id),u]));
  for(const d of dms){const o=d.pair.find(p=>String(p)!==String(me)),u=o&&um.get(String(o));
   if(u)ent.set(d._id,{key:d._id,type:'direct',title:u.name||u.username,sub:'@'+u.username,ref:{type:'direct',user:String(u._id)}});}
 }
 if(want.items)for(const [k,v] of await itemEntries(me))ent.set(k,v);
 return ent;
}
// last message + unread count per conversation
async function stats(me,list){
 if(!list.length)return {last:new Map(),unread:new Map()};
 const [last,unread]=await Promise.all([
  Message.aggregate([{$match:{thread:{$in:list},deleted:false}},{$sort:{createdAt:-1}},{$group:{_id:'$thread',m:{$first:'$$ROOT'}}}]),
  Message.aggregate([{$match:{thread:{$in:list},sender:{$ne:me},deleted:false}},
   {$lookup:{from:'chatreads',let:{t:'$thread'},pipeline:[{$match:{$expr:{$and:[{$eq:['$thread','$$t']},{$eq:['$user',me]}]}}}],as:'r'}},
   {$match:{$expr:{$gt:['$createdAt',{$ifNull:[{$arrayElemAt:['$r.at',0]},new Date(0)]}]}}},
   {$group:{_id:'$thread',n:{$sum:1}}}])]);
 return {last:new Map(last.map(x=>[x._id,x.m])),unread:new Map(unread.map(x=>[x._id,x.n]))};
}

r.get('/threads',wrap(async(req,res)=>{
 const me=req.user._id,type=req.query.type||'all',needle=String(req.query.q||'').trim().toLowerCase();
 const ent=await allEntries(me,{teams:type==='all'||type==='team',direct:type==='all'||type==='direct',items:type==='all'||type==='item'});
 const st=await stats(me,[...ent.keys()]);
 let list=[...ent.values()].map(e=>({...e,last:st.last.get(e.key)||null,unread:st.unread.get(e.key)||0}))
  .filter(e=>e.always||e.last)
  .filter(e=>type==='all'||(type==='item'?(e.type==='item'||e.type==='folder'):e.type===type))
  .filter(e=>!needle||e.title.toLowerCase().includes(needle));
 list.sort((a,b)=>(b.unread>0)-(a.unread>0)||(b.last?+new Date(b.last.createdAt):0)-(a.last?+new Date(a.last.createdAt):0)||a.title.localeCompare(b.title));
 const limit=Math.min(Math.max(parseInt(req.query.limit,10)||15,5),50),total=list.length,pages=Math.max(1,Math.ceil(total/limit));
 const page=Math.min(Math.max(parseInt(req.query.page,10)||1,1),pages);
 list=list.slice((page-1)*limit,page*limit);
 const ids=[...new Set([...list.map(e=>e.owner),...list.map(e=>e.last&&String(e.last.sender))].filter(Boolean))];
 const um=new Map((await User.find({_id:{$in:ids}}).select('name username').lean()).map(u=>[String(u._id),u.name||u.username]));
 const totalUnread=[...ent.keys()].reduce((n,k)=>n+(st.unread.get(k)||0),0);
 res.json({threads:list.map(e=>({key:e.key,type:e.type,kind:e.kind||null,title:e.title,
  sub:e.type==='item'||e.type==='folder'?`${e.type==='folder'?'Folder':e.kind[0].toUpperCase()+e.kind.slice(1)}${String(e.owner)===String(me)?' · yours':' · shared by '+(um.get(e.owner)||'?')}`:e.sub,
  ref:e.ref,unread:e.unread,
  last:e.last?{text:e.last.text.slice(0,120),at:e.last.createdAt,by:String(e.last.sender)===String(me)?'You':um.get(String(e.last.sender))||'Someone'}:null})),
  total,page,pages,limit,unread:totalUnread});
}));

r.get('/unread',wrap(async(req,res)=>{
 const me=req.user._id,ent=await allEntries(me),st=await stats(me,[...ent.keys()]);
 res.json({total:[...ent.keys()].reduce((n,k)=>n+(st.unread.get(k)||0),0)});
}));

// ---------- messages ----------
// Latest page (default), older page (before=<id>), or everything new/edited since a moment (since=<ISO time>)
r.get('/messages',wrap(async(req,res)=>{
 const me=req.user._id,t=await resolveThread(me,ref(req)),q=req.query;
 const limit=Math.min(Math.max(parseInt(q.limit,10)||30,5),100),now=new Date();
 const cond={thread:t.key};
 let rows,hasMore=false;
 if(q.since){
  const d=new Date(q.since);if(isNaN(d))throw bad('Bad time');
  rows=await Message.find({...cond,updatedAt:{$gt:d}}).sort({createdAt:1}).limit(200).populate('sender','name username').lean();
 }else{
  const text=String(q.q||'').trim().slice(0,80);
  if(text)cond.text=new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),cond.deleted=false;
  if(isId(q.before))cond._id={$lt:q.before};
  rows=await Message.find(cond).sort({_id:-1}).limit(limit+1).populate('sender','name username').lean();
  hasMore=rows.length>limit;rows=rows.slice(0,limit).reverse();
 }
 if(!q.since&&!q.before&&!q.q)await touch(me,t.key,now);
 res.json({thread:info(t),messages:rows.map(d=>out(d,me)),hasMore,now});
}));

r.post('/messages',wrap(async(req,res)=>{
 const me=req.user._id,t=await resolveThread(me,ref(req));
 const text=String(req.body?.text||'').trim().slice(0,2000);
 if(!text)throw bad('Write a message first');
 const doc={thread:t.key,scope:t.scope,sender:me,text};
 if(t.team)doc.team=t.team;if(t.owner)doc.owner=t.owner;if(t.pair)doc.pair=t.pair;
 if(isId(req.body?.replyTo)){
  const p=await Message.findOne({_id:req.body.replyTo,thread:t.key}).populate('sender','name username').lean();
  if(p)doc.replyTo={id:p._id,name:p.sender?(p.sender.name||p.sender.username):'Deleted user',text:p.deleted?'Message deleted':p.text.slice(0,140)};
 }
 const m=await Message.create(doc);
 await touch(me,t.key,new Date(Date.now()+1));
 res.status(201).json(out({...m.toObject(),sender:{_id:me,name:req.user.name,username:req.user.username}},me));
}));

r.put('/messages/:id',wrap(async(req,res)=>{
 const me=req.user._id,text=String(req.body?.text||'').trim().slice(0,2000);
 if(!text)throw bad('Message cannot be empty');
 const m=await Message.findOneAndUpdate({_id:req.params.id,sender:me,deleted:false},{$set:{text,editedAt:new Date()}},{new:true}).populate('sender','name username').lean();
 if(!m)throw bad('You can only edit your own messages',404);
 res.json(out(m,me));
}));

r.delete('/messages/:id',wrap(async(req,res)=>{
 const me=req.user._id,m=await Message.findById(req.params.id);
 if(!m||m.deleted)throw bad('Message not found',404);
 let ok=String(m.sender)===String(me);
 if(!ok&&m.scope==='team'){const t=await Team.findOne({_id:m.team,'members.user':me}).lean();ok=!!t&&(String(t.owner)===String(me)||t.members.find(x=>String(x.user)===String(me))?.role==='admin');}
 if(!ok&&(m.scope==='item'||m.scope==='folder'))ok=!!m.owner&&String(m.owner)===String(me);
 if(!ok)throw bad('You cannot delete this message',403);
 m.deleted=true;m.text='';await m.save();
 res.json({ok:true,id:m._id});
}));

r.post('/read',wrap(async(req,res)=>{
 const me=req.user._id,t=await resolveThread(me,ref(req));
 await touch(me,t.key);res.json({ok:true});
}));
module.exports=r;
