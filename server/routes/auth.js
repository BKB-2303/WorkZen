const r=require('express').Router();const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const User=require('../models/User');const {auth}=require('../middleware/auth');
const pub=u=>({id:u._id,name:u.name||u.username,username:u.username,role:u.role});
r.post('/login',async(req,res)=>{
 const {username,password}=req.body||{};
 const u=await User.findOne({username:String(username||'').trim()});
 if(!u||!(await bcrypt.compare(String(password||''),u.password)))return res.status(400).json({message:'Invalid username or password'});
 if(u.active===false)return res.status(403).json({message:'Account is disabled. Contact admin.'});
 await User.updateOne({_id:u._id},{lastLogin:new Date()});
 res.json({token:jwt.sign({id:u._id},process.env.JWT_SECRET,{expiresIn:'7d'}),user:pub(u)});
});
r.get('/me',auth,(req,res)=>res.json(pub(req.user)));
r.put('/password',auth,async(req,res)=>{
 const {current,password}=req.body||{};
 if(!password||password.length<6)return res.status(400).json({message:'New password must be at least 6 characters'});
 if(!(await bcrypt.compare(String(current||''),req.user.password)))return res.status(400).json({message:'Current password is wrong'});
 req.user.password=await bcrypt.hash(password,10);await req.user.save();res.json({ok:true});
});
module.exports=r;
