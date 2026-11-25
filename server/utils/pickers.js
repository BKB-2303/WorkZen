// Field whitelists used when someone edits an item (own or shared with edit permission)
exports.task=b=>{
 const o={};for(const k of ['title','notes','project','priority','status','dueDate'])if(b[k]!==undefined)o[k]=b[k];
 if(o.project==='')o.project='General';
 if(Array.isArray(b.checklist))o.checklist=b.checklist.slice(0,50).map(c=>({text:String(c.text||'').slice(0,200),done:!!c.done})).filter(c=>c.text.trim());
 if(o.status!==undefined)o.completedAt=o.status==='done'?new Date():null;
 return o;
};
const COLORS=['default','yellow','green','blue','pink','purple'];
exports.note=(b={})=>{
 const o={};
 if(b.title!==undefined)o.title=String(b.title).trim().slice(0,120);
 if(b.content!==undefined)o.content=String(b.content).slice(0,20000);
 if(b.category!==undefined)o.category=String(b.category).trim().slice(0,40)||'General';
 if(b.color!==undefined)o.color=COLORS.includes(b.color)?b.color:'default';
 return o;
};
const norm=u=>{u=String(u||'').trim();if(!u)return null;if(!/^https?:\/\//i.test(u))u='https://'+u;try{new URL(u);return u;}catch(e){return null;}};
exports.bookmark=(b={})=>{
 const o={};
 if(b.url!==undefined){const u=norm(b.url);if(!u)throw new Error('Enter a valid website address');o.url=u;}
 if(b.title!==undefined)o.title=String(b.title).trim().slice(0,120);
 if(b.description!==undefined)o.description=String(b.description).slice(0,300);
 if(b.category!==undefined)o.category=String(b.category).trim().slice(0,40)||'General';
 return o;
};
