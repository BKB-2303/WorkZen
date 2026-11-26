import {useEffect,useState} from 'react';import {api} from './api.js';import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import PeoplePicker from './components/PeoplePicker.jsx';import UserAvatar from './components/UserAvatar.jsx';
import {SharedBrowser} from './Shared.jsx';import HistoryView from './components/HistoryView.jsx';import ChatPanel from './components/ChatPanel.jsx';import Pagination,{usePaged} from './components/Pagination.jsx';import {fmtDate,hue} from './utils.js';

function TeamForm({team,onSave,onClose}){
 const [f,setF]=useState({name:team?.name||'',description:team?.description||''}),[users,setUsers]=useState(null),[sel,setSel]=useState(new Set()),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!team)api('/shares/users').then(setUsers).catch(e=>setErr(e.message));},[]);
 const tog=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');try{await onSave({...f,members:[...sel]});onClose();}catch(x){setErr(x.message);setBusy(false);}};
 return <Modal wide title={team?'Edit team':'Create team'} onClose={onClose}><form className="form" onSubmit={go}>
  <label>Team name<input required autoFocus value={f.name} maxLength={60} onChange={e=>setF({...f,name:e.target.value})} placeholder="e.g. Maintenance Planning"/></label>
  <label>Description (optional)<input value={f.description} maxLength={300} onChange={e=>setF({...f,description:e.target.value})} placeholder="What is this team for?"/></label>
  {!team&&<div><small className="lbl">ADD MEMBERS{sel.size?` (${sel.size})`:''}</small><PeoplePicker users={users} sel={sel} onToggle={tog} empty="No other users yet. Ask the admin to create accounts."/></div>}
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{team?'Save':'Create team'}</button></div></form></Modal>;
}

function AddMembers({team,onDone,onClose}){
 const [users,setUsers]=useState(null),[sel,setSel]=useState(new Set()),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{api('/shares/users').then(setUsers).catch(e=>setErr(e.message));},[]);
 const tog=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
 const go=async()=>{setBusy(true);setErr('');try{onDone(await api(`/teams/${team.id}/members`,{method:'POST',body:{users:[...sel]}}));onClose();}catch(e){setErr(e.message);setBusy(false);}};
 return <Modal title={`Add members to ${team.name}`} onClose={onClose}>
  <PeoplePicker users={users} sel={sel} onToggle={tog} hide={team.members.map(m=>m.id)} empty="Everyone is already in this team."/>
  {err&&<div className="err" style={{marginTop:8}}>{err}</div>}
  <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!sel.size||busy} onClick={go}>Add{sel.size?` (${sel.size})`:''}</button></div></Modal>;
}

