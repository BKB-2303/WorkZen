const r=require('express').Router();
const Share=require('../models/Share'),User=require('../models/User'),Task=require('../models/Task'),Note=require('../models/Note'),Bookmark=require('../models/Bookmark');
const {auth,userOnly}=require('../middleware/auth');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const M={task:Task,note:Note,bookmark:Bookmark};
const label=(k,d)=>k==='task'?d.title:(d.title||'Untitled note');
const person=u=>u?{id:u._id,name:u.name||u.username,username:u.username}:null;

// people I can share with (other active normal users)
r.get('/users',wrap(async(req,res)=>{
 const us=await User.find({role:'user',active:{$ne:false},_id:{$ne:req.user._id}}).sort({name:1,username:1}).limit(500).lean();
 res.json(us.map(person));
}));

// share one of my items with one or more users
r.post('/',wrap(async(req,res)=>{
 const {kind,itemId,to}=req.body||{};
 if(!M[kind])throw new Error('Invalid item type');
 const item=await M[kind].findOne({_id:itemId,user:req.user._id}).lean();
 if(!item)return res.status(404).json({message:'Item not found'});
 const ids=[...new Set((Array.isArray(to)?to:[]).map(String))].filter(x=>x!==String(req.user._id)).slice(0,100);
 if(!ids.length)throw new Error('Choose at least one person');
 const valid=await User.find({_id:{$in:ids},role:'user',active:{$ne:false}}).select('_id').lean();
 let n=0;
 for(const u of valid){
  const x=await Share.updateOne({from:req.user._id,to:u._id,kind,item:item._id},{$setOnInsert:{from:req.user._id,to:u._id,kind,item:item._id}},{upsert:true});
  if(x.upsertedCount)n++;
 }
 res.status(201).json({shared:n,total:valid.length});
}));

// who currently has access to one of my items
r.get('/item/:kind/:id',wrap(async(req,res)=>{
 if(!M[req.params.kind])throw new Error('Invalid item type');
 const l=await Share.find({from:req.user._id,kind:req.params.kind,item:req.params.id}).populate('to','name username').lean();
 res.json(l.filter(s=>s.to).map(s=>({id:s._id,to:person(s.to)})));
}));

// everything shared with me (live view of the owner's items)
r.get('/received',wrap(async(req,res)=>{
 const l=await Share.find({to:req.user._id}).sort({createdAt:-1}).populate('from','name username active').lean();
 const out=[],dead=[];
 for(const s of l){
  const d=s.from&&await M[s.kind].findOne({_id:s.item,user:s.from._id}).lean();
  if(!d||s.from.active===false){if(!d)dead.push(s._id);continue;}
  const {user,...item}=d;
  out.push({id:s._id,kind:s.kind,from:person(s.from),sharedAt:s.createdAt,item});
 }
 if(dead.length)Share.deleteMany({_id:{$in:dead}}).catch(()=>{});
 res.json(out);
}));

// what I have shared with others
r.get('/sent',wrap(async(req,res)=>{
 const l=await Share.find({from:req.user._id}).sort({createdAt:-1}).populate('to','name username').lean();
 const out=[];
 for(const s of l){
  if(!s.to)continue;
  const d=await M[s.kind].findOne({_id:s.item,user:req.user._id}).lean();
  if(!d)continue;
  out.push({id:s._id,kind:s.kind,to:person(s.to),title:label(s.kind,d),sharedAt:s.createdAt});
 }
 res.json(out);
}));

// stop sharing (owner) or remove from my list (recipient)
r.delete('/:id',wrap(async(req,res)=>{
 const s=await Share.findOneAndDelete({_id:req.params.id,$or:[{from:req.user._id},{to:req.user._id}]});
 if(!s)return res.status(404).json({message:'Not found'});res.json({ok:true});
}));

// recipient saves their own editable copy
r.post('/:id/copy',wrap(async(req,res)=>{
 const s=await Share.findOne({_id:req.params.id,to:req.user._id}).lean();
 if(!s)return res.status(404).json({message:'Not found'});
 const d=await M[s.kind].findOne({_id:s.item,user:s.from}).lean();
 if(!d)return res.status(404).json({message:'The original no longer exists'});
 const u=req.user._id;let c;
 if(s.kind==='task')c=await Task.create({user:u,title:d.title,notes:d.notes,project:d.project,priority:d.priority,status:'todo',dueDate:d.dueDate,checklist:(d.checklist||[]).map(x=>({text:x.text,done:false}))});
 else if(s.kind==='note')c=await Note.create({user:u,title:d.title,content:d.content,category:d.category,color:d.color});
 else c=await Bookmark.create({user:u,title:d.title,url:d.url,description:d.description,category:d.category});
 res.status(201).json({ok:true,kind:s.kind,item:c});
}));
module.exports=r;
