const r=require('express').Router();const Note=require('../models/Note');
const {auth,userOnly}=require('../middleware/auth');
r.use(auth,userOnly);
const logOwn=require('../utils/logOwn');
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const COLORS=['default','yellow','green','blue','pink','purple'];
const pick=(b={})=>{
 const o={};
 if(b.title!==undefined)o.title=String(b.title).trim().slice(0,120);
 if(b.content!==undefined)o.content=String(b.content).slice(0,20000);
 if(b.category!==undefined)o.category=String(b.category).trim().slice(0,40)||'General';
 if(b.color!==undefined)o.color=COLORS.includes(b.color)?b.color:'default';
 if(b.pinned!==undefined)o.pinned=!!b.pinned;
 return o;
};
r.get('/',wrap(async(req,res)=>res.json(await Note.find({user:req.user._id}).sort({pinned:-1,updatedAt:-1}).lean())));
r.post('/',wrap(async(req,res)=>{
 const o=pick(req.body);
 if(!o.title&&!(o.content||'').trim())throw new Error('Write a title or some text');
 res.status(201).json(await Note.create({...o,user:req.user._id}));
}));
r.put('/:id',wrap(async(req,res)=>{
 const before=await Note.findOne({_id:req.params.id,user:req.user._id}).lean();const t=await Note.findOneAndUpdate({_id:req.params.id,user:req.user._id},pick(req.body),{new:true,runValidators:true}).lean();
 if(!t)return res.status(404).json({message:'Not found'});await logOwn(req,'note',before,t);res.json(t);
}));
r.delete('/:id',wrap(async(req,res)=>{
 const t=await Note.findOneAndDelete({_id:req.params.id,user:req.user._id});
 if(!t)return res.status(404).json({message:'Not found'});await require('../models/Share').deleteMany({item:t._id});await require('../models/Message').deleteMany({thread:'item:'+t._id});res.json({ok:true});
}));
module.exports=r;
