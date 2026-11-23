import {useCallback,useEffect,useMemo,useRef,useState} from 'react';import {api} from './api.js';
import Shell from './components/Shell.jsx';import Icon from './components/Icon.jsx';
import TaskModal from './components/TaskModal.jsx';import PasswordModal from './components/PasswordModal.jsx';import Confirm from './components/Confirm.jsx';
import Dashboard from './Dashboard.jsx';import Notes from './Notes.jsx';import Vault from './Vault.jsx';import useVault from './useVault.js';import Bookmarks from './Bookmarks.jsx';
import {MONTHS,STATUS,fmtDate,fmtDateTime,isOverdue,dueLabel,stats,todayStr,addDays,sortTasks,SORTS,exportCSV} from './utils.js';

const open=t=>t.status!=='done';
const PERSONAL=['passwords','notes','bookmarks'];
const SMART={
 today:{title:'Today',sub:'Open tasks due today',icon:'cal',f:t=>open(t)&&t.dueDate===todayStr()},
 upcoming:{title:'Upcoming',sub:'Open tasks due in the next 7 days',icon:'clock',f:t=>open(t)&&t.dueDate>todayStr()&&t.dueDate<=addDays(7)},
 overdue:{title:'Overdue',sub:'Open tasks past their due date',icon:'alert',f:isOverdue},
 high:{title:'High priority',sub:'Open tasks marked high priority',icon:'flag',f:t=>open(t)&&t.priority==='High'}
};

