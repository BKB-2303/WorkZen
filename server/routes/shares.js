const r=require('express').Router();
const Share=require('../models/Share'),User=require('../models/User'),Team=require('../models/Team'),Task=require('../models/Task'),Note=require('../models/Note'),Bookmark=require('../models/Bookmark'),Activity=require('../models/Activity');
const {auth,userOnly}=require('../middleware/auth');
const P=require('../utils/pickers'),A=require('../utils/activity'),{paged}=require('../utils/paging'),Message=require('../models/Message');
const {M,person,folderLabel,folderQuery,resolve,scopeIds}=require('../utils/shareResolve');
const TaskProgress=require('../models/TaskProgress');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const myTeamIds=async uid=>(await Team.find({'members.user':uid}).select('_id').lean()).map(t=>t._id);
const live=()=>({$or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]});
// shares given TO me (directly or via a team) that have not expired
const visible=async uid=>({from:{$ne:uid},$and:[{$or:[{to:uid},{team:{$in:await myTeamIds(uid)}}]},live()]});
// shares I own, or was given
const anyAccess=async uid=>({$or:[{from:uid},{from:{$ne:uid},$and:[{$or:[{to:uid},{team:{$in:await myTeamIds(uid)}}]},live()]}]});
const expiry=d=>{d=parseInt(d,10);return d>0?new Date(Date.now()+Math.min(d,3650)*864e5):null;};
const normFolder=f=>{
 f=f||{};
 const year=/^\d{4}$/.test(String(f.year||''))?String(f.year):null;
 let month=f.month===null||f.month===undefined||f.month===''?null:parseInt(f.month,10);
 if(!year||!(month>=0&&month<=11))month=null;
 const project=f.project?String(f.project).trim().slice(0,60)||null:null;
 return {year,month,project};
};
// filter that identifies "the thing being shared" (+ _t title, _f folder for internal use)
const spec=async(src,me)=>{
 if(src.kind==='folder'){const f=normFolder(src.folder);return {kind:'folder','folder.year':f.year,'folder.month':f.month,'folder.project':f.project,_f:f,_t:folderLabel(f)};}
 if(!M[src.kind])throw new Error('Invalid item type');
 const it=await M[src.kind].findOne({_id:src.item,user:me}).select('_id title').lean();
 if(!it)return null;
 return {kind:src.kind,item:it._id,_t:it.title||'Untitled note'};
};
const strip$=({_f,_t,...q})=>q;
const rows=(l,me)=>l.map(a=>A.row(a,me));
const OWNER_ONLY=['shared','unshared','permission','copied'];

// people I can share with (other active normal users)
r.get('/users',wrap(async(req,res)=>{
 const us=await User.find({...require('../utils/people').normal(),_id:{$ne:req.user._id}}).select('name username lastSeen').sort({name:1,username:1}).limit(500).lean();
 res.json(us.map(person));
}));

// share an item or a folder with people and/or teams
r.post('/',wrap(async(req,res)=>{
 const me=req.user._id,{kind,itemId,folder,to,teams}=req.body||{};
 const perm=req.body?.perm==='edit'?'edit':'view',canCopy=!!req.body?.allowCopy,expiresAt=expiry(req.body?.expiresInDays);
 const sp=await spec({kind,item:itemId,folder},me);
 if(!sp)return res.status(404).json({message:'Item not found'});
 const uids=[...new Set((Array.isArray(to)?to:[]).map(String))].filter(x=>x!==String(me)).slice(0,100);
 const tids=[...new Set((Array.isArray(teams)?teams:[]).map(String))].slice(0,50);
 if(!uids.length&&!tids.length)throw new Error('Choose at least one person or team');
 const users=uids.length?await User.find({_id:{$in:uids},...require('../utils/people').normal()}).select('_id name username').lean():[];
 const ts=tids.length?await Team.find({_id:{$in:tids},'members.user':me}).select('_id name').lean():[];
 if(!users.length&&!ts.length)throw new Error('Those people or teams are not available');
 let added=0,updated=0;
 const f=strip$(sp);
 const targets=[...users.map(u=>({to:u._id,_n:u.name||u.username})),...ts.map(t=>({team:t._id,_n:'team '+t.name}))];
 for(const {_n,...t} of targets){
  const x=await Share.updateOne({from:me,...f,...t},{$set:{perm,canCopy,expiresAt}},{upsert:true});
  if(x.upsertedCount)added++;else updated++;
  await A.log({actor:me,owner:me,team:t.team,kind:sp.kind,item:sp.item,title:sp._t,action:x.upsertedCount?'shared':'permission',
   text:`${x.upsertedCount?'Shared with':'Updated access for'} ${_n} · ${perm==='edit'?'can edit':'view only'}${canCopy?' · can copy':''}${expiresAt?' · expires '+expiresAt.toISOString().slice(0,10):''}`});
 }
 res.status(201).json({shared:added,updated});
}));

