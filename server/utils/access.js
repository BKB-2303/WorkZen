// Who may see what: shared by the chat and history routes.
const Team=require('../models/Team'),Share=require('../models/Share'),Task=require('../models/Task'),User=require('../models/User');
const {M,folderLabel,folderQuery,person}=require('./shareResolve');
const myTeamIds=async uid=>(await Team.find({'members.user':uid}).select('_id').lean()).map(t=>t._id);
const live=()=>({$or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]});
// condition for shares given to `uid` (directly or through a team), not expired, owned by someone else
const incoming=async uid=>({from:{$ne:uid},$and:[{$or:[{to:uid},{team:{$in:await myTeamIds(uid)}}]},live()]});
const normFolder=f=>{
 f=f||{};
 const year=/^\d{4}$/.test(String(f.year||''))?String(f.year):null;
 let month=f.month===null||f.month===undefined||f.month===''?null:parseInt(f.month,10);
 if(!year||!(month>=0&&month<=11))month=null;
 const project=f.project?String(f.project).trim().slice(0,60)||null:null;
 return {year,month,project};
};
const isId=v=>/^[0-9a-f]{24}$/i.test(String(v||''));
const keys={
 team:id=>'team:'+id,
 dm:(a,b)=>'dm:'+[String(a),String(b)].sort().join(':'),
 item:id=>'item:'+id,
 folder:(owner,f)=>`folder:${owner}:${f.year??''}:${f.month??''}:${f.project??''}`
};
const err=(m,code=400)=>Object.assign(new Error(m),{code});
// Turn what the client sent (type + ids) into a checked conversation, or throw.
// returns {key,scope,team?,owner?,pair?,title,sub,canModerate}
async function resolveThread(me,q={}){
 const type=q.type;
 if(type==='team'){
  if(!isId(q.team))throw err('Team not found',404);
  const t=await Team.findOne({_id:q.team,'members.user':me}).lean();
  if(!t)throw err('Team not found',404);
  const mine=t.members.find(m=>String(m.user)===String(me));
  const mod=String(t.owner)===String(me)||mine?.role==='admin';
  return {key:keys.team(t._id),scope:'team',team:t._id,title:t.name,sub:`Team chat · ${t.members.length} member${t.members.length>1?'s':''}`,canModerate:mod};
 }
 if(type==='direct'){
  if(!isId(q.user)||String(q.user)===String(me))throw err('Person not found',404);
  const u=await User.findById(q.user).select('name username role active').lean();
  if(!u)throw err('Person not found',404);
  if(u.role==='admin'||u.active===false)throw err('This person is not available for messages',404);
  return {key:keys.dm(me,u._id),scope:'direct',pair:[me,u._id],title:u.name||u.username,sub:'@'+u.username,other:person(u),canModerate:false};
 }
 if(type==='item'){
  if(!M[q.kind]||!isId(q.item))throw err('Item not found',404);
  const d=await M[q.kind].findById(q.item).select('title user').lean();
  if(!d)throw err('Item not found',404);
  const owner=d.user;
  if(String(owner)!==String(me)){
   const inc=await incoming(me);
   const shares=await Share.find({...inc,from:owner,$or:[{kind:q.kind,item:d._id},{kind:'folder'}]}).lean();
   let ok=false;
   for(const s of shares){
    if(s.kind!=='folder'){ok=true;break;}
    if(q.kind==='task'&&await Task.exists({...folderQuery(s),_id:d._id})){ok=true;break;}
   }
   if(!ok)throw err('You do not have access to this',403);
  }
  const ow=await User.findById(owner).select('name username').lean();
  return {key:keys.item(d._id),scope:'item',owner,title:d.title||'Untitled note',sub:`${q.kind[0].toUpperCase()+q.kind.slice(1)} chat${ow&&String(owner)!==String(me)?' · shared by '+(ow.name||ow.username):''}`,canModerate:String(owner)===String(me)};
 }
 if(type==='folder'){
  if(!isId(q.owner)&&q.owner!=='me')throw err('Folder not found',404);
  const f=normFolder(q);
  const owner=q.owner==='me'?String(me):q.owner;
  if(String(owner)!==String(me)){
   const inc=await incoming(me);
   const s=await Share.findOne({...inc,from:owner,kind:'folder','folder.year':f.year,'folder.month':f.month,'folder.project':f.project}).lean();
   if(!s)throw err('You do not have access to this',403);
  }
  const ow=await User.findById(owner).select('name username').lean();
  return {key:keys.folder(owner,f),scope:'folder',owner,title:folderLabel(f),sub:`Folder chat${ow&&String(owner)!==String(me)?' · shared by '+(ow.name||ow.username):''}`,canModerate:String(owner)===String(me)};
 }
 throw err('Unknown conversation');
}
module.exports={myTeamIds,live,incoming,normFolder,keys,resolveThread,isId,err};
