const jwt=require('jsonwebtoken');const User=require('../models/User');
exports.auth=async(req,res,next)=>{
 try{const t=(req.headers.authorization||'').replace('Bearer ','');
  const {id}=jwt.verify(t,process.env.JWT_SECRET);
  const u=await User.findById(id);
  if(!u||u.active===false)return res.status(401).json({message:'Session expired'});
  req.user=u;next();
 }catch(e){res.status(401).json({message:'Unauthorized'});}
};
exports.adminOnly=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({message:'Admin only'});
exports.userOnly=(req,res,next)=>req.user.role==='user'?next():res.status(403).json({message:'Admins manage users only'});
