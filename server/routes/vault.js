const r=require('express').Router();const jwt=require('jsonwebtoken');const bcrypt=require('bcryptjs');
const VaultItem=require('../models/VaultItem');const {auth,userOnly}=require('../middleware/auth');
const {encrypt,decrypt}=require('../utils/vaultCrypto');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(()=>res.status(400).json({message:'Bad request'}));
const sign=id=>jwt.sign({id:String(id),vault:true},process.env.JWT_SECRET,{expiresIn:'10m'});
const vaultAuth=(req,res,next)=>{
 try{const p=jwt.verify(req.headers['x-vault-token']||'',process.env.JWT_SECRET);
  if(!p.vault||p.id!==String(req.user._id))throw new Error('x');
  res.set('X-Vault-Token',sign(req.user._id));next();
 }catch(e){res.status(423).json({message:'Vault is locked'});}
};
// brute-force protection for unlock
const fails=new Map();
r.post('/unlock',wrap(async(req,res)=>{
 const k=String(req.user._id),f=fails.get(k)||{n:0,until:0};
 if(f.until>Date.now())return res.status(429).json({message:`Too many attempts. Try again in ${Math.ceil((f.until-Date.now())/1000)}s`});
 if(!(await bcrypt.compare(String(req.body?.password||''),req.user.password))){
  f.n++;if(f.n>=5){f.until=Date.now()+60000;f.n=0;}fails.set(k,f);
  return res.status(400).json({message:'Incorrect password'});
 }
 fails.delete(k);res.json({token:sign(req.user._id)});
}));
const s=(v,n)=>String(v??'').slice(0,n);
const clean=(type,d={})=>({title:s(d.title,120).trim(),url:s(d.url,500).trim(),username:s(d.username,200),password:s(d.password,500),notes:s(d.notes,2000),category:s(d.category,40).trim()||'General',favorite:!!d.favorite});
const out=(doc,uid)=>({id:doc._id,type:doc.type,createdAt:doc.createdAt,updatedAt:doc.updatedAt,...decrypt(doc.blob,uid)});
r.get('/items',vaultAuth,wrap(async(req,res)=>{
 const docs=await VaultItem.find({user:req.user._id,type:'password'}).sort({updatedAt:-1}).lean();
 const items=[];for(const d of docs){try{items.push(out(d,req.user._id));}catch(e){/* unreadable (key changed) */}}
 res.json(items);
}));
r.post('/items',vaultAuth,wrap(async(req,res)=>{
 const type=req.body?.type;if(type!=='password')return res.status(400).json({message:'Invalid type'});
 const data=clean(type,req.body.data);if(!data.title)return res.status(400).json({message:'Title is required'});
 const doc=await VaultItem.create({user:req.user._id,type,blob:encrypt(data,req.user._id)});
 res.status(201).json(out(doc,req.user._id));
}));
r.put('/items/:id',vaultAuth,wrap(async(req,res)=>{
 const doc=await VaultItem.findOne({_id:req.params.id,user:req.user._id,type:'password'});if(!doc)return res.status(404).json({message:'Not found'});
 const data=clean(doc.type,req.body?.data);if(!data.title)return res.status(400).json({message:'Title is required'});
 doc.blob=encrypt(data,req.user._id);await doc.save();res.json(out(doc,req.user._id));
}));
r.delete('/items/:id',vaultAuth,wrap(async(req,res)=>{
 const d=await VaultItem.findOneAndDelete({_id:req.params.id,user:req.user._id,type:'password'});
 if(!d)return res.status(404).json({message:'Not found'});res.json({ok:true});
}));
module.exports=r;
