import {Donut,HBars,Columns} from './components/Charts.jsx';
import Icon from './components/Icon.jsx';
import {stats,isOverdue,addDays,dstr,todayStr,dueLabel,sortTasks} from './utils.js';
export default function Dashboard({user,tasks,onGo,onAdd}){
 const s=stats(tasks),rate=s.total?Math.round(s.done/s.total*100):0,open=tasks.filter(t=>t.status!=='done');
 const h=new Date().getHours(),greet=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
 const byProj={};open.forEach(t=>byProj[t.project]=(byProj[t.project]||0)+1);
 const proj=Object.entries(byProj).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({label,value}));
 const prio=['High','Medium','Low'].map((p,i)=>({label:p,value:open.filter(t=>t.priority===p).length,color:['#dc2626','#d97706','#0ea5e9'][i]}));
 const soon=sortTasks(open.filter(t=>t.dueDate<=addDays(7)),'due-asc').slice(0,6);
 const days=[...Array(14)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return{key:dstr(d),label:String(d.getDate())};});
 const trend=days.map(d=>({label:d.label,value:tasks.filter(t=>t.completedAt&&dstr(new Date(t.completedAt))===d.key).length}));
 const week=trend.slice(-7).reduce((a,b)=>a+b.value,0);
 return <>
  <div className="phead"><div><h1>{greet}, {user.name.split(' ')[0]}</h1><p className="muted">Here is where your work stands today.</p></div>
   <button className="btn primary" onClick={onAdd}><Icon n="plus"/> Add task</button></div>
  <div className="stats">{[['Total',s.total,'c-dark'],['Pending',s.todo,'c-amber'],['In progress',s.inprogress,'c-blue'],['Done',s.done,'c-green'],['Overdue',s.overdue,'c-red']]
   .map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>
  <div className="dgrid">
   <section className="card c4"><h4>Status overview</h4><div className="donutwrap"><Donut center={rate+'%'} sub="complete" data={[{label:'Pending',value:s.todo,color:'#d97706'},{label:'In progress',value:s.inprogress,color:'#2563eb'},{label:'Done',value:s.done,color:'#059669'}]}/>
    <ul className="legend"><li><i style={{background:'#d97706'}}/>Pending <b>{s.todo}</b></li><li><i style={{background:'#2563eb'}}/>In progress <b>{s.inprogress}</b></li><li><i style={{background:'#059669'}}/>Done <b>{s.done}</b></li></ul></div></section>
   <section className="card c4"><h4>Open tasks by priority</h4>{open.length?<HBars rows={prio}/>:<p className="muted">Nothing open.</p>}</section>
   <section className="card c4"><h4>Open tasks by project</h4>{proj.length?<HBars rows={proj}/>:<p className="muted">No open tasks.</p>}</section>
   <section className="card c7"><div className="chead"><h4>Due soon</h4><button className="link" onClick={()=>onGo('upcoming')}>View upcoming</button></div>
    {soon.length?soon.map(t=><div className="mini" key={t._id}><span className={'dot '+(isOverdue(t)?'bad':t.priority)}/><b>{t.title}</b><small>{t.project}</small><span className={isOverdue(t)?'c-red':'muted'}>{dueLabel(t)}</span></div>)
     :<p className="muted">No tasks due in the next 7 days. 🎉</p>}</section>
   <section className="card c5"><div className="chead"><h4>Completed – last 14 days</h4><span className="badge">{week} this week</span></div><Columns values={trend}/></section>
  </div></>;
}
