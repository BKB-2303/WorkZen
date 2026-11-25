import {useEffect,useMemo,useRef,useState} from 'react';import Icon from './Icon.jsx';import Pagination from './Pagination.jsx';import {ActivityRow,ACTIONS} from './ActivityList.jsx';import {dayLabel,dayKey,fmtDateTime} from '../utils.js';
const GROUPS=[['all','Everything'],['edits','Edits'],['sharing','Sharing'],['access','Access'],['copies','Copies'],['team','Team'],['comments','Comments']];
const RANGES=[['all','Any time'],['today','Today'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['custom','Pick dates…']];
const csv=v=>`"${String(v??'').replace(/"/g,'""')}"`;
// A history screen with search, filters, day headings and pages.
//   load(paramsString) -> Promise<{rows,total,page,pages,limit,people}>      deps = reload when these change
export default function HistoryView({load,deps=[],showTitle=true,compact=false,empty='Nothing here yet.',name='history',pageSize,kinds=true}){
 const [group,setGroup]=useState('all'),[actor,setActor]=useState(''),[kind,setKind]=useState(''),[q,setQ]=useState(''),[qd,setQd]=useState(''),[range,setRange]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [page,setPage]=useState(1),[limit,setLimit]=useState(pageSize||(compact?8:20)),[data,setData]=useState(null),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[tick,setTick]=useState(0),[showF,setShowF]=useState(!compact);
 const people=useRef([]);
 useEffect(()=>{const t=setTimeout(()=>setQd(q.trim()),300);return()=>clearTimeout(t);},[q]);
 const filterKey=[group,actor,kind,qd,range,from,to,limit].join('|');
 useEffect(()=>{setPage(1);},[filterKey,...deps]);
 const params=(extra={})=>{
  const p=new URLSearchParams({page:String(page),limit:String(limit)});
  if(group!=='all')p.set('group',group);if(actor)p.set('actor',actor);if(kind)p.set('kind',kind);if(qd)p.set('q',qd);
  if(range==='custom'){if(from)p.set('from',from);if(to)p.set('to',to);}else if(range!=='all')p.set('range',range);
  Object.entries(extra).forEach(([k,v])=>p.set(k,v));return p.toString();
 };
 useEffect(()=>{let live=true;setBusy(true);setErr('');
  load(params()).then(d=>{if(!live)return;if(d.people?.length)people.current=d.people;setData(d);if(d.page!==page)setPage(d.page);}).catch(e=>live&&setErr(e.message)).finally(()=>live&&setBusy(false));
  return()=>{live=false;};},[page,filterKey,tick,...deps]);
 const groups=useMemo(()=>{const o=[];let last='';for(const a of data?.rows||[]){const k=dayKey(a.at);if(k!==last){o.push({k,label:dayLabel(a.at),rows:[]});last=k;}o[o.length-1].rows.push(a);}return o;},[data]);
 const active=group!=='all'||actor||kind||qd||range!=='all';
 const reset=()=>{setGroup('all');setActor('');setKind('');setQ('');setRange('all');setFrom('');setTo('');};
 const exportCsv=async()=>{
  try{const d=await load(params({all:'1',page:'1'}));
   const rows=[['When','Who','Action','Item','Details','Changes'],...d.rows.map(a=>[fmtDateTime(a.at),a.actor.name,ACTIONS[a.action]||a.action,a.title,a.text,(a.changes||[]).map(c=>`${c.field}: ${c.from?c.from+' -> ':''}${c.to}`).join('; ')])];
   const b=new Blob(['﻿'+rows.map(r=>r.map(csv).join(',')).join('\r\n')],{type:'text/csv'});
   const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=`workzen-${name}-${new Date().toISOString().slice(0,10)}.csv`;l.click();URL.revokeObjectURL(l.href);
  }catch(e){setErr(e.message);}
 };
 return <div className={'hview'+(compact?' compact':'')}>
  <div className="hbar">
   <div className="search"><Icon n="search"/><input placeholder="Search history (person, item, change…)" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <button className={'btn small'+(showF||active?' primary':'')} onClick={()=>setShowF(!showF)} title="Filters"><Icon n="filter" s={14}/> Filters{active?' •':''}</button>
   <button className="btn small" onClick={()=>setTick(t=>t+1)} title="Refresh"><Icon n="refresh" s={14}/></button>
   {!compact&&<button className="btn small" onClick={exportCsv} disabled={!data?.total} title="Download the filtered history as CSV"><Icon n="down" s={14}/> CSV</button>}
  </div>
  {showF&&<div className="hfilters">
   <div className="chips">{GROUPS.map(([k,l])=><button key={k} className={'chip'+(group===k?' on':'')} onClick={()=>setGroup(k)}>{l}</button>)}</div>
   <div className="hsel">
    <select value={actor} onChange={e=>setActor(e.target.value)} aria-label="Person"><option value="">Everyone</option>{people.current.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    {kinds&&<select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Type"><option value="">All types</option><option value="task">Tasks</option><option value="note">Notes</option><option value="bookmark">Bookmarks</option></select>}
    <select value={range} onChange={e=>setRange(e.target.value)} aria-label="When">{RANGES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>
    {range==='custom'&&<><input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)} aria-label="From"/><input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)} aria-label="To"/></>}
    {active&&<button className="linkbtn" onClick={reset}>Clear filters</button>}
   </div></div>}
  {err&&<div className="err">{err}</div>}
  {!data?<div className="muted pad">Loading…</div>
   :!data.rows.length?<div className="muted pad">{active?'No history matches these filters.':empty}</div>
   :<div className={'htimeline'+(busy?' busy':'')}>{groups.map(g=><section key={g.k}><div className="hday"><span>{g.label}</span><i/></div>
    <div className="alist">{g.rows.map(a=><ActivityRow key={a.id} a={a} showTitle={showTitle} time="clock"/>)}</div></section>)}</div>}
  {data&&<Pagination page={data.page} pages={data.pages} total={data.total} size={data.limit} onPage={setPage} onSize={compact?undefined:setLimit} sizes={[10,20,50,100]} compact={compact} label="entries"/>}
 </div>;
}