function TeamDetail({team,user,say,ask,initialTab,onBack,onChange,onLeft,onDeleted,onTaskCopied,onChat}){
 const [items,setItems]=useState(null),[form,setForm]=useState(false),[add,setAdd]=useState(false),[tab,setTab]=useState(initialTab||'items');
 const mp=usePaged(team.members,{size:8,key:team.id});
 const owner=team.myRole==='owner',manage=owner||team.myRole==='admin';
 useEffect(()=>{api(`/teams/${team.id}/items`).then(setItems).catch(e=>say(e.message));},[team.id]);
 const run=fn=>async(...a)=>{try{await fn(...a);}catch(e){say(e.message);}};
 const kick=m=>ask({title:'Remove member',label:'Remove',message:`${m.name} will lose access to everything shared in “${team.name}”, and what they shared here is removed.`,
  onYes:run(async()=>{onChange(await api(`/teams/${team.id}/members/${m.id}`,{method:'DELETE'}));say('Member removed');})});
 const setRole=run(async(m,role)=>{onChange(await api(`/teams/${team.id}/members/${m.id}`,{method:'PUT',body:{role}}));say('Role updated');});
 const makeOwner=m=>ask({title:'Transfer ownership',label:'Transfer',message:`${m.name} becomes the team owner. You stay an admin.`,onYes:run(async()=>{onChange(await api(`/teams/${team.id}/members/${m.id}`,{method:'PUT',body:{makeOwner:true}}));say('Ownership transferred');})});
 const leave=()=>ask({title:'Leave team',label:'Leave',message:`You will lose access to everything shared in “${team.name}”. Things you shared there are removed.`,onYes:run(async()=>{await api(`/teams/${team.id}/members/${user.id}`,{method:'DELETE'});say('You left the team');onLeft(team.id);})});
 const del=()=>ask({title:'Delete team',message:`“${team.name}” and everything shared in it will be removed for all members. Original items are not deleted.`,onYes:run(async()=>{await api('/teams/'+team.id,{method:'DELETE'});say('Team deleted');onDeleted(team.id);})});
 return <>
  <div className="crumbs"><a onClick={onBack}>Teams</a> › {team.name}</div>
  <div className="phead"><div><h1>{team.name}</h1><p className="muted">{team.description||'No description.'}</p></div>
   <div className="phbtns">{manage&&<button className="btn" onClick={()=>setForm(true)}><Icon n="edit"/> Edit</button>}{manage&&<button className="btn primary" onClick={()=>setAdd(true)}><Icon n="plus"/> Add members</button>}</div></div>
  <div className="panel"><h3><Icon n="users"/> Members <span className="badge">{team.members.length}</span></h3>
   {mp.rows.map(m=><div className="prow" key={m.id}>
    <UserAvatar user={m} className="sm" online={m.online}/>
    <div className="grow"><b>{m.name}{m.id===user.id&&' (you)'}</b><small>@{m.username}</small></div>
    {owner&&m.role!=='owner'?<select className="permsel" value={m.role} onChange={e=>setRole(m,e.target.value)}><option value="member">Member</option><option value="admin">Admin</option></select>
     :<span className={'tag '+(m.role==='member'?'':'st-inprogress')}>{m.role==='owner'?'Owner':m.role==='admin'?'Admin':'Member'}</span>}
    {m.id!==user.id&&<button className="btn small" title={`Private message to ${m.name}`} onClick={()=>onChat({type:'direct',user:m.id},m.name)}><Icon n="chat" s={14}/> Message</button>}
    {owner&&m.role!=='owner'&&<button className="btn small" onClick={()=>makeOwner(m)}>Make owner</button>}
    {manage&&m.id!==user.id&&m.role!=='owner'&&(owner||m.role!=='admin')&&<button className="btn small danger" onClick={()=>kick(m)}>Remove</button>}</div>)}
   <Pagination {...mp} compact label="members"/>
   <div className="phbtns">{!owner&&<button className="btn danger" onClick={leave}>Leave team</button>}{owner&&<button className="btn dangerfill" onClick={del}>Delete team</button>}</div></div>
  <div className="seg tabs three" style={{marginBottom:14}}><button className={tab==='items'?'on':''} onClick={()=>setTab('items')}>Shared items{items?` (${items.length})`:''}</button><button className={tab==='chat'?'on':''} onClick={()=>setTab('chat')}><Icon n="chat" s={14}/> Team chat</button><button className={tab==='act'?'on':''} onClick={()=>setTab('act')}>History</button></div>
  {tab==='items'?<SharedBrowser items={items} setItems={setItems} say={say} ask={ask} onTaskCopied={l=>l.forEach(onTaskCopied)} onChat={onChat} empty={<div className="empty"><b>Nothing shared here yet</b><p>Open any folder, task, note or bookmark, press <b>Share</b>, choose the <b>My teams</b> tab and tick “{team.name}”.</p></div>}/>
   :tab==='chat'?<div className="panel"><ChatPanel key={team.id} chatRef={{type:'team',team:team.id}} say={say} ask={ask} header={false} height="min(70vh,600px)"/></div>
   :<div className="panel"><HistoryView name="team-history" load={p=>api(`/teams/${team.id}/activity?`+p)} empty="No activity yet. Member changes, edits and sharing in this team are listed here."/></div>}
  {form&&<TeamForm team={team} onSave={async d=>{onChange(await api('/teams/'+team.id,{method:'PUT',body:d}));say('Team updated');}} onClose={()=>setForm(false)}/>}
  {add&&<AddMembers team={team} onDone={t=>{onChange(t);say('Members added');}} onClose={()=>setAdd(false)}/>}
 </>;
}

