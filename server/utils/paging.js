// Filtered + paginated history queries (used by shares, teams)
const Activity=require('../models/Activity'),User=require('../models/User'),A=require('./activity');
const GROUPS={edits:['edited'],sharing:['shared','unshared'],access:['permission'],copies:['copied'],team:['team'],comments:['comment']};
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const day=(s,end)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;const d=new Date(s+(end?'T23:59:59.999':'T00:00:00'));return isNaN(d)?null:d;};
// extra Mongo conditions from the query string: group, actor, kind, q, range|from|to
function filters(q){
 const and=[];
 if(q.group&&GROUPS[q.group])and.push({action:{$in:GROUPS[q.group]}});
 if(/^[0-9a-f]{24}$/i.test(String(q.actor||'')))and.push({actor:q.actor});
 if(['task','note','bookmark'].includes(q.kind))and.push({kind:q.kind});
 const text=String(q.q||'').trim().slice(0,80);
 if(text){const rx=new RegExp(esc(text),'i');and.push({$or:[{title:rx},{text:rx},{'changes.field':rx},{'changes.from':rx},{'changes.to':rx}]});}
 const R={today:1,'7':7,'30':30,'90':90};
 if(R[q.range]){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(R[q.range]-1));and.push({createdAt:{$gte:d}});}
 else{const a=day(q.from),b=day(q.to,true);if(a||b)and.push({createdAt:{...(a?{$gte:a}:{}),...(b?{$lte:b}:{})}});}
 return and;
}
// cond = who-may-see-what condition. Returns {rows,total,page,pages,limit,people}
async function paged(cond,query,me){
 const and=filters(query);
 const full=and.length?{$and:[cond,...and]}:cond;
 const all=query.all==='1';
 const limit=all?1000:Math.min(Math.max(parseInt(query.limit,10)||20,5),100);
 const total=await Activity.countDocuments(full);
 const pages=Math.max(1,Math.ceil(total/limit));
 const page=all?1:Math.min(Math.max(parseInt(query.page,10)||1,1),pages);
 const [rows,actorIds]=await Promise.all([
  Activity.find(full).sort({createdAt:-1,_id:-1}).skip((page-1)*limit).limit(limit).populate('actor','name username').lean(),
  Activity.distinct('actor',cond)]);
 const people=actorIds.length?await User.find({_id:{$in:actorIds.slice(0,200)}}).select('name username').sort({name:1}).lean():[];
 return {rows:rows.map(a=>A.row(a,me)),total,page,pages,limit,people:people.map(u=>({id:u._id,name:u.name||u.username}))};
}
module.exports={paged,filters,GROUPS};
