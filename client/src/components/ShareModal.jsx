import {useEffect,useMemo,useState} from 'react';import {api} from '../api.js';import Modal from './Modal.jsx';import Icon from './Icon.jsx';
const KIND={task:'task',note:'note',bookmark:'bookmark'};
export default function ShareModal({kind,item,title,say,onClose}){
 const [users,setUsers]=useState(null),[have,setHave]=useState([]),[pick,setPick]=useState(new Set()),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 const load=()=>Promise.all([api('/shares/users'),api(`/shares/item/${kind}/${item._id}`)]).then(([u,h])=>{setUsers(u);setHave(h);}).catch(e=>setErr(e.message));
 useEffect(()=>{load();},[]);
 const haveIds=new Set(have.map(h=>String(h.to.id)));
 const list=useMemo(()=>(users||[]).filter(u=>!haveIds.has(String(u.id))&&(!q||(u.name+' '+u.username).toLowerCase().includes(q.toLowerCase()))),[users,have,q]);
 const tog=id=>setPick(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
 const share=async()=>{setBusy(true);setErr('');
  try{await api('/shares',{method:'POST',body:{kind,itemId:item._id,to:[...pick]}});say(`Shared with ${pick.size} ${pick.size===1?'person':'people'}`);setPick(new Set());await load();}
  catch(e){setErr(e.message);}setBusy(false);};
 const stop=async h=>{try{await api('/shares/'+h.id,{method:'DELETE'});setHave(p=>p.filter(x=>x.id!==h.id));say('Sharing stopped');}catch(e){setErr(e.message);}};
 return <Modal title={`Share ${KIND[kind]}`} onClose={onClose}>
  <p className="muted" style={{marginTop:0}}><b style={{color:'var(--text)'}}>{title}</b><br/>They can view it and save their own copy. They can’t change your original.</p>
  {have.length>0&&<div className="sharebox"><small className="lbl">SHARED WITH</small>{have.map(h=><div className="prow" key={h.id}><div className="avatar sm">{(h.to.name||'?')[0].toUpperCase()}</div><div className="grow"><b>{h.to.name}</b><small>@{h.to.username}</small></div><button className="btn small danger" onClick={()=>stop(h)}>Stop</button></div>)}</div>}
  <small className="lbl">SHARE WITH</small>
  <div className="search" style={{margin:'6px 0 8px'}}><Icon n="search"/><input placeholder="Search people" value={q} onChange={e=>setQ(e.target.value)}/></div>
  <div className="plist">{users===null?<div className="muted pad">Loading…</div>:!users.length?<div className="muted pad">No other users yet. Ask the admin to create accounts.</div>
   :!list.length?<div className="muted pad">{q?'No one matches.':'Already shared with everyone.'}</div>
   :list.map(u=><label className="prow pick" key={u.id}><input type="checkbox" checked={pick.has(u.id)} onChange={()=>tog(u.id)}/><div className="avatar sm">{(u.name||'?')[0].toUpperCase()}</div><div className="grow"><b>{u.name}</b><small>@{u.username}</small></div></label>)}</div>
  {err&&<div className="err" style={{marginTop:8}}>{err}</div>}
  <div className="actions"><button className="btn" onClick={onClose}>Close</button><button className="btn primary" disabled={!pick.size||busy} onClick={share}><Icon n="share" s={14}/> Share{pick.size?` (${pick.size})`:''}</button></div>
 </Modal>;
}
