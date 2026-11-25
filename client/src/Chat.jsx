import {useCallback,useEffect,useRef,useState} from 'react';import {api} from './api.js';
import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import ChatPanel from './components/ChatPanel.jsx';import Pagination,{usePaged} from './components/Pagination.jsx';
import {hue,ago,chatKey} from './utils.js';
const TABS=[['all','All'],['team','Teams'],['direct','People'],['item','Shared items']];
const KI={team:'users',item:'list',folder:'folder'};
const itemIcon=t=>t.type==='folder'?'folder':({task:'list',note:'note',bookmark:'bookmark'}[t.kind]||'list');

function NewChat({onPick,onClose}){
 const [users,setUsers]=useState(null),[q,setQ]=useState(''),[err,setErr]=useState('');
 useEffect(()=>{api('/shares/users').then(setUsers).catch(e=>setErr(e.message));},[]);
 const n=q.trim().toLowerCase(),list=(users||[]).filter(u=>!n||(u.name+' '+u.username).toLowerCase().includes(n));
 const pg=usePaged(list,{size:8,key:n});
 return <Modal title="New message" onClose={onClose}>
  <div className="search" style={{marginBottom:8}}><Icon n="search"/><input autoFocus placeholder="Search people" value={q} onChange={e=>setQ(e.target.value)}/></div>
  {err&&<div className="err">{err}</div>}
  <div className="plist" style={{maxHeight:'none'}}>{users===null?<div className="muted pad">Loading…</div>:!pg.rows.length?<div className="muted pad">{users.length?'No one matches.':'No other users yet. Ask the admin to create accounts.'}</div>
   :pg.rows.map(u=><button className="prow pick pbtnrow" key={u.id} onClick={()=>onPick(u)}><div className="avatar sm" style={{background:`hsl(${hue(u.username)} 55% 45%)`}}>{(u.name||'?')[0].toUpperCase()}</div><div className="grow"><b>{u.name}</b><small>@{u.username}</small></div><Icon n="chat" s={16}/></button>)}</div>
  <Pagination {...pg} compact/>
 </Modal>;
}

// All conversations: teams, people, shared items and folders
export default function Chat({say,ask,initial,onUnread}){
 const [tab,setTab]=useState('all'),[q,setQ]=useState(''),[qd,setQd]=useState(''),[page,setPage]=useState(1),[data,setData]=useState(null),[sel,setSel]=useState(null),[picker,setPicker]=useState(false);
 useEffect(()=>{if(initial?.ref)setSel({ref:initial.ref,title:initial.title||''});},[initial?.n]);
 useEffect(()=>{const t=setTimeout(()=>setQd(q.trim()),300);return()=>clearTimeout(t);},[q]);
 useEffect(()=>{setPage(1);},[tab,qd]);
 const fetchThreads=useCallback(()=>api(`/chat/threads?type=${tab}&page=${page}&limit=12&q=${encodeURIComponent(qd)}`)
  .then(d=>{setData(d);onUnread?.(d.unread);if(d.page!==page)setPage(d.page);}).catch(e=>say(e.message)),[tab,page,qd]);
 const fetchRef=useRef(fetchThreads);fetchRef.current=fetchThreads;
 useEffect(()=>{fetchThreads();const id=setInterval(()=>document.visibilityState==='visible'&&fetchRef.current(),15000);return()=>clearInterval(id);},[fetchThreads]);
 const cur=sel&&chatKey(sel.ref);
 return <>
  <div className="phead"><div><h1>Chats</h1><p className="muted">Talk with your teams, with one person, or about a shared task, note, bookmark or folder.</p></div>
   <button className="btn primary" onClick={()=>setPicker(true)}><Icon n="plus"/> New message</button></div>
  <div className={'chatwrap'+(sel?' has-sel':'')}>
   <div className="slist clist2">
    <div className="search"><Icon n="search"/><input placeholder="Search chats" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <div className="chips">{TABS.map(([k,l])=><button key={k} className={'chip'+(tab===k?' on':'')} onClick={()=>setTab(k)}>{l}</button>)}</div>
    <div className="srows">{data===null?<div className="muted pad">Loading…</div>:!data.threads.length?<div className="muted pad">{qd?'No chats match.':tab==='direct'?'No private chats yet. Press “New message”.':tab==='item'?'Open a shared item and use its Chat tab to start one.':'Nothing here yet.'}</div>
     :data.threads.map(t=><button key={t.key} className={'srow'+(cur===chatKey(t.ref)?' on':'')} onClick={()=>setSel({ref:t.ref,title:t.title})}>
      <div className="sico" style={{background:`hsl(${hue(t.title)} 55% 45%)`}}>{t.type==='direct'?t.title[0].toUpperCase():<Icon n={t.type==='team'?'users':itemIcon(t)} s={16}/>}</div>
      <div className="smeta"><b>{t.title}</b><small>{t.last?`${t.last.by}: ${t.last.text}`:t.sub}</small>{t.last&&<small className="csub">{t.sub}</small>}</div>
      <div className="cside">{t.last&&<small>{ago(t.last.at)}</small>}{t.unread>0&&<span className="ubadge">{t.unread>99?'99+':t.unread}</span>}</div></button>)}</div>
    {data&&<Pagination page={data.page} pages={data.pages} total={data.total} size={data.limit} onPage={setPage} compact/>}
   </div>
   <div className="chatmain">{sel?<><button className="btn small sback cback" onClick={()=>{setSel(null);fetchThreads();}}>← All chats</button>
     <ChatPanel key={chatKey(sel.ref)} chatRef={sel.ref} say={say} ask={ask} onRead={()=>fetchRef.current()}/></>
    :<div className="empty cpick"><Icon n="chat" s={34}/><b>Pick a conversation</b><p>Choose one on the left, or start a new private message.</p><button className="btn primary" onClick={()=>setPicker(true)}><Icon n="plus"/> New message</button></div>}</div>
  </div>
  {picker&&<NewChat onPick={u=>{setSel({ref:{type:'direct',user:u.id},title:u.name});setPicker(false);}} onClose={()=>setPicker(false)}/>}
 </>;
}
