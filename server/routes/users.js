const r=require('express').Router();const bcrypt=require('bcryptjs');
const User=require('../models/User');const Task=require('../models/Task');const VaultItem=require('../models/VaultItem');const Note=require('../models/Note');const Bookmark=require('../models/Bookmark');
const {auth,adminOnly}=require('../middleware/auth');
r.use(auth,adminOnly);
const view=(u,tasks=0)=>({id:u._id,name:u.name||u.username,username:u.username,role:u.role,active:u.active!==false,tasks,createdAt:u.createdAt,lastLogin:u.lastLogin||null});
const lastAdmin=async u=>u.role==='admin'&&(await User.countDocuments({role:'admin',active:{$ne:false}}))<=1;
r.get('/',async(req,res)=>{
 const [us,counts]=await Promise.all([User.find().sort({createdAt:1}).lean(),Task.aggregate([{$group:{_id:'$user',n:{$sum:1}}}])]);
 const map=Object.fromEntries(counts.map(c=>[String(c._id),c.n]));
 res.json(us.map(u=>view(u,map[String(u._id)]||0)));
});
r.post('/',async(req,res)=>{
 const {name,username,password,role}=req.body||{};
 if(!username||!String(username).trim())return res.status(400).json({message:'Username is required'});
 if(!password||password.length<6)return res.status(400).json({message:'Password must be at least 6 characters'});
 if(await User.findOne({username:String(username).trim()}))return res.status(400).json({message:'Username already exists'});
 const u=await User.create({name:name||username,username:String(username).trim(),password:await bcrypt.hash(password,10),role:role==='admin'?'admin':'user'});
 res.status(201).json(view(u));
});
r.put('/:id',async(req,res)=>{
 const u=await User.findById(req.params.id);if(!u)return res.status(404).json({message:'Not found'});
 const {name,role,active}=req.body||{};
 const self=String(u._id)===String(req.user._id);
 if((active===false||(role&&role!==u.role))&&self)return res.status(400).json({message:'You cannot change your own role or status'});
 if((active===false||role==='user')&&await lastAdmin(u))return res.status(400).json({message:'Cannot remove the last active admin'});
 if(name!==undefined)u.name=name;if(role)u.role=role==='admin'?'admin':'user';if(active!==undefined)u.active=!!active;
 await u.save();res.json(view(u));
});
r.put('/:id/password',async(req,res)=>{
 const {password}=req.body||{};
 if(!password||password.length<6)return res.status(400).json({message:'Password must be at least 6 characters'});
 const u=await User.findByIdAndUpdate(req.params.id,{password:await bcrypt.hash(password,10)});
 if(!u)return res.status(404).json({message:'Not found'});res.json({ok:true});
});
r.delete('/:id',async(req,res)=>{
 const u=await User.findById(req.params.id);if(!u)return res.status(404).json({message:'Not found'});
 if(String(u._id)===String(req.user._id))return res.status(400).json({message:'You cannot delete yourself'});
 if(await lastAdmin(u))return res.status(400).json({message:'Cannot delete the last admin'});
 await Task.deleteMany({user:u._id});await VaultItem.deleteMany({user:u._id});await Note.deleteMany({user:u._id});await Bookmark.deleteMany({user:u._id});await u.deleteOne();res.json({ok:true});
});
module.exports=r;