function Stats({s}){return <div className="stats">{[['Total',s.total,'c-dark'],['To do',s.todo,'c-amber'],['In progress',s.inprogress,'c-blue'],['Done',s.done,'c-green'],['Overdue',s.overdue,'c-red']]
 .map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>;}

function FolderCard({label,sub,list,onClick}){
 const s=stats(list),pct=s.total?Math.round(s.done/s.total*100):0;
 return <button className="fcard" onClick={onClick}>
  <div className="frow"><div className="ficon"><Icon n="folder" s={20}/></div><div className="fmeta"><b>{label}</b><small>{sub}</small></div><span className="badge">{s.total}</span></div>
  <div className="fstats"><span>Done <b>{s.done}</b></span><span>Open <b>{s.total-s.done}</b></span><span>Overdue <b className={s.overdue?'c-red':''}>{s.overdue}</b></span></div>
  <div className="bar"><i style={{width:pct+'%'}}/></div></button>;
}

function TaskRow({t,onStatus,onChecklist,onEdit,onDup,onDelete}){
 const [isOpen,setOpen]=useState(false);const od=isOverdue(t),done=t.status==='done';
 const cl=t.checklist||[],cdone=cl.filter(c=>c.done).length;
 return <div className={'trow s-'+(od?'overdue':t.status)+(isOpen?' open':'')}>
  <div className="thead" onClick={()=>setOpen(!isOpen)}>
   <button className={'check'+(done?' on':'')} title={done?'Reopen':'Mark done'} onClick={e=>{e.stopPropagation();onStatus(done?'todo':'done');}}>{done&&<Icon n="check" s={13}/>}</button>
   <b className={done?'strike':''}>{t.title}</b><span className="chev"><Icon n="chev"/></span></div>
  {isOpen&&<div className="tbody">
   <p className={'tnotes'+(t.notes?'':' muted')}>{t.notes||'No notes added.'}</p>
   <div className="tags"><span className={'tag st-'+t.status}>{STATUS[t.status]}</span><span className={'tag pr-'+t.priority}>{t.priority}</span><span className="tag">{t.project}</span>{od&&<span className="tag st-overdue">Overdue</span>}</div>
   <div className="meta"><div><small>DUE</small><span className={od?'c-red':''}>{fmtDate(t.dueDate)} · {dueLabel(t)}</span></div><div><small>CREATED</small><span>{fmtDateTime(t.createdAt)}</span></div>{done&&<div><small>COMPLETED</small><span>{fmtDateTime(t.completedAt)}</span></div>}</div>
   {cl.length>0&&<div className="cl"><div className="clhead"><small>CHECKLIST · {cdone}/{cl.length}</small><div className="bar slim"><i style={{width:cdone/cl.length*100+'%'}}/></div></div>
    {cl.map((c,i)=><label className="citem" key={i}><input type="checkbox" checked={c.done} onChange={()=>onChecklist(cl.map((x,j)=>j===i?{...x,done:!x.done}:x))}/><span className={c.done?'strike':''}>{c.text}</span></label>)}</div>}
   <div className="trow-actions"><div className="seg">{Object.entries(STATUS).map(([k,v])=><button key={k} className={t.status===k?'on':''} onClick={()=>t.status!==k&&onStatus(k)}>{v}</button>)}</div>
    <span className="grow"/><button className="btn small" onClick={onEdit}>Edit</button><button className="btn small" onClick={onDup}><Icon n="copy" s={14}/> Duplicate</button><button className="btn small danger" onClick={onDelete}>Delete</button></div>
  </div>}</div>;
}

export default function Workspace({user,onLogout,theme,onTheme}){
 const [tasks,setTasks]=useState([]);const [loading,setLoading]=useState(true);
 const [nav,setNav]=useState({view:'dashboard',y:null,m:null});
 const [q,setQ]=useState(''),[st,setSt]=useState('all'),[proj,setProj]=useState('all'),[pri,setPri]=useState('all'),[sort,setSort]=useState('due-desc');
 const [modal,setModal]=useState(null),[pw,setPw]=useState(false),[ask,setAsk]=useState(null),[toast,setToast]=useState('');
 const searchRef=useRef(null);const navRef=useRef(nav);navRef.current=nav;const vault=useVault();
 useEffect(()=>{api('/tasks').then(setTasks).finally(()=>setLoading(false));},[]);
 const say=m=>{setToast(m);setTimeout(()=>setToast(''),2200);};
 const go=useCallback((view,y=null,m=null)=>{setNav({view,y,m});setSort(view==='work'?'due-desc':'due-asc');},[]);
 useEffect(()=>{const h=e=>{if(e.target.matches('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='n'&&!PERSONAL.includes(navRef.current.view)){e.preventDefault();setModal(m=>m||{});}if(e.key==='/'){e.preventDefault();searchRef.current?.focus();}};
  window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[]);

 const tree=useMemo(()=>{const t={};for(const k of tasks){const y=k.dueDate.slice(0,4),m=+k.dueDate.slice(5,7)-1;((t[y]??={})[m]??=[]).push(k);}return t;},[tasks]);
 const years=Object.keys(tree).sort().reverse();
 const projects=useMemo(()=>[...new Set(tasks.map(t=>t.project))].sort(),[tasks]);
 const smart=SMART[nav.view];
 const scoped=smart?tasks.filter(smart.f):tasks.filter(t=>(nav.y===null||t.dueDate.startsWith(nav.y))&&(nav.m===null||+t.dueDate.slice(5,7)-1===nav.m));
 const filterOn=q||st!=='all'||proj!=='all'||pri!=='all';
 const needle=q.toLowerCase();
 const shown=sortTasks(scoped.filter(t=>(st==='all'||t.status===st)&&(proj==='all'||t.project===proj)&&(pri==='all'||t.priority===pri)&&(!needle||(t.title+' '+t.notes+' '+t.project).toLowerCase().includes(needle))),sort);
 const showCards=nav.view==='work'&&!filterOn&&nav.m===null&&tasks.length>0;

 const safe=fn=>async(...a)=>{try{return await fn(...a);}catch(e){say(e.message);}};
 const replace=u=>setTasks(p=>p.map(x=>x._id===u._id?u:x));
 const save=async(data,ex)=>{if(ex?._id){replace(await api('/tasks/'+ex._id,{method:'PUT',body:data}));say('Task updated');}
  else{const c=await api('/tasks',{method:'POST',body:data});setTasks(p=>[c,...p]);say('Task added');}};
 const patch=safe(async(t,body)=>replace(await api('/tasks/'+t._id,{method:'PUT',body})));
 const dup=safe(async t=>{const c=await api('/tasks',{method:'POST',body:{title:t.title+' (copy)',notes:t.notes,project:t.project,priority:t.priority,status:'todo',dueDate:t.dueDate,checklist:(t.checklist||[]).map(c=>({text:c.text,done:false}))}});setTasks(p=>[c,...p]);say('Task duplicated');});
 const del=safe(async t=>{await api('/tasks/'+t._id,{method:'DELETE'});setTasks(p=>p.filter(x=>x._id!==t._id));say('Task deleted');});

 const cards=nav.y===null
  ?years.map(y=>{const n=Object.keys(tree[y]).length;return{key:y,label:y,sub:`${n} month folder${n>1?'s':''}`,list:Object.values(tree[y]).flat(),go:()=>go('work',y)};})
  :Object.keys(tree[nav.y]||{}).map(Number).sort((a,b)=>b-a).map(m=>({key:m,label:MONTHS[m],sub:`${tree[nav.y][m].length} task${tree[nav.y][m].length>1?'s':''}`,list:tree[nav.y][m],go:()=>go('work',nav.y,m)}));

 const title=smart?smart.title:nav.m!==null?`${MONTHS[nav.m]} ${nav.y}`:nav.y||'All work';
 const subtitle=smart?smart.sub:nav.m!==null?'Month folder':nav.y?'Month folders in this year':'Every task grouped into year and month folders.';

 const sidebar=<nav className="tree">
  <button className={'nitem'+(nav.view==='dashboard'?' on':'')} onClick={()=>go('dashboard')}><Icon n="chart"/><span>Dashboard</span></button>
  <div className="navlabel">PERSONAL</div>
  {[['passwords','Saved passwords','lock'],['notes','Notes','note'],['bookmarks','Bookmarks','bookmark']].map(([k,l,i])=><button key={k} className={'nitem'+(nav.view===k?' on':'')} onClick={()=>go(k)}><Icon n={k==='passwords'&&vault.unlocked?'unlock':i}/><span>{l}</span></button>)}
  <div className="navlabel">SMART LISTS</div>
  {Object.entries(SMART).map(([k,v])=><button key={k} className={'nitem'+(nav.view===k?' on':'')} onClick={()=>go(k)}><Icon n={v.icon}/><span>{v.title}</span><em className={k==='overdue'&&tasks.some(isOverdue)?'warn':''}>{tasks.filter(v.f).length}</em></button>)}
  <div className="navlabel">WORK FOLDERS</div>
  <button className={'nitem'+(nav.view==='work'&&nav.y===null?' on':'')} onClick={()=>go('work')}><Icon n="grid"/><span>All work</span><em>{tasks.length}</em></button>
  {years.map(y=><div key={y}>
   <button className={'nitem'+(nav.view==='work'&&nav.y===y&&nav.m===null?' on':'')} onClick={()=>go('work',y)}><Icon n="folder"/><span>{y}</span><em>{Object.values(tree[y]).flat().length}</em></button>
   {nav.view==='work'&&nav.y===y&&<div className="sub">{Object.keys(tree[y]).map(Number).sort((a,b)=>b-a).map(m=>
    <button key={m} className={'nitem small'+(nav.m===m?' on':'')} onClick={()=>go('work',y,m)}><span>{MONTHS[m]}</span><em>{tree[y][m].length}</em></button>)}</div>}</div>)}
  <div className="kbd">Press <kbd>N</kbd> new task · <kbd>/</kbd> search</div></nav>;

 const tab=(k,l,i,fn)=><button key={k} className={'btab'+((k==='work'?(nav.view==='work'||smart):nav.view===k)?' on':'')} onClick={fn}><Icon n={i} s={20}/><span>{l}</span></button>;
 const bottom=<nav className="bottombar">{tab('dashboard','Home','home',()=>go('dashboard'))}{tab('work','Tasks','list',()=>go('work'))}
  <button className="btab fab" aria-label="Add task" onClick={()=>setModal({})}><Icon n="plus" s={24}/></button>{tab('notes','Notes','note',()=>go('notes'))}{tab('bookmarks','Links','bookmark',()=>go('bookmarks'))}</nav>;
 return <Shell user={user} nav={sidebar} bottom={bottom} navKey={nav.view+nav.y+nav.m} onLogout={onLogout} onPassword={()=>setPw(true)} theme={theme} onTheme={onTheme}>
  {nav.view==='bookmarks'?<Bookmarks say={say} ask={setAsk}/>:nav.view==='notes'?<Notes say={say} ask={setAsk}/>:nav.view==='passwords'?<Vault vault={vault} say={say} ask={setAsk}/>:nav.view==='dashboard'?(loading?<div className="empty">Loading…</div>:<Dashboard user={user} tasks={tasks} onGo={go} onAdd={()=>setModal({})}/>):<>
  <div className="crumbs"><a onClick={()=>go('dashboard')}>Dashboard</a> › {smart?smart.title:<><a onClick={()=>go('work')}>All work</a>{nav.y&&<> › <a onClick={()=>go('work',nav.y)}>{nav.y}</a></>}{nav.m!==null&&<> › {MONTHS[nav.m]}</>}</>}</div>
  <div className="phead"><div><h1>{title}</h1><p className="muted">{subtitle}</p></div><button className="btn primary" onClick={()=>setModal({})}><Icon n="plus"/> Add task</button></div>
  <Stats s={stats(scoped)}/>
  <div className="filters"><div className="search"><Icon n="search"/><input ref={searchRef} placeholder="Search title, notes or project  ( / )" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={st} onChange={e=>setSt(e.target.value)}><option value="all">All statuses</option><option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option></select>
   <select value={pri} onChange={e=>setPri(e.target.value)}><option value="all">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
   <select value={proj} onChange={e=>setProj(e.target.value)}><option value="all">All projects</option>{projects.map(p=><option key={p}>{p}</option>)}</select>
   {!showCards&&<select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(SORTS).map(([k,v])=><option key={k} value={k}>Sort: {v}</option>)}</select>}
   <button className="btn" title="Export the tasks shown to CSV" disabled={!shown.length} onClick={()=>exportCSV(shown)}><Icon n="down"/> Export</button></div>
  {loading?<div className="empty">Loading…</div>
  :!tasks.length?<div className="empty"><b>No tasks yet</b><p>Click “Add task” or press N to create your first one.</p></div>
  :showCards?<><div className="shead"><h3>{nav.y?'Month folders':'Year folders'}</h3><small>{cards.length} folder{cards.length>1?'s':''}</small></div>
    <div className="fgrid">{cards.map(c=><FolderCard key={c.key} label={c.label} sub={c.sub} list={c.list} onClick={c.go}/>)}</div></>
  :<><div className="shead"><h3>Tasks</h3><small>{shown.length} shown</small></div>
    {shown.length?shown.map(t=><TaskRow key={t._id} t={t} onStatus={s=>patch(t,{status:s})} onChecklist={c=>patch(t,{checklist:c})} onEdit={()=>setModal(t)} onDup={()=>dup(t)}
      onDelete={()=>setAsk({title:'Delete task',message:`“${t.title}” will be permanently deleted.`,onYes:()=>del(t)})}/>):<div className="empty">No tasks match.</div>}</>}
  </>}
  {modal&&<TaskModal task={modal} projects={projects} onSave={d=>save(d,modal)} onClose={()=>setModal(null)}/>}
  {pw&&<PasswordModal title="Change password" needCurrent onSubmit={({current,password})=>api('/auth/password',{method:'PUT',body:{current,password}}).then(()=>say('Password changed'))} onClose={()=>setPw(false)}/>}
  {ask&&<Confirm {...ask} onClose={()=>setAsk(null)}/>}
  {toast&&<div className="toast">{toast}</div>}
 </Shell>;
}
