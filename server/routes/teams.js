const r=require('express').Router();
const Team=require('../models/Team'),User=require('../models/User'),Share=require('../models/Share');
const {auth,userOnly}=require('../middleware/auth');
const {person,resolve,scopeIds}=require('../utils/shareResolve');const A=require('../utils/activity'),Activity=require('../models/Activity'),Message=require('../models/Message'),{paged}=require('../utils/paging');
const tlog=(me,t,text)=>A.log({actor:me,team:t._id||t,action:'team',text});
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(400).json({message:e.message||'Bad request'}));
const same=(a,b)=>String(a)===String(b);
const role=(t,uid)=>t.members.find(m=>same(m.user._id||m.user,uid))?.role||null;
const isOwner=(t,uid)=>same(t.owner,uid);
const canManage=(t,uid)=>isOwner(t,uid)||role(t,uid)==='admin';
const load=async(id,me)=>{const t=await Team.findOne({_id:id,'members.user':me});if(!t)throw Object.assign(new Error('Team not found'),{code:404});return t;};
const guard=fn=>wrap(async(req,res,next)=>{try{await fn(req,res,next);}catch(e){if(e.code===404)return res.status(404).json({message:e.message});throw e;}});
const validUsers=async ids=>ids.length?(await User.find({_id:{$in:ids},role:'user',active:{$ne:false}}).select('_id').lean()).map(u=>u._id):[];
const ids=a=>[...new Set((Array.isArray(a)?a:[]).map(String))].slice(0,100);

const view=async(teams,me)=>{
 const full=await Team.populate(teams,{path:'members.user',select:'name username active'});
 const counts=await Share.aggregate([{$match:{team:{$in:full.map(t=>t._id)}}},{$group:{_id:'$team',n:{$sum:1}}}]);
 const cm=Object.fromEntries(counts.map(c=>[String(c._id),c.n]));
 return full.map(t=>({
  id:t._id,name:t.name,description:t.description,owner:String(t.owner),createdAt:t.createdAt,
  myRole:isOwner(t,me)?'owner':role(t,me)||'member',sharedCount:cm[String(t._id)]||0,
  members:t.members.filter(m=>m.user).map(m=>({...person(m.user),role:isOwner(t,m.user._id)?'owner':m.role,active:m.user.active!==false}))
   .sort((a,b)=>(b.role==='owner')-(a.role==='owner')||(b.role==='admin')-(a.role==='admin')||a.name.localeCompare(b.name))
 }));
};

r.get('/',wrap(async(req,res)=>{
 const ts=await Team.find({'members.user':req.user._id}).sort({name:1});
 res.json(await view(ts,req.user._id));
}));

r.post('/',wrap(async(req,res)=>{
 const me=req.user._id,{name,description,members}=req.body||{};
 if(!String(name||'').trim())throw new Error('Team name is required');
 const others=(await validUsers(ids(members))).filter(u=>!same(u,me));
 const t=await Team.create({name:String(name).trim().slice(0,60),description:String(description||'').slice(0,300),owner:me,
  members:[{user:me,role:'admin'},...others.map(u=>({user:u,role:'member'}))]});
 await tlog(me,t,`Created the team “${t.name}” with ${t.members.length} member${t.members.length>1?'s':''}`);
 res.status(201).json((await view([t],me))[0]);
}));

r.put('/:id',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 if(!canManage(t,req.user._id))return res.status(403).json({message:'Only team admins can edit the team'});
 const {name,description}=req.body||{};
 if(name!==undefined){if(!String(name).trim())throw new Error('Team name is required');t.name=String(name).trim().slice(0,60);}
 if(description!==undefined)t.description=String(description).slice(0,300);
 await t.save();res.json((await view([t],req.user._id))[0]);
}));

r.delete('/:id',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 if(!isOwner(t,req.user._id))return res.status(403).json({message:'Only the team owner can delete the team'});
 await Share.deleteMany({team:t._id});await Activity.deleteMany({team:t._id});await Message.deleteMany({team:t._id});await t.deleteOne();res.json({ok:true});
}));

r.post('/:id/members',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 if(!canManage(t,req.user._id))return res.status(403).json({message:'Only team admins can add members'});
 const have=new Set(t.members.map(m=>String(m.user)));
 const add=(await validUsers(ids(req.body?.users))).filter(u=>!have.has(String(u)));
 if(!add.length)throw new Error('Choose at least one new person');
 if(t.members.length+add.length>200)throw new Error('A team can have up to 200 members');
 add.forEach(u=>t.members.push({user:u,role:'member'}));
 await t.save();await tlog(req.user._id,t,`Added ${add.length} member${add.length>1?'s':''}`);res.json((await view([t],req.user._id))[0]);
}));

// change a member's role (owner only)  or  transfer ownership
r.put('/:id/members/:uid',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 if(!isOwner(t,req.user._id))return res.status(403).json({message:'Only the team owner can change roles'});
 const m=t.members.find(x=>same(x.user,req.params.uid));
 if(!m)return res.status(404).json({message:'Member not found'});
 if(req.body?.makeOwner){t.owner=m.user;m.role='admin';}
 else{if(isOwner(t,m.user))throw new Error('The owner is always an admin');m.role=req.body?.role==='admin'?'admin':'member';}
 await t.save();await tlog(req.user._id,t,req.body?.makeOwner?'Transferred ownership':'Changed a member role');res.json((await view([t],req.user._id))[0]);
}));

// remove a member, or leave the team yourself
r.delete('/:id/members/:uid',guard(async(req,res)=>{
 const me=req.user._id,uid=req.params.uid,t=await load(req.params.id,me);
 const target=t.members.find(m=>same(m.user,uid));
 if(!target)return res.status(404).json({message:'Member not found'});
 if(same(uid,me)){
  if(isOwner(t,me))throw new Error('The owner cannot leave. Make someone else the owner, or delete the team.');
 }else{
  if(!canManage(t,me))return res.status(403).json({message:'Only team admins can remove members'});
  if(isOwner(t,uid))throw new Error('The owner cannot be removed');
  if(target.role==='admin'&&!isOwner(t,me))throw new Error('Only the owner can remove an admin');
 }
 t.members=t.members.filter(m=>!same(m.user,uid));await t.save();
 await tlog(me,t,same(uid,me)?'Left the team':'Removed a member');await Share.deleteMany({team:t._id,from:uid}); // what they shared into the team goes with them
 res.json(same(uid,me)?{ok:true,left:true}:(await view([t],me))[0]);
}));

// everything shared into this team
r.get('/:id/items',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 const l=await Share.find({team:t._id}).sort({createdAt:-1}).populate('from','name username active').populate('team','name').lean();
 res.json(await resolve(l,req.user._id));
}));
// team history: member changes + edits/comments on things shared into the team
r.get('/:id/activity',guard(async(req,res)=>{
 const t=await load(req.params.id,req.user._id);
 const sh=await Share.find({team:t._id}).lean();
 const ids=await scopeIds(sh);
 res.json(await paged({$or:[{team:t._id},{item:{$in:ids},action:{$in:['edited','comment']}}]},req.query,req.user._id));
}));
module.exports=r;
