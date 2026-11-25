import {useEffect,useState} from 'react';import {api} from './api.js';import Icon from './components/Icon.jsx';
import {STATUS,fmtDate,fmtDateTime,host,hue,dueLabel,isOverdue} from './utils.js';
const KL={task:'Task',note:'Note',bookmark:'Bookmark'};

function Body({kind,item}){
 const [more,setMore]=useState(false);
 if(kind==='task'){const cl=item.checklist||[];return <>
  <div className="tags"><span className={'tag st-'+item.status}>{STATUS[item.status]}</span><span className={'tag pr-'+item.priority}>{item.priority}</span><span className="tag">{item.project}</span>{isOverdue(item)&&<span className="tag st-overdue">Overdue</span>}</div>
  <small className="muted">Due {fmtDate(item.dueDate)} · {dueLabel(item)}</small>
  {item.notes&&<p className="vnotes full">{item.notes}</p>}
  {cl.length>0&&<div className="cl">{cl.map((c,i)=><div className="citem" key={i}><Icon n={c.done?'check':'list'} s={13}/><span className={c.done?'strike':''}>{c.text}</span></div>)}</div>}</>;}
 if(kind==='note'){const long=item.content.length>260;return <>
  <p className={'vnotes full'+(more?' all':'')}>{more||!long?item.content:item.content.slice(0,260)+'…'}</p>
  {long&&<button className="linkbtn" onClick={()=>setMore(!more)}>{more?'Show less':'Read more'}</button>}
  <div className="tags"><span className="tag">{item.category}</span></div></>;}
 return <>{item.description&&<p className="vnotes full">{item.description}</p>}<div className="tags"><span className="tag">{item.category}</span></div>
  <a className="btn small" href={item.url} target="_blank" rel="noopener noreferrer"><Icon n="link" s={14}/> Open {host(item.url)}</a></>;
}

export default function Shared({say,ask,onCount,onTaskCopied}){
 const [tab,setTab]=useState('in'),[inb,setInb]=useState(null),[sent,setSent]=useState(null),[f,setF]=useState('all');
 const loadIn=()=>api('/shares/received').then(l=>{setInb(l);onCount?.(l.length);}).catch(e=>say(e.message));
 const loadOut=()=>api('/shares/sent').then(setSent).catch(e=>say(e.message));
 useEffect(()=>{loadIn();loadOut();},[]);
 const copy=async s=>{try{const r=await api(`/shares/${s.id}/copy`,{method:'POST'});if(s.kind==='task')onTaskCopied?.(r.item);say(`Saved a copy to your ${s.kind==='bookmark'?'bookmarks':s.kind+'s'}`);}catch(e){say(e.message);}};
 const remove=s=>ask({title:'Remove from shared',message:`“${s.item.title||'Untitled note'}” from ${s.from.name} will be removed from your list. They keep their original.`,label:'Remove',onYes:()=>api('/shares/'+s.id,{method:'DELETE'}).then(()=>{const n=inb.filter(x=>x.id!==s.id);setInb(n);onCount?.(n.length);say('Removed');}).catch(e=>say(e.message))});
 const unshare=s=>api('/shares/'+s.id,{method:'DELETE'}).then(()=>{setSent(p=>p.filter(x=>x.id!==s.id));say('Sharing stopped');}).catch(e=>say(e.message));
 const shown=(inb||[]).filter(s=>f==='all'||s.kind===f);
 return <>
  <div className="phead"><div><h1>Shared</h1><p className="muted">Things shared between you and other users.</p></div></div>
  <div className="seg tabs"><button className={tab==='in'?'on':''} onClick={()=>setTab('in')}>Shared with me{inb?` (${inb.length})`:''}</button><button className={tab==='out'?'on':''} onClick={()=>setTab('out')}>Shared by me{sent?` (${sent.length})`:''}</button></div>
  {tab==='in'?<>
   <div className="chips" style={{margin:'12px 0'}}>{[['all','All'],['task','Tasks'],['note','Notes'],['bookmark','Bookmarks']].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setF(k)}>{l}</button>)}</div>
   {inb===null?<div className="empty">Loading…</div>:!shown.length?<div className="empty"><b>Nothing shared with you yet</b><p>When someone shares a task, note or bookmark with you, it appears here.</p></div>
   :<div className="vgrid">{shown.map(s=><div className={'vcard sh'+(s.kind==='note'?' nc-'+(s.item.color||'default'):'')} key={s.id}>
    <div className="vtop"><div className="avatar sm" style={{background:`hsl(${hue(s.from.username)} 55% 45%)`}}>{(s.from.name||'?')[0].toUpperCase()}</div>
     <div className="vmeta"><b>{s.item.title||'Untitled note'}</b><small>{KL[s.kind]} from {s.from.name} · {fmtDateTime(s.sharedAt)}</small></div></div>
    <Body kind={s.kind} item={s.item}/>
    <div className="vfoot"><span className="grow"/><button className="btn small" onClick={()=>copy(s)}><Icon n="copy" s={14}/> Save a copy</button><button className="iconbtn dark" title="Remove from my list" onClick={()=>remove(s)}><Icon n="trash"/></button></div></div>)}</div>}
  </>:<div style={{marginTop:12}}>{sent===null?<div className="empty">Loading…</div>:!sent.length?<div className="empty"><b>You haven’t shared anything</b><p>Use the share <Icon n="share" s={14}/> button on a task, note or bookmark.</p></div>
   :<div className="panel">{sent.map(s=><div className="prow" key={s.id}><span className="tag">{KL[s.kind]}</span><div className="grow"><b>{s.title}</b><small>with {s.to.name} (@{s.to.username}) · {fmtDateTime(s.sharedAt)}</small></div><button className="btn small danger" onClick={()=>unshare(s)}>Stop sharing</button></div>)}</div>}</div>}
 </>;
}