// who already has access to one thing (query: kind, item | year, month, project)
r.get('/for',wrap(async(req,res)=>{
 const me=req.user._id,q=req.query;
 const sp=await spec({kind:q.kind,item:q.item,folder:{year:q.year,month:q.month,project:q.project}},me);
 if(!sp)return res.json([]);
 const l=await Share.find({from:me,...strip$(sp)}).populate('to','name username').populate('team','name').lean();
 res.json(l.filter(s=>s.to||s.team).map(s=>({id:s._id,perm:s.perm||'view',canCopy:!!s.canCopy,expiresAt:s.expiresAt||null,to:person(s.to),team:s.team?{id:s.team._id,name:s.team.name}:null})));
}));

// history of something I own (query like /for)
r.get('/history',wrap(async(req,res)=>{
 const me=req.user._id,q=req.query;
 const sp=await spec({kind:q.kind,item:q.item,folder:{year:q.year,month:q.month,project:q.project}},me);
 if(!sp)return res.json({rows:[],total:0,page:1,pages:1,limit:20,people:[]});
 let cond;
 if(sp.kind==='folder')cond={item:{$in:await scopeIds([{kind:'folder',from:me,folder:sp._f}])}};else cond={item:sp.item};
 res.json(await paged({owner:me,...cond},q,me));
}));

// recent activity that concerns me: edits of my things, and of things shared with me
r.get('/activity',wrap(async(req,res)=>{
 const me=req.user._id,tids=await myTeamIds(me);
 const vis=await Share.find(await visible(me)).lean();
 const ids=await scopeIds(vis);
 res.json(await paged({$or:[{owner:me},{item:{$in:ids},action:{$in:['edited','comment']}},{team:{$in:tids},action:'team'}]},req.query,me));
}));

// everything shared with me, directly or through my teams (live view of the owner's data)
r.get('/received',wrap(async(req,res)=>{
 const me=req.user._id;
 const l=await Share.find(await visible(me)).sort({createdAt:-1}).populate('from','name username active lastSeen').populate('team','name').lean();
 const all=await resolve(l,me),seen=new Map();
 for(const s of all){ // same thing shared twice (directly + via team): show once, keep the more generous access
  const key=[s.from.id,s.kind,s.item?s.item._id:s.label].join('|'),o=seen.get(key);
  if(!o)seen.set(key,s);else{
   const teamAccess=o.team?o:s.team?s:null;
   seen.set(key,{...o,perm:o.perm==='edit'||s.perm==='edit'?'edit':'view',canCopy:o.canCopy||s.canCopy,
    team:o.team||s.team||null,progressShareId:teamAccess?.id||o.progressShareId});
  }
 }
 res.json([...seen.values()]);
}));

// what I have shared with others
r.get('/sent',wrap(async(req,res)=>{
 const me=req.user._id;
 const l=await Share.find({from:me}).sort({createdAt:-1}).populate('to','name username').populate('team','name').lean();
 const out=[];
 for(const s of l){
  if(!s.to&&!s.team)continue;
  let title;
  if(s.kind==='folder')title=folderLabel(s.folder);
  else{const d=await M[s.kind].findOne({_id:s.item,user:me}).lean();if(!d)continue;title=d.title||'Untitled note';}
  out.push({id:s._id,kind:s.kind,item:s.item||null,folder:s.kind==='folder'?s.folder:null,perm:s.perm||'view',canCopy:!!s.canCopy,expiresAt:s.expiresAt||null,title,to:person(s.to),team:s.team?{id:s.team._id,name:s.team.name}:null,sharedAt:s.createdAt});
 }
 res.json(out);
}));

