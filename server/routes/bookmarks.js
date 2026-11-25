const r=require('express').Router();const Bookmark=require('../models/Bookmark');
const {auth,userOnly}=require('../middleware/auth');
r.use(auth,userOnly);
const logOwn=require('../utils/logOwn');
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const norm=u=>{u=String(u||'').trim();if(!u)return null;if(!/^https?:\/\//i.test(u))u='https://'+u;try{new URL(u);return u;}catch(e){return null;}};
const pick=(b={})=>{
 const o={};
 if(b.url!==undefined){const u=norm(b.url);if(!u)throw new Error('Enter a valid website address');o.url=u;}
 if(b.title!==undefined)o.title=String(b.title).trim().slice(0,120);
 if(b.description!==undefined)o.description=String(b.description).slice(0,300);
 if(b.category!==undefined)o.category=String(b.category).trim().slice(0,40)||'General';
 if(b.favorite!==undefined)o.favorite=!!b.favorite;
 return o;
};
r.get('/',wrap(async(req,res)=>res.json(await Bookmark.find({user:req.user._id}).sort({createdAt:-1}).lean())));
r.post('/',wrap(async(req,res)=>{
 const o=pick(req.body);if(!o.url)throw new Error('Website address is required');
 if(!o.title)o.title=new URL(o.url).hostname.replace(/^www\./,'');
 res.status(201).json(await Bookmark.create({...o,user:req.user._id}));
}));
r.put('/:id',wrap(async(req,res)=>{
 const before=await Bookmark.findOne({_id:req.params.id,user:req.user._id}).lean();const t=await Bookmark.findOneAndUpdate({_id:req.params.id,user:req.user._id},pick(req.body),{new:true,runValidators:true}).lean();
 if(!t)return res.status(404).json({message:'Not found'});await logOwn(req,'bookmark',before,t);res.json(t);
}));
r.post('/:id/visit',wrap(async(req,res)=>{
 const t=await Bookmark.findOneAndUpdate({_id:req.params.id,user:req.user._id},{$inc:{visits:1},lastVisited:new Date()},{new:true}).lean();
 if(!t)return res.status(404).json({message:'Not found'});res.json(t);
}));
r.delete('/:id',wrap(async(req,res)=>{
 const t=await Bookmark.findOneAndDelete({_id:req.params.id,user:req.user._id});
 if(!t)return res.status(404).json({message:'Not found'});await require('../models/Share').deleteMany({item:t._id});await require('../models/Message').deleteMany({thread:'item:'+t._id});res.json({ok:true});
}));
module.exports=r;
