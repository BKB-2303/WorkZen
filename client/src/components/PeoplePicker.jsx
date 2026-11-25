import {useMemo,useState} from 'react';import Icon from './Icon.jsx';import Pagination,{usePaged} from './Pagination.jsx';
// Searchable checklist of people. `users` = [{id,name,username}], `sel` = Set of ids
export default function PeoplePicker({users,sel,onToggle,empty='No one to show.',hide=[]}){
 const [q,setQ]=useState('');
 const hidden=new Set(hide.map(String));
 const list=useMemo(()=>(users||[]).filter(u=>!hidden.has(String(u.id))&&(!q||(u.name+' '+u.username).toLowerCase().includes(q.toLowerCase()))),[users,q,hide]);
 const pg=usePaged(list,{size:10,key:q});
 return <>
  <div className="search" style={{margin:'6px 0 8px'}}><Icon n="search"/><input placeholder="Search people" value={q} onChange={e=>setQ(e.target.value)}/></div>
  <div className="plist">{users===null?<div className="muted pad">Loading…</div>:!list.length?<div className="muted pad">{q?'No one matches.':empty}</div>
   :pg.rows.map(u=><label className="prow pick" key={u.id}><input type="checkbox" checked={sel.has(u.id)} onChange={()=>onToggle(u.id)}/><div className="avatar sm">{(u.name||'?')[0].toUpperCase()}</div><div className="grow"><b>{u.name}</b><small>@{u.username}</small></div></label>)}</div>
  <Pagination {...pg} compact/>
 </>;
}