// owner changes permission / copy right / expiry
r.put('/:id',wrap(async(req,res)=>{
 const b=req.body||{},set={};
 if(b.perm!==undefined)set.perm=b.perm==='edit'?'edit':'view';
 if(b.canCopy!==undefined)set.canCopy=!!b.canCopy;
 if(b.expiresInDays!==undefined)set.expiresAt=expiry(b.expiresInDays);
 const s=await Share.findOneAndUpdate({_id:req.params.id,from:req.user._id},set,{new:true}).populate('to','name username').populate('team','name');
 if(!s)return res.status(404).json({message:'Not found'});
 const who=s.team?'team '+s.team.name:(s.to&&(s.to.name||s.to.username));
 await A.log({actor:req.user._id,owner:req.user._id,team:s.team&&s.team._id,kind:s.kind,item:s.item,title:s.kind==='folder'?folderLabel(s.folder):'',action:'permission',
  text:`Access for ${who}: ${s.perm==='edit'?'can edit':'view only'}${s.canCopy?' · can copy':''}${s.expiresAt?' · expires '+s.expiresAt.toISOString().slice(0,10):''}`});
 res.json({ok:true,perm:s.perm,canCopy:s.canCopy,expiresAt:s.expiresAt});
}));

// owner stops sharing, or a direct recipient removes it from their own list
r.delete('/:id',wrap(async(req,res)=>{
 const me=req.user._id;
 const s=await Share.findOneAndDelete({_id:req.params.id,$or:[{from:me},{to:me}]}).populate('to','name username').populate('team','name');
 if(!s)return res.status(404).json({message:'Not found'});
 const title=s.kind==='folder'?folderLabel(s.folder):((await M[s.kind].findById(s.item).select('title').lean())?.title||'');
 const who=s.team?'team '+s.team.name:(s.to&&(s.to.name||s.to.username));
 await A.log({actor:me,owner:s.from,team:s.team&&s.team._id,kind:s.kind,item:s.item,title,action:'unshared',text:String(s.from)===String(me)?`Stopped sharing with ${who}`:`${who} removed it from their list`});
 res.json({ok:true});
}));

