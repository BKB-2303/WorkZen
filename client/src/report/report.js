import {Pdf,W,H} from './pdf.js';

const C={navy:'#0d1630',navy2:'#16224a',blue:'#2563eb',blueL:'#bcd0fb',teal:'#14b8a6',green:'#059669',greenL:'#cdeee1',amber:'#d97706',amberL:'#fbe7c4',red:'#dc2626',redL:'#fbd5d5',ink:'#1b2540',gray:'#5b6b8c',mute:'#8794b0',line:'#e2e8f4',bg:'#f4f7fc',band:'#e8effc',white:'#ffffff'};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONF=['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad=v=>String(v).padStart(2,'0');
export const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>dstr(new Date());
const fmtD=s=>s?`${+s.slice(8,10)} ${MON[+s.slice(5,7)-1]} ${s.slice(0,4)}`:'—';
const localD=iso=>iso?dstr(new Date(iso)):null;
const dayNum=s=>Math.round(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
const STAT={todo:'Pending',inprogress:'In progress',done:'Done'};
const PRI={High:C.red,Medium:C.amber,Low:C.green};

// ------------------------------------------------------------------ analysis
export function analyse(tasks){
 const t0=today(),n=tasks.length;
 const done=tasks.filter(t=>t.status==='done'),prog=tasks.filter(t=>t.status==='inprogress'),todo=tasks.filter(t=>t.status==='todo');
 const open=tasks.filter(t=>t.status!=='done'),overdue=open.filter(t=>t.dueDate<t0);
 const onTime=done.filter(t=>t.completedAt&&localD(t.completedAt)<=t.dueDate).length;
 const timed=done.filter(t=>t.completedAt&&t.createdAt);
 const avg=timed.length?timed.reduce((a,t)=>a+Math.max(0,(new Date(t.completedAt)-new Date(t.createdAt))/864e5),0)/timed.length:null;
 const proj={},pri={High:{total:0,done:0},Medium:{total:0,done:0},Low:{total:0,done:0}},mon={};
 for(const t of tasks){
  const p=(proj[t.project||'General']??={total:0,done:0});p.total++;if(t.status==='done')p.done++;
  const q=pri[t.priority]||pri.Medium;q.total++;if(t.status==='done')q.done++;
  const m=(mon[t.dueDate.slice(0,7)]??={total:0,done:0});m.total++;if(t.status==='done')m.done++;
 }
 const next7=open.filter(t=>t.dueDate>=t0&&dayNum(t.dueDate)-dayNum(t0)<=7).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 return{total:n,done:done.length,inprogress:prog.length,todo:todo.length,open:open.length,overdue:overdue.length,overdueList:overdue.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),
  rate:n?Math.round(done.length/n*100):0,onTime,onTimePct:done.length?Math.round(onTime/done.length*100):null,avg,
  highOpen:open.filter(t=>t.priority==='High').length,proj,pri,mon,next7,t0};
}

export function periodRange(kind,from,to){
 const d=new Date(),y=d.getFullYear(),m=d.getMonth();
 const iso=x=>dstr(x);
 if(kind==='month')return{from:iso(new Date(y,m,1)),to:iso(new Date(y,m+1,0)),label:`${MONF[m]} ${y}`};
 if(kind==='last_month')return{from:iso(new Date(y,m-1,1)),to:iso(new Date(y,m,0)),label:`${MONF[(m+11)%12]} ${m?y:y-1}`};
 if(kind==='30'){const a=new Date();a.setDate(a.getDate()-29);return{from:iso(a),to:iso(d),label:`Last 30 days (${fmtD(iso(a))} – ${fmtD(iso(d))})`};}
 if(kind==='year')return{from:`${y}-01-01`,to:`${y}-12-31`,label:`Year ${y}`};
 if(kind==='custom'&&from&&to)return{from,to,label:`${fmtD(from)} – ${fmtD(to)}`};
 return{from:'0000-01-01',to:'9999-12-31',label:'All time'};
}
export const filterTasks=(tasks,r)=>tasks.filter(t=>t.dueDate>=r.from&&t.dueDate<=r.to);

// ------------------------------------------------------------------ PDF
export function buildReport({user,tasks,period,opts={}}){
 const {details=true,notes=false}=opts;
 const A=analyse(tasks),L=40,R=W-40,CW=R-L;
 const pdf=new Pdf({title:`WorkZen Work Report - ${period.label}`,author:user.name||user.username});
 let y=0;
 const FOOT=50;
 const need=h=>{if(y+h>H-FOOT)newPage();};
 const newPage=()=>{pdf.add();pdf.rect(0,0,W,30,{fill:C.navy});pdf.rect(0,30,W,2,{fill:C.teal});
  pdf.text(L,19,'WorkZen',{size:10,bold:true,color:C.white});pdf.text(L+50,19,'Work Report',{size:9,color:'#aebbd9'});
  pdf.text(R,19,period.label,{size:8.5,color:'#aebbd9',align:'right'});y=54;};

 // ---------- cover header
 pdf.rect(0,0,W,168,{fill:C.navy});
 pdf.rect(W*0.55,0,W*0.45,168,{fill:C.navy2});
 pdf.rect(0,168,W,4,{fill:C.teal});pdf.rect(0,168,W*0.35,4,{fill:C.blue});
 pdf.rect(L,34,36,36,{fill:C.teal,r:9});pdf.text(L+18,59,'W',{size:21,bold:true,color:C.navy,align:'center'});
 pdf.text(L+48,50,'WorkZen',{size:17,bold:true,color:C.white});pdf.text(L+48,64,'Plan. Track. Deliver.',{size:8.5,color:'#8fa3d1'});
 pdf.text(L,126,'Work Report',{size:36,bold:true,color:C.white});
 pdf.text(L,147,'Progress, workload and performance summary',{size:10.5,color:'#aebbd9'});
 const meta=[['REPORT PERIOD',period.label],['PREPARED FOR',user.name||user.username],['GENERATED',(()=>{const d=new Date();let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${h}:${pad(d.getMinutes())} ${ap}`;})()]];
 meta.forEach(([k,v],i)=>{const yy=40+i*42;pdf.text(R,yy,k,{size:7.5,bold:true,color:'#8fa3d1',align:'right'});pdf.text(R,yy+15,pdf.fit(v,230,11.5,true),{size:11.5,bold:true,color:C.white,align:'right'});});
 y=196;

 // ---------- helpers
 const h2=(t,sub)=>{need(46);pdf.rect(L,y-10,4,15,{fill:C.blue,r:2});pdf.text(L+12,y+2,t,{size:14,bold:true,color:C.ink});
  if(sub)pdf.text(R,y+2,sub,{size:8.5,color:C.mute,align:'right'});pdf.line(L,y+12,R,y+12);y+=30;};
 const card=(x,yy,w,h,label,val,sub,color)=>{pdf.rect(x,yy,w,h,{fill:C.bg,stroke:C.line,r:8});pdf.rect(x,yy+10,3,h-20,{fill:color,r:1.5});
  pdf.text(x+14,yy+20,label.toUpperCase(),{size:7,bold:true,color:C.gray});pdf.text(x+14,yy+46,val,{size:23,bold:true,color});
  pdf.text(x+14,yy+58,pdf.fit(sub,w-24,7.5),{size:7.5,color:C.mute});};

 if(!A.total){
  pdf.rect(L,y,CW,110,{fill:C.bg,stroke:C.line,r:10});
  pdf.text(W/2,y+52,'No tasks found for this period',{size:15,bold:true,color:C.ink,align:'center'});
  pdf.text(W/2,y+72,'Choose a different period or add tasks, then generate the report again.',{size:9.5,color:C.gray,align:'center'});
 }else{
 // ---------- KPI cards
 const cw=(CW-30)/4,ch=66;
 const K=[['Total tasks',String(A.total),'in this period',C.blue],['Completed',String(A.done),`${A.rate}% completion`,C.green],['Still open',String(A.open),`${A.todo} pending · ${A.inprogress} in progress`,C.amber],['Overdue',String(A.overdue),'open and past due date',A.overdue?C.red:C.green],
  ['Completion rate',A.rate+'%',`${A.done} of ${A.total} tasks done`,C.teal],['On-time rate',A.onTimePct===null?'—':A.onTimePct+'%',A.done?`${A.onTime} of ${A.done} done by due date`:'no completed tasks',C.blue],
  ['High priority open',String(A.highOpen),A.highOpen?'need attention first':'all clear',A.highOpen?C.red:C.green],['Avg. time to finish',A.avg===null?'—':(A.avg<1?'<1':A.avg.toFixed(1))+' d','from creation to done',C.navy2]];
 K.forEach((k,i)=>card(L+(i%4)*(cw+10),y+Math.floor(i/4)*(ch+10),cw,ch,...k));
 y+=2*ch+10+34;

 // ---------- progress overview
 h2('Progress overview','Status and priority');
 const top=y,cx=L+72,cy=top+76,r2=64,r1=42;
 const segs=[['Done',A.done,C.green],['In progress',A.inprogress,C.blue],['Pending',A.todo,C.amber]];
 let a=0;for(const [,v,col] of segs){if(!v)continue;const sw=v/A.total*360;pdf.arc(cx,cy,r1,r2,a,Math.min(360,a+sw)-(A.total===v?0.01:0.6),{fill:col});a+=sw;}
 pdf.text(cx,cy+4,A.rate+'%',{size:22,bold:true,color:C.ink,align:'center'});pdf.text(cx,cy+16,'complete',{size:8,color:C.gray,align:'center'});
 segs.forEach(([lb,v,col],i)=>{const yy=top+36+i*30;pdf.rect(L+160,yy-8,10,10,{fill:col,r:2.5});pdf.text(L+178,yy,lb,{size:10,bold:true});
  pdf.text(L+178,yy+12,`${v} task${v===1?'':'s'} · ${Math.round(v/A.total*100)}%`,{size:8.5,color:C.gray});});
 // priority bars
 const px=L+290,pw=CW-290;
 pdf.text(px,top+12,'BY PRIORITY',{size:7.5,bold:true,color:C.gray});
 const mx=Math.max(1,...Object.values(A.pri).map(p=>p.total));
 ['High','Medium','Low'].forEach((k,i)=>{const p=A.pri[k],yy=top+36+i*30,bw=pw-100;
  pdf.text(px,yy,k,{size:9.5,bold:true});pdf.rect(px+52,yy-9,bw-52,11,{fill:C.bg,r:5.5});
  if(p.total)pdf.rect(px+52,yy-9,Math.max(11,(bw-52)*p.total/mx),11,{fill:PRI[k],r:5.5});
  pdf.text(px+pw,yy,`${p.done}/${p.total} done`,{size:8.5,color:C.gray,align:'right'});});
 y=top+170;

 // ---------- projects
 const pj=Object.entries(A.proj).sort((a,b)=>b[1].total-a[1].total||a[0].localeCompare(b[0])).slice(0,8);
 h2('Work by project',pj.length<Object.keys(A.proj).length?`Top ${pj.length} of ${Object.keys(A.proj).length} projects`:`${pj.length} project${pj.length===1?'':'s'}`);
 const pm=Math.max(1,...pj.map(p=>p[1].total));
 pj.forEach(([nm,p])=>{need(24);pdf.text(L,y+8,pdf.fit(nm,130,9.5,true),{size:9.5,bold:true});
  const bx=L+140,bw=CW-140-70;pdf.rect(bx,y,bw,11,{fill:C.bg,r:5.5});
  const full=Math.max(11,bw*p.total/pm);pdf.rect(bx,y,full,11,{fill:C.blueL,r:5.5});
  if(p.done)pdf.rect(bx,y,Math.max(11,full*p.done/p.total),11,{fill:C.green,r:5.5});
  pdf.text(R,y+9,`${p.done}/${p.total}`,{size:9,bold:true,color:C.ink,align:'right'});y+=22;});
 pdf.rect(L+140,y+2,8,8,{fill:C.green,r:2});pdf.text(L+152,y+9,'Completed',{size:7.5,color:C.gray});
 pdf.rect(L+205,y+2,8,8,{fill:C.blueL,r:2});pdf.text(L+217,y+9,'Open',{size:7.5,color:C.gray});y+=34;

 // ---------- monthly chart
 const months=Object.keys(A.mon).sort().slice(-12);
 if(months.length>=2){
  need(215);h2('Monthly activity','Tasks by due month');
  const gh=110,gx=L+26,gw=CW-26,top2=y,mx2=Math.max(1,...months.map(k=>A.mon[k].total));
  for(let i=0;i<=4;i++){const yy=top2+gh-gh*i/4;pdf.line(gx,yy,R,yy,{color:C.line,lw:0.6});pdf.text(gx-6,yy+3,String(Math.round(mx2*i/4)),{size:7,color:C.mute,align:'right'});}
  const slot=gw/months.length,bw=Math.min(22,slot/2-3);
  months.forEach((k,i)=>{const m=A.mon[k],x=gx+i*slot+slot/2;const h1=gh*m.total/mx2,h3=gh*m.done/mx2;
   pdf.rect(x-bw-1,top2+gh-h1,bw,Math.max(h1,.5),{fill:C.blueL});pdf.rect(x+1,top2+gh-h3,bw,Math.max(h3,.5),{fill:C.green});
   pdf.text(x-bw/2-1,top2+gh-h1-3,String(m.total),{size:7,color:C.gray,align:'center'});
   pdf.text(x,top2+gh+13,`${MON[+k.slice(5,7)-1]} ${k.slice(2,4)}`,{size:7.5,color:C.gray,align:'center'});});
  const ly=top2+gh+28;pdf.rect(gx,ly-8,8,8,{fill:C.blueL,r:2});pdf.text(gx+12,ly,'Tasks due',{size:8,color:C.gray});pdf.rect(gx+70,ly-8,8,8,{fill:C.green,r:2});pdf.text(gx+82,ly,'Completed',{size:8,color:C.gray});
  y=ly+26;
 }

 // ---------- insights
 h2('Key insights','Generated from your data');
 const ins=[];
 ins.push([A.rate>=70?C.green:A.rate>=40?C.amber:C.red,`You completed ${A.done} of ${A.total} tasks (${A.rate}%) in this period.`]);
 if(A.onTimePct!==null)ins.push([A.onTimePct>=80?C.green:A.onTimePct>=50?C.amber:C.red,`${A.onTime} of ${A.done} finished tasks (${A.onTimePct}%) were completed on or before the due date.`]);
 if(A.overdue){const o=A.overdueList[0];ins.push([C.red,`${A.overdue} task${A.overdue===1?' is':'s are'} overdue. The oldest is “${pdf.fit(o.title,260,9)}”, ${dayNum(A.t0)-dayNum(o.dueDate)} day(s) past due.`]);}
 else if(A.open)ins.push([C.green,'No open tasks are overdue. Great job staying on schedule.']);
 if(A.highOpen)ins.push([C.red,`${A.highOpen} high-priority task${A.highOpen===1?' is':'s are'} still open. Tackle ${A.highOpen===1?'it':'these'} first.`]);
 if(pj.length)ins.push([C.blue,`Busiest project: ${pj[0][0]} with ${pj[0][1].total} task${pj[0][1].total===1?'':'s'} (${pj[0][1].done} done).`]);
 if(A.avg!==null)ins.push([C.teal,`Tasks take ${A.avg<1?'less than a day':A.avg.toFixed(1)+' days'} on average from creation to completion.`]);
 if(A.next7.length)ins.push([C.amber,`${A.next7.length} open task${A.next7.length===1?' is':'s are'} due within the next 7 days.`]);
 ins.forEach(([col,s])=>{const ls=pdf.wrap(s,CW-22,9.5);need(ls.length*13+8);pdf.circle(L+4,y-3,3,{fill:col});ls.forEach((l,i)=>pdf.text(L+16,y+i*13,l,{size:9.5,color:C.ink}));y+=ls.length*13+7;});
 y+=14;

 // ---------- generic table
 const table=(cols,rows,{rowH=22}={})=>{
  const head=()=>{need(rowH*2);pdf.rect(L,y,CW,20,{fill:C.navy,r:5});let x=L;cols.forEach(c=>{pdf.text(c.align==='right'?x+c.w-8:x+8,y+13.5,c.label.toUpperCase(),{size:7,bold:true,color:C.white,align:c.align||'left'});x+=c.w;});y+=20;};
  head();
  rows.forEach((r,i)=>{need(rowH);if(y<56)head();
   if(i%2===0)pdf.rect(L,y,CW,rowH,{fill:'#f8faff'});let x=L;
   cols.forEach(c=>{const v=c.get(r);const col=c.color?c.color(r):C.ink;pdf.text(c.align==='right'?x+c.w-8:x+8,y+14.5,pdf.fit(v,c.w-16,8.5,!!c.bold),{size:8.5,bold:!!c.bold,color:col,align:c.align||'left'});x+=c.w;});
   y+=rowH;});
  pdf.line(L,y,R,y);y+=22;
 };
 if(A.overdueList.length){h2('Needs attention — overdue tasks',`${A.overdueList.length} overdue`);
  table([{label:'Task',w:230,get:t=>t.title,bold:true},{label:'Project',w:105,get:t=>t.project},{label:'Priority',w:60,get:t=>t.priority,color:t=>PRI[t.priority]},{label:'Due date',w:70,get:t=>fmtD(t.dueDate)},{label:'Days late',w:50,align:'right',get:t=>String(dayNum(A.t0)-dayNum(t.dueDate)),color:()=>C.red}],A.overdueList.slice(0,12));}
 if(A.next7.length){h2('Coming up — next 7 days',`${A.next7.length} task${A.next7.length===1?'':'s'}`);
  table([{label:'Task',w:230,get:t=>t.title,bold:true},{label:'Project',w:105,get:t=>t.project},{label:'Priority',w:60,get:t=>t.priority,color:t=>PRI[t.priority]},{label:'Status',w:70,get:t=>STAT[t.status]},{label:'Due date',w:50,align:'right',get:t=>fmtD(t.dueDate).slice(0,-5)}],A.next7.slice(0,12));}

 // ---------- full details
 if(details){
  h2('Task details',`${A.total} task${A.total===1?'':'s'} · grouped by due month`);
  const cols=[['Task',190],['Project',97],['Priority',52],['Status',72],['Due',52],['Done',52]];
  const colHead=()=>{pdf.rect(L,y,CW,18,{fill:C.navy,r:5});let x=L;cols.forEach(([l,w])=>{pdf.text(x+8,y+12.5,l.toUpperCase(),{size:7,bold:true,color:C.white});x+=w;});y+=18;};
  const groups={};for(const t of [...tasks].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.title.localeCompare(b.title)))(groups[t.dueDate.slice(0,7)]??=[]).push(t);
  need(60);colHead();
  Object.keys(groups).sort().forEach(k=>{
   const g=groups[k];need(24+30);if(y<56)colHead();
   pdf.rect(L,y,CW,19,{fill:C.band});pdf.text(L+8,y+13,`${MONF[+k.slice(5,7)-1]} ${k.slice(0,4)}`,{size:9.5,bold:true,color:C.blue});
   pdf.text(R-8,y+13,`${g.filter(t=>t.status==='done').length}/${g.length} done`,{size:8,color:C.gray,align:'right'});y+=19;
   g.forEach((t,i)=>{
    const tl=pdf.wrap(t.title,cols[0][1]-16,9,true).slice(0,2);
    const nl=notes&&t.notes?pdf.wrap(t.notes,cols[0][1]-16,7.5).slice(0,3):[];
    const cl=notes&&(t.checklist||[]).length?`Checklist ${(t.checklist).filter(c=>c.done).length}/${t.checklist.length}`:'';
    const h=Math.max(24,10+tl.length*11.5+nl.length*9.5+(cl?9.5:0));
    if(y+h>H-FOOT){newPage();colHead();}
    if(i%2===1)pdf.rect(L,y,CW,h,{fill:'#f8faff'});
    let yy=y+14;tl.forEach(l=>{pdf.text(L+8,yy,l,{size:9,bold:true});yy+=11.5;});
    yy-=2;nl.forEach(l=>{pdf.text(L+8,yy,l,{size:7.5,color:C.gray});yy+=9.5;});if(cl)pdf.text(L+8,yy,cl,{size:7.5,color:C.blue,bold:true});
    let x=L+cols[0][1];
    pdf.text(x+8,y+14,pdf.fit(t.project||'General',cols[1][1]-14,8.5),{size:8.5});x+=cols[1][1];
    pdf.circle(x+11,y+11.5,2.6,{fill:PRI[t.priority]||C.amber});pdf.text(x+18,y+14,t.priority,{size:8.5});x+=cols[2][1];
    const od=t.status!=='done'&&t.dueDate<A.t0;const sc=od?C.red:t.status==='done'?C.green:t.status==='inprogress'?C.blue:C.amber;
    const sl=od?'Overdue':STAT[t.status],sw=pdf.width(sl,7.5,true)+12;
    pdf.rect(x+4,y+5.5,sw,14,{fill:od?C.redL:t.status==='done'?C.greenL:t.status==='inprogress'?'#d8e5fd':C.amberL,r:7});pdf.text(x+10,y+15.5,sl,{size:7.5,bold:true,color:sc});x+=cols[3][1];
    pdf.text(x+8,y+14,fmtD(t.dueDate).slice(0,-5),{size:8.5,color:od?C.red:C.ink});x+=cols[4][1];
    pdf.text(x+8,y+14,t.status==='done'&&t.completedAt?fmtD(localD(t.completedAt)).slice(0,-5):'—',{size:8.5,color:C.gray});
    y+=h;});
  });
  pdf.line(L,y,R,y);y+=16;
 }
 }
 // ---------- footers (every page)
 const total=pdf.page;
 for(let i=1;i<=total;i++){pdf.goto(i);pdf.line(L,H-34,R,H-34,{color:C.line});
  pdf.text(L,H-20,`WorkZen · Work Report · ${user.name||user.username}`,{size:7.5,color:C.mute});
  pdf.text(W/2,H-20,period.label,{size:7.5,color:C.mute,align:'center'});
  pdf.text(R,H-20,`Page ${i} of ${total}`,{size:7.5,bold:true,color:C.gray,align:'right'});}
 return pdf;
}
