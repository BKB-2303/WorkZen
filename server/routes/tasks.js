const r=require('express').Router();const Task=require('../models/Task');
const {auth,userOnly}=require('../middleware/auth');
r.use(auth,userOnly);
const logOwn=require('../utils/logOwn');
const pick=b=>{
 const o={};for(const k of ['title','notes','project','priority','status','startDate','dueDate'])if(b[k]!==undefined)o[k]=b[k];
 if(o.project==='')o.project='General';
 if(o.startDate&&o.dueDate&&o.startDate>o.dueDate)throw new Error('Start date must be on or before the due date');
 if(Array.isArray(b.checklist))o.checklist=b.checklist.slice(0,50).map(c=>({text:String(c.text||'').slice(0,200),done:!!c.done})).filter(c=>c.text.trim());
 if(o.status!==undefined)o.completedAt=o.status==='done'?new Date():null;
 return o;
};
r.get('/',async(req,res)=>res.json(await Task.find({user:req.user._id}).sort({dueDate:-1,createdAt:-1}).lean()));
r.post('/',async(req,res)=>{try{const data=pick(req.body);if(!data.startDate)data.startDate=data.dueDate;res.status(201).json(await Task.create({...data,user:req.user._id}));}catch(e){res.status(400).json({message:e.message});}});
r.put('/:id',async(req,res)=>{
 try{const before=await Task.findOne({_id:req.params.id,user:req.user._id}).lean();if(!before)return res.status(404).json({message:'Not found'});
  const data=pick(req.body),start=data.startDate||before.startDate||before.dueDate,due=data.dueDate||before.dueDate;
  if(start>due)throw new Error('Start date must be on or before the due date');
  const t=await Task.findOneAndUpdate({_id:req.params.id,user:req.user._id},data,{new:true,runValidators:true}).lean();
  await logOwn(req,'task',before,t);res.json(t);}catch(e){res.status(400).json({message:e.message});}
});
r.delete('/:id',async(req,res)=>{
 const t=await Task.findOneAndDelete({_id:req.params.id,user:req.user._id});
 if(!t)return res.status(404).json({message:'Not found'});await require('../models/Share').deleteMany({item:t._id});await require('../models/Message').deleteMany({thread:'item:'+t._id});await require('../models/TaskProgress').deleteMany({task:t._id});res.json({ok:true});
});
module.exports=r;
