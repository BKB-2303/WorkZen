const r=require('express').Router();const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const User=require('../models/User');const {auth}=require('../middleware/auth');
const pub=u=>({id:u._id,name:u.name||u.username,username:u.username,role:u.role,avatar:u.avatar||''});
r.post('/login',async(req,res)=>{
 const {username,password}=req.body||{};
 const u=await User.findOne(require('../utils/people').byUsername(username));
 if(!u||!(await bcrypt.compare(String(password||''),u.password)))return res.status(400).json({message:'Invalid username or password'});
 if(u.active===false)return res.status(403).json({message:'Account is disabled. Contact admin.'});
 await User.updateOne({_id:u._id},{lastLogin:new Date(),lastSeen:new Date()});
 res.json({token:jwt.sign({id:u._id},process.env.JWT_SECRET,{expiresIn:'7d'}),user:pub(u)});
});
r.get('/me',auth,(req,res)=>res.json(pub(req.user)));
r.post('/presence',auth,async(req,res)=>{await User.updateOne({_id:req.user._id},{$set:{lastSeen:new Date()}});res.json({ok:true});});
r.put('/profile',auth,async(req,res)=>{
 const name=String(req.body?.name||'').trim().slice(0,80);
 const avatar=String(req.body?.avatar||'');
 if(!name)return res.status(400).json({message:'Name is required'});
 if(avatar&&(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar)||avatar.length>200000))
  return res.status(400).json({message:'Choose a PNG, JPEG or WebP profile image smaller than 150 KB'});
 req.user.name=name;req.user.avatar=avatar;await req.user.save();res.json(pub(req.user));
});
r.put('/password',auth,async(req,res)=>{
 const {current,password}=req.body||{};
 if(!password||password.length<6)return res.status(400).json({message:'New password must be at least 6 characters'});
 if(!(await bcrypt.compare(String(current||''),req.user.password)))return res.status(400).json({message:'Current password is wrong'});
 req.user.password=await bcrypt.hash(password,10);await req.user.save();res.json({ok:true});
});
module.exports=r;
