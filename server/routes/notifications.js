const r=require('express').Router();
const Notification=require('../models/Notification'),Task=require('../models/Task'),Share=require('../models/Share'),TaskProgress=require('../models/TaskProgress');
const {auth,userOnly}=require('../middleware/auth');
const {incoming}=require('../utils/access');
const {folderQuery}=require('../utils/shareResolve');
r.use(auth,userOnly);
const wrap=fn=>(req,res,next)=>fn(req,res,next).catch(e=>res.status(e.code>=400&&e.code<600?e.code:400).json({message:e.message||'Bad request'}));
const writeNotifications=async operations=>{
 if(!operations.length)return;
 try{await Notification.bulkWrite(operations,{ordered:false});}
 catch(e){
  if(e.code===11000||(e.writeErrors?.length&&e.writeErrors.every(x=>x.code===11000)))return;
  throw e;
 }
};
const dateOnly=v=>{
 const s=String(v||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const d=new Date(s+'T00:00:00Z');
 return !isNaN(d)&&d.toISOString().slice(0,10)===s?s:null;
};

async function overdueTasks(me,today){
 const own=await Task.find({user:me,status:{$ne:'done'},dueDate:{$lt:today}}).sort({dueDate:1}).limit(500).lean();
 const shares=await Share.find(await incoming(me)).lean(),access=[];
 for(const s of shares){
  if(s.kind==='task'&&s.item)access.push({_id:s.item,user:s.from});
  else if(s.kind==='folder')access.push(folderQuery(s));
 }
 const shared=access.length?await Task.find({$or:access,status:{$ne:'done'},dueDate:{$lt:today}}).sort({dueDate:1}).limit(500).lean():[];
 const sharedIds=new Set(shared.map(t=>String(t._id)));
 const tasks=[...new Map([...own,...shared].map(t=>[String(t._id),t])).values()];
 if(!sharedIds.size)return tasks;
 const done=await TaskProgress.find({user:me,task:{$in:[...sharedIds]},status:'done'}).select('task').lean();
 const completed=new Set(done.map(p=>String(p.task)));
 return tasks.filter(t=>!sharedIds.has(String(t._id))||!completed.has(String(t._id)));
}

r.get('/',wrap(async(req,res)=>{
 const me=req.user._id,today=dateOnly(req.query.today);
 if(!today)throw Object.assign(new Error('A valid local date is required'),{code:400});
 const overdue=await overdueTasks(me,today),activeKeys=[],operations=[];
 for(const t of overdue){
  const key=`overdue:${t._id}:${t.dueDate}`;
  activeKeys.push(key);
  operations.push({updateOne:{
   filter:{user:me,key,resolvedAt:{$ne:null},clearedAt:null},
   update:{$set:{resolvedAt:null,readAt:null}}
  }});
  operations.push({updateOne:{
   filter:{user:me,key},
   update:{$setOnInsert:{
    user:me,key,type:'overdue',title:'Task overdue',
    body:`${t.title} · due ${t.dueDate}`,
    target:{type:'task',taskId:String(t._id),shared:String(t.user)!==String(me)}
   }},
   upsert:true
  }});
 }
 await writeNotifications(operations);
 await Notification.updateMany({user:me,type:'overdue',clearedAt:null,resolvedAt:null,key:{$nin:activeKeys}},{$set:{resolvedAt:new Date()}});
 const filter={user:me,type:'overdue',clearedAt:null,resolvedAt:null};
 const [items,unread]=await Promise.all([
  Notification.find(filter).sort({createdAt:-1}).limit(100).lean(),
  Notification.countDocuments({...filter,readAt:null})
 ]);
 res.json({items:items.map(n=>({id:String(n._id),type:n.type,title:n.title,body:n.body,target:n.target||null,createdAt:n.createdAt,readAt:n.readAt||null})),unread});
}));

r.post('/:id/read',wrap(async(req,res)=>{
 const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user._id,clearedAt:null,resolvedAt:null},{$set:{readAt:new Date()}},{new:true}).lean();
 if(!n)throw Object.assign(new Error('Notification not found'),{code:404});
 res.json({ok:true,id:String(n._id),readAt:n.readAt});
}));

r.post('/:id/clear',wrap(async(req,res)=>{
 const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user._id,clearedAt:null,resolvedAt:null},{$set:{clearedAt:new Date()}},{new:true}).lean();
 if(!n)throw Object.assign(new Error('Notification not found'),{code:404});
 res.json({ok:true,id:String(n._id)});
}));

r.post('/clear',wrap(async(req,res)=>{
 await Notification.updateMany({user:req.user._id,type:'overdue',clearedAt:null,resolvedAt:null},{$set:{clearedAt:new Date()}});
 res.json({ok:true});
}));

module.exports=r;
