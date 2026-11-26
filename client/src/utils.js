export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const STATUS={todo:'Pending',inprogress:'In progress',done:'Done'};
const PRIO={High:0,Medium:1,Low:2};
const pad=n=>String(n).padStart(2,'0');
export const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const todayStr=()=>dstr(new Date());
export const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return dstr(d);};
export const fmtDate=s=>new Date(s+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
export const fmtDateTime=i=>i?new Date(i).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'—';
export const isOverdue=t=>t.status!=='done'&&t.dueDate<todayStr();
export const dueLabel=t=>{
 const n=Math.round((new Date(t.dueDate+'T00:00:00')-new Date(todayStr()+'T00:00:00'))/864e5);
 if(t.status==='done')return fmtDate(t.dueDate);
 if(n===0)return'Due today';if(n===1)return'Due tomorrow';if(n===-1)return'1 day overdue';
 return n>0?`Due in ${n} days`:`${-n} days overdue`;
};
export const stats=l=>({total:l.length,todo:l.filter(t=>t.status==='todo').length,inprogress:l.filter(t=>t.status==='inprogress').length,
 done:l.filter(t=>t.status==='done').length,overdue:l.filter(isOverdue).length});
export const SORTS={'due-asc':'Due date (earliest)','due-desc':'Due date (latest)','priority':'Priority','title':'Title (A–Z)','created':'Recently added'};
export const sortTasks=(l,k)=>[...l].sort((a,b)=>
 k==='due-asc'?a.dueDate.localeCompare(b.dueDate):
 k==='priority'?(PRIO[a.priority]-PRIO[b.priority])||a.dueDate.localeCompare(b.dueDate):
 k==='title'?a.title.localeCompare(b.title):
 k==='created'?String(b.createdAt).localeCompare(String(a.createdAt)):
 b.dueDate.localeCompare(a.dueDate));
export const genPassword=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';let p='';
 for(const n of crypto.getRandomValues(new Uint32Array(10)))p+=c[n%c.length];return p;};
export const exportCSV=list=>{
 const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const rows=[['Title','Project','Status','Priority','Start date','Due date','Notes','Checklist','Created','Completed'],
  ...list.map(t=>[t.title,t.project,STATUS[t.status],t.priority,t.startDate||t.dueDate,t.dueDate,t.notes,(t.checklist||[]).map(c=>(c.done?'[x] ':'[ ] ')+c.text).join('; '),fmtDateTime(t.createdAt),fmtDateTime(t.completedAt)])];
 const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workzen-${todayStr()}.csv`;a.click();URL.revokeObjectURL(a.href);
};
export const hue=s=>[...String(s||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
export const safeUrl=u=>{u=String(u||'').trim();if(!u)return null;if(!/^https?:\/\//i.test(u))u='https://'+u;try{return new URL(u).href;}catch(e){return null;}};
export const host=u=>{const s=safeUrl(u);return s?new URL(s).hostname.replace(/^www\./,''):'';};
export const strength=p=>{
 if(!p)return{score:0,label:'',color:'var(--line)',pct:0};
 let n=[p.length>=8,p.length>=12,/[a-z]/.test(p)&&/[A-Z]/.test(p),/\d/.test(p),/[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
 if(p.length<8)n=Math.min(n,1);
 const L=[['Weak','#dc2626'],['Weak','#dc2626'],['Fair','#d97706'],['Good','#0ea5e9'],['Strong','#059669'],['Strong','#059669']][n];
 return{score:n,label:L[0],color:L[1],pct:Math.max(12,n/5*100)};
};
export const genPass=(len=16,symbols=true)=>{
 const sets=['abcdefghijkmnpqrstuvwxyz','ABCDEFGHJKLMNPQRSTUVWXYZ','23456789',...(symbols?['!@#$%^&*-_=+?']:[])];
 const all=sets.join('');const rnd=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
 const chars=sets.map(s=>s[rnd(s.length)]);while(chars.length<len)chars.push(all[rnd(all.length)]);
 for(let i=chars.length-1;i>0;i--){const j=rnd(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
 return chars.join('');
};
let clipTimer;
export const copyText=async(text,say,label='Copied')=>{
 try{await navigator.clipboard.writeText(text);say(`${label} – clipboard clears in 20s`);
  clearTimeout(clipTimer);clipTimer=setTimeout(()=>{if(document.hasFocus())navigator.clipboard.writeText('').catch(()=>{});},20000);
 }catch(e){say('Copy failed');}
};

export const fmtTime=i=>new Date(i).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
// "Today", "Yesterday" or "Mon, Nov 24"
export const dayLabel=i=>{
 const d=new Date(i),n=new Date(),a=new Date(d.getFullYear(),d.getMonth(),d.getDate()),b=new Date(n.getFullYear(),n.getMonth(),n.getDate());
 const diff=Math.round((b-a)/864e5);
 if(diff===0)return'Today';if(diff===1)return'Yesterday';
 return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',...(d.getFullYear()!==n.getFullYear()?{year:'numeric'}:{})});
};
export const dayKey=i=>{const d=new Date(i);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;};
export const ago=i=>{const s=Math.round((Date.now()-new Date(i))/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';
 return new Date(i).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
// stable key for a chat reference (used to highlight the open conversation)
export const chatKey=r=>r?[r.type,r.team||r.user||r.item||r.owner||'',r.kind||'',r.year??'',r.month??'',r.project??''].join('|'):'';
