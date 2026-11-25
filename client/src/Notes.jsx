import {useEffect,useMemo,useState} from 'react';import {api} from './api.js';
import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import {fmtDateTime} from './utils.js';
const COLORS=['default','yellow','green','blue','pink','purple'];

function NoteModal({item,cats,onSave,onClose}){
 const [f,setF]=useState({title:'',content:'',category:'General',color:'default',pinned:false,...item}),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');
  try{await onSave({title:f.title,content:f.content,category:f.category,color:f.color,pinned:f.pinned});onClose();}catch(x){setErr(x.message);setBusy(false);}};
 return <Modal wide title={item?._id?'Edit note':'New note'} onClose={onClose}><form className="form" onSubmit={go}>
  <label>Title<input autoFocus={!item?._id} value={f.title} onChange={set('title')} maxLength={120} placeholder="Note title"/></label>
  <label>Note<textarea className="notearea" rows="10" value={f.content} onChange={set('content')} placeholder="Write your note here…"/></label>
  <div className="grid2"><label>Category<input list="ncats" value={f.category} onChange={set('category')}/><datalist id="ncats">{cats.map(c=><option key={c} value={c}/>)}</datalist></label>
   <label className="chk fav"><input type="checkbox" checked={f.pinned} onChange={e=>setF({...f,pinned:e.target.checked})}/> Pin to top</label></div>
  <div className="colors" role="radiogroup" aria-label="Note colour">{COLORS.map(c=><button type="button" key={c} aria-label={c} className={'swatch nc-'+c+(f.color===c?' on':'')} onClick={()=>setF({...f,color:c})}>{f.color===c&&<Icon n="check" s={14}/>}</button>)}</div>
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save note</button></div>
 </form></Modal>;
}

export default function Notes({say,ask,onShare}){
 const [list,setList]=useState([]),[loading,setLoading]=useState(true),[q,setQ]=useState(''),[cat,setCat]=useState('all'),[modal,setModal]=useState(null);
 useEffect(()=>{api('/notes').then(setList).catch(e=>say(e.message)).finally(()=>setLoading(false));},[]);
 const cats=useMemo(()=>[...new Set(list.map(n=>n.category))].sort(),[list]);
 const needle=q.toLowerCase();
 const shown=list.filter(n=>(cat==='all'||n.category===cat)&&(!needle||(n.title+' '+n.content+' '+n.category).toLowerCase().includes(needle)))
  .sort((a,b)=>(b.pinned-a.pinned)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
 const rep=u=>setList(p=>p.map(x=>x._id===u._id?u:x));
 const save=async(d,old)=>{
  if(old?._id){rep(await api('/notes/'+old._id,{method:'PUT',body:d}));say('Note saved');}
  else{const c=await api('/notes',{method:'POST',body:d});setList(p=>[c,...p]);say('Note added');}
 };
 const pin=n=>api('/notes/'+n._id,{method:'PUT',body:{pinned:!n.pinned}}).then(rep).catch(e=>say(e.message));
 const del=n=>ask({title:'Delete note',message:`“${n.title||'Untitled note'}” will be permanently deleted.`,onYes:()=>api('/notes/'+n._id,{method:'DELETE'}).then(()=>{setList(p=>p.filter(x=>x._id!==n._id));say('Note deleted');}).catch(e=>say(e.message))});
 return <>
  <div className="phead"><div><h1>Notes</h1><p className="muted">Quick notes, always open and ready.</p></div>
   <button className="btn primary addbtn" onClick={()=>setModal({})}><Icon n="plus"/><span>Add note</span></button></div>
  <div className="stats s3">{[['Notes',list.length,'c-dark'],['Pinned',list.filter(n=>n.pinned).length,'c-amber'],['Categories',cats.length,'c-blue']].map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>
  <div className="filters"><div className="search"><Icon n="search"/><input placeholder="Search notes" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={cat} onChange={e=>setCat(e.target.value)}><option value="all">All categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div>
  {loading?<div className="empty">Loading…</div>:!list.length?<div className="empty"><b>No notes yet</b><p>Tap “Add note” to write your first one.</p></div>
  :!shown.length?<div className="empty">No notes match.</div>
  :<div className="vgrid">{shown.map(n=><div className={'vcard note nc-'+(n.color||'default')} key={n._id} onClick={()=>setModal(n)}>
   <div className="vtop"><div className="vmeta"><b>{n.title||'Untitled note'}</b><small>{fmtDateTime(n.updatedAt)}</small></div>
    <button className={'star'+(n.pinned?' on':'')} title={n.pinned?'Unpin':'Pin'} onClick={e=>{e.stopPropagation();pin(n);}}><Icon n="star" f={n.pinned}/></button></div>
   {n.content&&<p className="vnotes">{n.content.slice(0,240)}{n.content.length>240?'…':''}</p>}
   <div className="vfoot"><span className="tag">{n.category}</span><span className="grow"/>
    <button className="iconbtn dark" title="Share" onClick={e=>{e.stopPropagation();onShare(n);}}><Icon n="share"/></button>
    <button className="iconbtn dark" title="Edit" onClick={e=>{e.stopPropagation();setModal(n);}}><Icon n="edit"/></button>
    <button className="iconbtn dark" title="Delete" onClick={e=>{e.stopPropagation();del(n);}}><Icon n="trash"/></button></div></div>)}</div>}
  {modal&&<NoteModal item={modal._id?modal:null} cats={cats} onSave={d=>save(d,modal)} onClose={()=>setModal(null)}/>}
 </>;
}