const clone=(k,d,u)=>{
 if(k==='task')return Task.create({user:u,title:d.title,notes:d.notes,project:d.project,priority:d.priority,status:'todo',startDate:d.startDate||d.dueDate,dueDate:d.dueDate,checklist:(d.checklist||[]).map(x=>({text:x.text,done:false}))});
 if(k==='note')return Note.create({user:u,title:d.title,content:d.content,category:d.category,color:d.color});
 return Bookmark.create({user:u,title:d.title,url:d.url,description:d.description,category:d.category});
};
// recipient saves their own copy -- only if the owner allowed copying
r.post('/:id/copy',wrap(async(req,res)=>{
 const me=req.user._id;
 const s=await Share.findOne({_id:req.params.id,...await visible(me)}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 if(!s.canCopy)return res.status(403).json({message:'The owner did not allow copying this'});
 let made=[];
 if(s.kind==='folder'){
  const q=folderQuery(s);if(req.body?.itemId)q._id=req.body.itemId;
  const ts=await Task.find(q).limit(500).lean();
  if(!ts.length)return res.status(404).json({message:'Nothing to copy'});
  for(const t of ts)made.push(await clone('task',t,me));
 }else{
  const d=await M[s.kind].findOne({_id:s.item,user:s.from}).lean();
  if(!d)return res.status(404).json({message:'The original no longer exists'});
  made=[await clone(s.kind,d,me)];
 }
 await A.log({actor:me,owner:s.from,kind:s.kind==='folder'?'task':s.kind,item:s.item,title:s.kind==='folder'?folderLabel(s.folder):(made[0].title||''),action:'copied',text:`Saved ${made.length} cop${made.length>1?'ies':'y'}`});
 res.status(201).json({ok:true,kind:s.kind==='folder'?'task':s.kind,items:made});
}));

// recipient edits the owner's original (only when permission is "edit") -- logged in the history
r.put('/:id/item/:itemId',wrap(async(req,res)=>{
 const me=req.user._id;
 const s=await Share.findOne({_id:req.params.id,...await visible(me)}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 if(s.perm!=='edit')return res.status(403).json({message:'This was shared as view only'});
 let kind=s.kind;
 if(s.kind==='folder'){
  kind='task';
  if(!(await Task.exists({...folderQuery(s),_id:req.params.itemId})))return res.status(404).json({message:'Not found'});
 }else if(String(s.item)!==String(req.params.itemId))return res.status(404).json({message:'Not found'});
 const before=await M[kind].findOne({_id:req.params.itemId,user:s.from}).lean();
 if(kind==='task'){
  const body=req.body||{},start=body.startDate||before?.startDate||before?.dueDate,due=body.dueDate||before?.dueDate;
  if(start&&due&&start>due)throw new Error('Start date must be on or before the due date');
 }
 const doc=await M[kind].findOneAndUpdate({_id:req.params.itemId,user:s.from},P[kind](req.body||{}),{new:true,runValidators:true}).lean();
 if(!doc||!before)return res.status(404).json({message:'The original no longer exists'});
 const changes=A.diff(before,doc);
 if(changes.length)await A.log({actor:me,owner:s.from,team:s.team,kind,item:doc._id,title:doc.title||'Untitled note',action:'edited',changes});
 const {user,...rest}=doc;res.json(rest);
}));

const taskForProgress=async(s,itemId)=>{
 if(s.kind==='task'&&String(s.item)===String(itemId))return Task.findOne({_id:itemId,user:s.from}).lean();
 if(s.kind==='folder')return Task.findOne({...folderQuery(s),_id:itemId}).lean();
 return null;
};
const progressRow=p=>({user:p.user?{id:p.user._id,name:p.user.name||p.user.username,avatar:p.user.avatar||''}:null,
 status:p.status,checklist:p.checklist||[],completedAt:p.completedAt||null});

r.get('/:id/item/:itemId/progress',wrap(async(req,res)=>{
 const me=req.user._id,s=await Share.findOne({_id:req.params.id,...await anyAccess(me)}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 const task=await taskForProgress(s,req.params.itemId);if(!task)return res.status(404).json({message:'Not found'});
 let teamMembers=[];
 let memberIds=[me];
 if(s.team){
  const team=await Team.findOne({_id:s.team,'members.user':me}).populate('members.user','name username').lean();
  if(!team)return res.status(403).json({message:'You are no longer a member of this team'});
  teamMembers=team.members.map(m=>m.user).filter(Boolean);
  memberIds=teamMembers.map(u=>u._id);
 }
 const rows=await TaskProgress.find({task:task._id,user:{$in:memberIds}}).populate('user','name username').lean();
 const mine=rows.find(p=>String(p.user._id)===String(me));
 const byUser=new Map(rows.map(p=>[String(p.user._id),p]));
 const members=teamMembers.length?teamMembers.map(u=>progressRow(byUser.get(String(u._id))||{
  user:u,status:'todo',checklist:(task.checklist||[]).map(()=>false),completedAt:null
 })):rows.map(progressRow);
 res.json({mine:mine?progressRow(mine):{user:{id:me},status:'todo',checklist:(task.checklist||[]).map(()=>false),completedAt:null},
  members});
}));

r.put('/:id/item/:itemId/progress',wrap(async(req,res)=>{
 const me=req.user._id,s=await Share.findOne({_id:req.params.id,...await anyAccess(me)}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 const task=await taskForProgress(s,req.params.itemId);if(!task)return res.status(404).json({message:'Not found'});
 const status=['todo','inprogress','done'].includes(req.body?.status)?req.body.status:null;
 if(!status)throw new Error('Choose a valid completion status');
 const previous=await TaskProgress.findOne({task:task._id,user:me}).select('checklist').lean();
 const checklist=Array.isArray(req.body?.checklist)
  ?(task.checklist||[]).map((_,i)=>!!req.body.checklist[i])
  :previous?.checklist|| (task.checklist||[]).map(()=>false);
 const row=await TaskProgress.findOneAndUpdate({task:task._id,user:me},
  {$set:{status,checklist,completedAt:status==='done'?new Date():null}},
  {new:true,upsert:true,setDefaultsOnInsert:true,runValidators:true}).populate('user','name username').lean();
 res.json(progressRow(row));
}));

// history + comments for one shared thing (owner or anyone it is shared with)
const scopeFor=async(s,itemId)=>{
 if(s.kind==='folder'){
  if(itemId){if(!(await Task.exists({...folderQuery(s),_id:itemId})))return null;return {item:itemId};}
  return {item:{$in:await scopeIds([s])}};
 }
 return {item:s.item};
};
r.get('/:id/history',wrap(async(req,res)=>{
 const me=req.user._id;
 const s=await Share.findOne({_id:req.params.id,...await anyAccess(me)}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 const cond=await scopeFor(s,req.query.itemId);if(!cond)return res.status(404).json({message:'Not found'});
 const owner=String(s.from)===String(me);
 res.json(await paged({owner:s.from,...cond,...(owner?{}:{action:{$nin:OWNER_ONLY}})},req.query,me));
}));
module.exports=r;
