const Activity=require('../models/Activity');
const L={title:'Title',notes:'Notes',project:'Project',priority:'Priority',status:'Status',startDate:'Start date',dueDate:'Due date',content:'Content',category:'Category',color:'Colour',url:'Website',description:'Description'};
const ST={todo:'Pending',inprogress:'In progress',done:'Done'};
const sh=(v,f)=>{v=v==null?'':String(v);if(f==='status')return ST[v]||v;return v.length>80?v.slice(0,77)+'…':v;};
// list of {field,from,to} describing what changed between two versions of an item
exports.diff=(a={},b={})=>{
 const ch=[];
 for(const f of Object.keys(L)){
  if(a[f]===undefined&&b[f]===undefined)continue;
  if(String(a[f]??'')===String(b[f]??''))continue;
  if(f==='content'||f==='notes')ch.push({field:L[f],from:'',to:'updated'});
  else ch.push({field:L[f],from:sh(a[f],f),to:sh(b[f],f)});
 }
 const ca=a.checklist||[],cb=b.checklist||[];
 if(JSON.stringify(ca)!==JSON.stringify(cb)){
  const d=l=>`${l.filter(x=>x.done).length}/${l.length} done`;
  ch.push({field:'Checklist',from:d(ca),to:d(cb)});
 }
 return ch;
};
exports.log=async d=>{try{return await Activity.create(d);}catch(e){return null;}};
exports.row=(a,me)=>({id:a._id,action:a.action,kind:a.kind,item:a.item,title:a.title,changes:a.changes||[],text:a.text,at:a.createdAt,
 actor:a.actor?{id:a.actor._id,name:a.actor.name||a.actor.username,username:a.actor.username}:{id:null,name:'Deleted user',username:''},
 you:!!a.actor&&String(a.actor._id)===String(me),team:a.team||null});
