import {useMemo,useState} from 'react';import Icon from './components/Icon.jsx';
import {analyse,buildReport,filterTasks,periodRange} from './report/report.js';

const PERIODS=[['month','This month'],['last_month','Last month'],['30','Last 30 days'],['year','This year'],['all','All time'],['custom','Custom range']];
export default function Reports({user,tasks,say}){
 const [kind,setKind]=useState('month'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[details,setDetails]=useState(true),[notes,setNotes]=useState(false),[busy,setBusy]=useState(false);
 const range=useMemo(()=>periodRange(kind,from,to),[kind,from,to]);
 const list=useMemo(()=>filterTasks(tasks,range),[tasks,range]);
 const A=useMemo(()=>analyse(list),[list]);
 const bad=kind==='custom'&&(!from||!to||from>to);
 const make=()=>buildReport({user,tasks:list,period:range,opts:{details,notes}});
 const run=(mode)=>{
  if(bad)return say('Choose a valid start and end date');
  setBusy(true);
  setTimeout(()=>{ // let the button state paint first
   try{
    const pdf=make(),blob=pdf.blob(),url=URL.createObjectURL(blob);
    if(mode==='view'){const w=window.open(url,'_blank');if(!w)say('Pop-up blocked — use Download instead');setTimeout(()=>URL.revokeObjectURL(url),60000);}
    else{const slug=range.label.replace(/\(.*\)/,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'');
     const a=document.createElement('a');a.href=url;a.download=`WorkZen-Report-${user.username}-${slug}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
     say(`Report downloaded · ${pdf.page} page${pdf.page===1?'':'s'}`);}
   }catch(e){say('Could not create the report: '+e.message);}
   setBusy(false);
  },30);
 };
 return <>
  <div className="phead"><div><h1>Reports</h1><p className="muted">Create a professional PDF report of your work.</p></div></div>
  <div className="panel">
   <h3><Icon n="report"/> Report options</h3>
   <div className="chips periods">{PERIODS.map(([k,l])=><button key={k} className={'chip'+(kind===k?' on':'')} onClick={()=>setKind(k)}>{l}</button>)}</div>
   {kind==='custom'&&<div className="grid2"><label className="fld">From<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label className="fld">To<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label></div>}
   <small className="muted">Tasks are included by their <b>due date</b>. Period: <b>{range.label}</b></small>
   <label className="chk"><input type="checkbox" checked={details} onChange={e=>setDetails(e.target.checked)}/> Include the full task list</label>
   <label className="chk" style={{opacity:details?1:.5}}><input type="checkbox" disabled={!details} checked={notes&&details} onChange={e=>setNotes(e.target.checked)}/> Include task notes and checklist progress</label>
  </div>
  <div className="panel">
   <h3><Icon n="chart"/> What’s in this report</h3>
   {!list.length?<div className="muted">No tasks fall in this period. Pick another period above.</div>:<>
    <div className="stats s4 rstats">{[['Tasks',A.total,'c-dark'],['Completed',A.done,'c-green'],['Open',A.open,'c-blue'],['Overdue',A.overdue,A.overdue?'c-red':'c-green']].map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>
    <div className="bar"><i style={{width:A.rate+'%'}}/></div><small className="muted">{A.rate}% complete{A.onTimePct!==null?` · ${A.onTimePct}% of finished tasks were on time`:''}</small></>}
   <ul className="rlist"><li>Cover page with period, name and date</li><li>Key numbers, status chart and priority breakdown</li><li>Work by project and monthly activity</li><li>Automatic insights, overdue and upcoming tasks</li>{details&&<li>Full task list grouped by month</li>}</ul>
   <div className="hbtns"><button className="btn primary" disabled={busy||!list.length||bad} onClick={()=>run('download')}><Icon n="down"/> {busy?'Creating…':'Download PDF report'}</button>
    <button className="btn" disabled={busy||!list.length||bad} onClick={()=>run('view')}><Icon n="eye"/> Preview</button></div>
  </div>
 </>;
}
