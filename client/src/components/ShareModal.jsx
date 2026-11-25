import {useEffect,useState} from 'react';import {api} from '../api.js';import Modal from './Modal.jsx';import Icon from './Icon.jsx';import PeoplePicker from './PeoplePicker.jsx';import HistoryView from './HistoryView.jsx';import {ChatModal} from './ChatPanel.jsx';
const KIND={task:'task',note:'note',bookmark:'bookmark',folder:'folder'};
// kind: task | note | bookmark (pass `item`)  or  folder (pass `folder` = {year,month,project})
export default function ShareModal({kind,item,folder,title,say,onClose}){
 const [tab,setTab]=useState('people'),[users,setUsers]=useState(null),[teams,setTeams]=useState(null),[have,setHave]=useState([]);
 const [pu,setPu]=useState(new Set()),[pt,setPt]=useState(new Set()),[perm,setPerm]=useState('view'),[copy,setCopy]=useState(false),[exp,setExp]=useState('0'),[showH,setShowH]=useState(false),[chat,setChat]=useState(false),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 const qs=new URLSearchParams({kind});
 if(kind==='folder'){qs.set('year',folder.year??'');qs.set('month',folder.month??'');qs.set('project',folder.project??'');}else qs.set('item',item._id);
 const load=()=>Promise.all([api('/shares/users'),api('/teams'),api('/shares/for?'+qs)]).then(([u,t,h])=>{setUsers(u);setTeams(t);setHave(h);}).catch(e=>setErr(e.message));
 useEffect(()=>{load();},[]);
 const tog=(set,fn)=>id=>fn(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
 const haveU=have.filter(h=>h.to).map(h=>h.to.id),haveT=have.filter(h=>h.team).map(h=>h.team.id);
 const total=pu.size+pt.size;
 const share=async()=>{setBusy(true);setErr('');
  try{await api('/shares',{method:'POST',body:{kind,itemId:item?._id,folder,to:[...pu],teams:[...pt],perm,allowCopy:copy,expiresInDays:+exp}});
   say(`Shared with ${total} ${total===1?'recipient':'recipients'}`);setPu(new Set());setPt(new Set());await load();}
  catch(e){setErr(e.message);}setBusy(false);};
 const stop=async h=>{try{await api('/shares/'+h.id,{method:'DELETE'});setHave(p=>p.filter(x=>x.id!==h.id));say('Sharing stopped');}catch(e){setErr(e.message);}};
 const change=async(h,p)=>{try{await api('/shares/'+h.id,{method:'PUT',body:{perm:p}});setHave(l=>l.map(x=>x.id===h.id?{...x,perm:p}:x));}catch(e){setErr(e.message);}};
 return <Modal wide title={`Share ${KIND[kind]}`} onClose={onClose}>
  <p className="muted" style={{marginTop:0}}><b style={{color:'var(--text)'}}>{title}</b><br/>
   {kind==='folder'?'Everything inside this folder is shared, including tasks you add later.':'Pick who can open this and what they may do.'}</p>
  {have.length>0&&<div className="sharebox"><small className="lbl">ALREADY SHARED WITH</small>{have.map(h=><div className="prow" key={h.id}>
   <div className="avatar sm">{h.team?<Icon n="users" s={15}/>:(h.to.name||'?')[0].toUpperCase()}</div>
   <div className="grow"><b>{h.team?h.team.name:h.to.name}</b><small>{h.team?'Team':'@'+h.to.username}{h.canCopy?' · can copy':''}{h.expiresAt?' · until '+new Date(h.expiresAt).toLocaleDateString():''}</small></div>
   <select className="permsel" value={h.perm} onChange={e=>change(h,e.target.value)}><option value="view">Can view</option><option value="edit">Can edit</option></select>
   <button className="btn small danger" onClick={()=>stop(h)}>Stop</button></div>)}</div>}
  <div className="seg tabs" style={{marginBottom:8}}><button className={tab==='people'?'on':''} onClick={()=>setTab('people')}>People{pu.size?` (${pu.size})`:''}</button><button className={tab==='teams'?'on':''} onClick={()=>setTab('teams')}>My teams{pt.size?` (${pt.size})`:''}</button></div>
  {tab==='people'
   ?<PeoplePicker users={users} sel={pu} onToggle={tog(pu,setPu)} hide={haveU} empty={users&&!users.length?'No other users yet. Ask the admin to create accounts.':'Already shared with everyone.'}/>
   :<div className="plist">{teams===null?<div className="muted pad">Loading…</div>:!teams.length?<div className="muted pad">You are not in any team yet. Create one from the Teams page.</div>
    :teams.filter(t=>!haveT.includes(t.id)).map(t=><label className="prow pick" key={t.id}><input type="checkbox" checked={pt.has(t.id)} onChange={()=>tog(pt,setPt)(t.id)}/><div className="avatar sm"><Icon n="users" s={15}/></div><div className="grow"><b>{t.name}</b><small>{t.members.length} member{t.members.length>1?'s':''}</small></div></label>)}</div>}
  <label style={{marginTop:12}}>What can they do?
   <select value={perm} onChange={e=>setPerm(e.target.value)}><option value="view">View only</option><option value="edit">Can edit (changes the original)</option></select></label>
  <label className="chk" style={{marginTop:12}}><input type="checkbox" checked={copy} onChange={e=>setCopy(e.target.checked)}/>Allow them to save their own copy</label>
  <label style={{marginTop:10}}>Access ends<select value={exp} onChange={e=>setExp(e.target.value)}><option value="0">Never (until I stop sharing)</option><option value="1">After 1 day</option><option value="7">After 7 days</option><option value="30">After 30 days</option><option value="90">After 90 days</option></select></label>
  <div className="sharelinks"><button className="linkbtn" onClick={()=>setChat(true)}><Icon n="chat" s={13}/> Chat with the people it is shared with</button><button className="linkbtn" onClick={()=>setShowH(!showH)}>{showH?'Hide history':'Show history (who edited, what changed)'}</button></div>
  {showH&&<div className="sharebox" style={{marginTop:8}}><HistoryView compact kinds={false} name="share-history" showTitle={kind==='folder'} load={p=>api('/shares/history?'+qs+'&'+p)} empty="No activity yet."/></div>}
  {chat&&<ChatModal chatRef={kind==='folder'?{type:'folder',owner:'me',year:folder.year,month:folder.month,project:folder.project}:{type:'item',kind,item:item._id}} title={`Chat · ${title}`} say={say} onClose={()=>setChat(false)}/>}
  {err&&<div className="err" style={{marginTop:8}}>{err}</div>}
  <div className="actions"><button className="btn" onClick={onClose}>Close</button><button className="btn primary" disabled={!total||busy} onClick={share}><Icon n="share" s={14}/> Share{total?` (${total})`:''}</button></div>
 </Modal>;
}