export default function Teams({user,say,ask,onCount,onTaskCopied,onChat}){
 const [teams,setTeams]=useState(null),[sel,setSel]=useState(null),[selTab,setSelTab]=useState('items'),[create,setCreate]=useState(false),[tq,setTq]=useState('');
 const tl=(teams||[]).filter(t=>!tq.trim()||(t.name+' '+t.description).toLowerCase().includes(tq.trim().toLowerCase()));
 const pg=usePaged(tl,{size:12,key:tq,store:'teams'});
 const set=l=>{setTeams(l);onCount?.(l.length);};
 useEffect(()=>{api('/teams').then(set).catch(e=>say(e.message));},[]);
 const replace=t=>setTeams(p=>p.map(x=>x.id===t.id?t:x));
 const drop=id=>{set(teams.filter(t=>t.id!==id));setSel(null);};
 const cur=teams&&teams.find(t=>t.id===sel);
 if(cur)return <TeamDetail key={cur.id+selTab} team={cur} user={user} say={say} ask={ask} initialTab={selTab} onChat={onChat} onBack={()=>setSel(null)} onChange={replace} onLeft={drop} onDeleted={drop} onTaskCopied={onTaskCopied}/>;
 return <>
  <div className="phead"><div><h1>Teams</h1><p className="muted">Create a team, add members, and share work with everyone at once.</p></div>
   <button className="btn primary" onClick={()=>setCreate(true)}><Icon n="plus"/> New team</button></div>
  {teams===null?<div className="empty">Loading…</div>:!teams.length?<div className="empty"><b>No teams yet</b><p>Create a team to share folders, tasks, notes and bookmarks with a group.</p></div>
   :<>{teams.length>6&&<div className="filters"><div className="search"><Icon n="search"/><input placeholder="Search teams" value={tq} onChange={e=>setTq(e.target.value)}/></div></div>}
   {!tl.length?<div className="empty">No teams match.</div>:<div className="fgrid">{pg.rows.map(t=><div className="fcard" key={t.id} role="button" tabIndex={0} onClick={()=>{setSelTab('items');setSel(t.id);}} onKeyDown={e=>e.key==='Enter'&&(setSelTab('items'),setSel(t.id))}>
    <div className="frow"><div className="ficon" style={{background:`hsl(${hue(t.name)} 70% 50% / .16)`,color:`hsl(${hue(t.name)} 60% 45%)`}}><Icon n="users" s={20}/></div><div className="fmeta"><b>{t.name}</b><small>{t.myRole==='owner'?'You own this team':t.myRole==='admin'?'You are an admin':'Member'}</small></div><button className="iconbtn dark fshare" title="Open team chat" aria-label="Open team chat" onClick={e=>{e.stopPropagation();setSelTab('chat');setSel(t.id);}}><Icon n="chat" s={17}/></button></div>
    {t.description&&<p className="muted" style={{margin:'10px 0 0'}}>{t.description}</p>}
    <div className="fstats"><span>Members <b>{t.members.length}</b></span><span>Shared items <b>{t.sharedCount}</b></span><span>Created <b>{fmtDate(String(t.createdAt).slice(0,10))}</b></span></div></div>)}</div>}
   <Pagination {...pg} label="teams"/></>}
  {create&&<TeamForm onSave={async d=>{const t=await api('/teams',{method:'POST',body:d});set([...teams,t].sort((a,b)=>a.name.localeCompare(b.name)));say('Team created');}} onClose={()=>setCreate(false)}/>}
 </>;
}
