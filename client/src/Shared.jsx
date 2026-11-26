import {useEffect,useMemo,useState} from 'react';import {api} from './api.js';import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import TaskModal from './components/TaskModal.jsx';
import HistoryView from './components/HistoryView.jsx';import ChatPanel,{ChatModal} from './components/ChatPanel.jsx';import Pagination,{usePaged} from './components/Pagination.jsx';
import {STATUS,fmtDate,fmtDateTime,host,hue,dueLabel,isOverdue,chatKey} from './utils.js';
import RichTextEditor from './components/RichTextEditor.jsx';import {richTextToText,sanitizeRichText} from './utils/richText.js';
import UserAvatar from './components/UserAvatar.jsx';
const KL={task:'Task',note:'Note',bookmark:'Bookmark',folder:'Folder'};
const KI={task:'list',note:'note',bookmark:'bookmark',folder:'folder'};
const titleOf=s=>s.kind==='folder'?s.label:(s.item.title||'Untitled note');

function Body({kind,item}){
 const [more,setMore]=useState(false);
 if(kind==='note'){const text=richTextToText(item.content),long=text.length>600;return <>
  <div className="sprose rich-preview" dangerouslySetInnerHTML={{__html:sanitizeRichText(more||!long?item.content:text.slice(0,600)+'…')}}/>
  {long&&<button className="linkbtn" onClick={()=>setMore(!more)}>{more?'Show less':'Read more'}</button>}
  <div className="tags"><span className="tag">{item.category}</span></div></>;}
 return <>{item.description&&<p className="sprose">{item.description}</p>}<div className="tags"><span className="tag">{item.category}</span></div>
  <div><a className="btn small" href={item.url} target="_blank" rel="noopener noreferrer"><Icon n="link" s={14}/> Open {host(item.url)}</a></div></>;
}

function SimpleEdit({kind,doc,onSave,onClose}){
 const [f,setF]=useState({...doc}),[busy,setBusy]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const go=async e=>{e.preventDefault();setBusy(true);
  const ok=await onSave(kind==='note'?{title:f.title,content:f.content,category:f.category}:{title:f.title,url:f.url,description:f.description,category:f.category});
  ok?onClose():setBusy(false);};
 return <Modal wide title={`Edit shared ${kind}`} onClose={onClose}><form className="form" onSubmit={go}>
  <label>Title<input value={f.title||''} onChange={set('title')} maxLength={120}/></label>
  {kind==='note'?<label>Note<RichTextEditor value={f.content||''} onChange={content=>setF({...f,content})}/></label>
   :<><label>Website<input value={f.url||''} onChange={set('url')}/></label><label>Description<input value={f.description||''} onChange={set('description')} maxLength={300}/></label></>}
  <label>Category<input value={f.category||''} onChange={set('category')} maxLength={40}/></label>
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save changes</button></div></form></Modal>;
}

// A task. Status / checklist changes are only DRAFTS until "Save changes" is pressed.
function MemberProgress({shareId,t,say}){
 const [progress,setProgress]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;const load=()=>api(`/shares/${shareId}/item/${t._id}/progress`).then(d=>{if(live)setProgress(d);}).catch(e=>{if(live)say(e.message);});
  load();const id=setInterval(()=>document.visibilityState==='visible'&&load(),15000);return()=>{live=false;clearInterval(id);};},[shareId,t._id]);
 const save=async next=>{
  setBusy(true);
  try{const mine=await api(`/shares/${shareId}/item/${t._id}/progress`,{method:'PUT',body:next});
   setProgress(p=>({...p,mine,members:[...(p?.members||[]).filter(x=>x.user?.id!==mine.user?.id),mine]}));
  }catch(e){say(e.message);}finally{setBusy(false);}
 };
 if(!progress)return <div className="member-progress"><small className="muted">Loading your individual progress…</small></div>;
 const mine=progress.mine,items=t.checklist||[];
 const checklist=items.map((_,i)=>!!mine.checklist?.[i]);
 return <section className="member-progress">
  <div className="progress-title"><div><b>My completion</b><small>Personal progress — does not change the shared task status.</small></div><span className="tag">{STATUS[mine.status]}</span></div>
  <div className="seg">{Object.entries(STATUS).map(([k,v])=><button type="button" key={k} disabled={busy} className={mine.status===k?'on':''} onClick={()=>save({status:k,checklist})}>{v}</button>)}</div>
  {items.length>0&&<div className="cl">
   {items.map((c,i)=><label className="citem" key={i}><input type="checkbox" disabled={busy} checked={checklist[i]} onChange={e=>save({status:mine.status,checklist:checklist.map((v,j)=>j===i?e.target.checked:v)})}/><span className={checklist[i]?'strike':''}>{c.text}</span></label>)}
  </div>}
  {progress.members.length>0&&<div className="member-updates"><small>TEAM UPDATES · {progress.members.filter(m=>m.status==='done').length}/{progress.members.length} done</small>{progress.members.map((m,i)=><div className="member-update" key={m.user?.id||i}><span>{m.user?.name||'Member'}{m.user?.id===mine.user?.id?' (you)':''}{items.length>0&&<small> · {(m.checklist||[]).filter(Boolean).length}/{items.length} steps</small>}</span><b className={'tag st-'+m.status}>{STATUS[m.status]}</b></div>)}</div>}
 </section>;
}

function TaskPane({t,canEdit,onSave,onFull,shareId,say}){
 const base=()=>({status:t.status,checklist:t.checklist||[]});
 const [d,setD]=useState(base),[busy,setBusy]=useState(false);
 useEffect(()=>{setD(base());},[t._id,t.updatedAt]);
 const dirty=d.status!==t.status||JSON.stringify(d.checklist)!==JSON.stringify(t.checklist||[]);
 const save=async()=>{setBusy(true);await onSave({status:d.status,checklist:d.checklist});setBusy(false);};
 const cl=d.checklist,cd=cl.filter(c=>c.done).length;
 return <div className="tpane">
  <div className="tags"><span className={'tag pr-'+t.priority}>{t.priority} priority</span><span className="tag">{t.project}</span>{isOverdue(t)&&<span className="tag st-overdue">Overdue</span>}</div>
  <div className="kv"><div><small>START</small><b>{fmtDate(t.startDate||t.dueDate)}</b></div><div><small>DUE</small><b className={isOverdue(t)?'c-red':''}>{fmtDate(t.dueDate)} · {dueLabel(t)}</b></div><div><small>CREATED</small><b>{fmtDateTime(t.createdAt)}</b></div>{t.completedAt&&t.status==='done'&&<div><small>COMPLETED</small><b>{fmtDateTime(t.completedAt)}</b></div>}</div>
  {t.notes?<p className="sprose">{t.notes}</p>:<p className="muted" style={{margin:0}}>No notes.</p>}
  <div><small className="lbl" style={{marginBottom:6}}>STATUS</small>
   {canEdit?<div className="seg">{Object.entries(STATUS).map(([k,v])=><button key={k} className={d.status===k?'on':''} onClick={()=>setD({...d,status:k})}>{v}</button>)}</div>:<span className={'tag st-'+t.status}>{STATUS[t.status]}</span>}</div>
  {cl.length>0&&<div className="cl"><div className="clhead"><small>CHECKLIST · {cd}/{cl.length}</small><div className="bar slim"><i style={{width:cd/cl.length*100+'%'}}/></div></div>
   {cl.map((c,i)=><label className="citem" key={i}><input type="checkbox" disabled={!canEdit} checked={c.done} onChange={()=>setD({...d,checklist:cl.map((x,j)=>j===i?{...x,done:!x.done}:x)})}/><span className={c.done?'strike':''}>{c.text}</span></label>)}</div>}
  {canEdit&&<div className="tact"><button className="btn small" onClick={onFull}><Icon n="edit" s={14}/> Edit all details</button></div>}
  {dirty&&<div className="savebar"><span>You have unsaved changes</span><span className="grow"/><button className="btn small" disabled={busy} onClick={()=>setD(base())}>Discard</button><button className="btn small primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save changes'}</button></div>}
  {shareId&&<MemberProgress shareId={shareId} t={t} say={say}/>}
 </div>;
}

function FolderPane({s,onOpen}){
 const [f,setF]=useState('all');
 const ts=s.tasks,done=ts.filter(t=>t.status==='done').length,od=ts.filter(isOverdue).length;
 const shown=ts.filter(t=>f==='all'||(f==='overdue'?isOverdue(t):t.status===f));
 const pg=usePaged(shown,{size:10,key:f+'|'+s.id});
 return <div className="tpane">
  <div className="kv"><div><small>TASKS</small><b>{ts.length}</b></div><div><small>DONE</small><b className="c-green">{done}</b></div><div><small>OPEN</small><b>{ts.length-done}</b></div><div><small>OVERDUE</small><b className={od?'c-red':''}>{od}</b></div></div>
  <div className="bar"><i style={{width:(ts.length?done/ts.length*100:0)+'%'}}/></div>
  <div className="chips">{[['all','All'],['todo','Pending'],['inprogress','In progress'],['done','Done'],['overdue','Overdue']].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setF(k)}>{l}</button>)}</div>
  {!shown.length?<small className="muted">No tasks here.</small>:<><div className="ftable">{pg.rows.map(t=><button className="ftask" key={t._id} onClick={()=>onOpen(t._id)}>
   <i className={'sdot st-'+(isOverdue(t)?'overdue':t.status)}/><b className={t.status==='done'?'strike':''}>{t.title}</b><span className={'tag pr-'+t.priority}>{t.priority}</span><small>Start {fmtDate(t.startDate||t.dueDate)}</small><small>Due {fmtDate(t.dueDate)}</small><Icon n="chev" s={14}/></button>)}</div><Pagination {...pg} compact label="tasks"/></>}
 </div>;
}

function Detail({s,say,ask,upd,onGone,onTaskCopied,onBack,onChat}){
 const [sub,setSub]=useState(null),[ed,setEd]=useState(null),[k,setK]=useState(0),[tab,setTab]=useState('details');
 const canEdit=s.perm==='edit',folder=s.kind==='folder';
 const cur=folder?(sub&&s.tasks.find(t=>t._id===sub)):s.item;
 const itemId=folder?cur?._id:null;
 useEffect(()=>{setSub(null);setTab('details');},[s.id]);
 const save=async(doc,body)=>{try{const r=await api(`/shares/${s.id}/item/${doc._id}`,{method:'PUT',body});upd(s.id,r);say('Changes saved');setK(x=>x+1);return true;}catch(e){say(e.message);return false;}};
 const copy=async id=>{try{const r=await api(`/shares/${s.id}/copy`,{method:'POST',body:{itemId:id}});if(r.kind==='task')onTaskCopied?.(r.items);setK(x=>x+1);
   say(r.items.length>1?`Saved ${r.items.length} tasks to your list`:`Saved a copy to your ${s.kind==='bookmark'?'bookmarks':r.kind+'s'}`);}catch(e){say(e.message);}};
 const stop=()=>ask({title:s.mine?'Stop sharing':'Remove from my list',label:s.mine?'Stop sharing':'Remove',
  message:s.mine?'The people you shared this with will no longer see it.':`This will be removed from your list. ${s.from.name} keeps the original.`,
  onYes:()=>api('/shares/'+s.id,{method:'DELETE'}).then(()=>{onGone(s.id);say('Removed');}).catch(e=>say(e.message))});
 const title=folder?(cur?cur.title:s.label):titleOf(s);
 const copyId=folder?cur?._id:null;
 // chat of the whole folder, or of the single task / note / bookmark that is open
 const chatRef=folder&&!cur?{type:'folder',owner:s.from.id,year:s.folder?.year??null,month:s.folder?.month??null,project:s.folder?.project??null}
  :{type:'item',kind:folder?'task':s.kind,item:folder?cur._id:s.item._id};
 return <div className="sdetail">
  <button className="btn small sback" onClick={onBack}>← Back to list</button>
  <div className="dhead">{s.from.avatar?<UserAvatar user={s.from} className="dico" online={s.from.online}/>:<div className="dico" style={{background:`hsl(${hue(s.from.username)} 55% 45%)`}}><Icon n={KI[s.kind]} s={20}/></div>}
   <div className="grow"><h2>{title}</h2><small>{KL[s.kind]} · {s.mine?'shared by you':`from ${s.from.name}`}{s.team?` · via team ${s.team.name}`:''} · {fmtDateTime(s.sharedAt)}</small></div>
   <div className="dhbtns"><button className="btn small" title="Open the chat about this" onClick={()=>setTab('chat')}><Icon n="chat" s={14}/> Chat</button>
    {!s.mine&&onChat&&<button className="btn small" title={`Send ${s.from.name} a private message`} onClick={()=>onChat({type:'direct',user:s.from.id},s.from.name)}>Message {s.from.name.split(' ')[0]}</button>}</div></div>
  <div className="tags"><span className={'tag '+(canEdit?'st-inprogress':'')}>{canEdit?'Can edit':'View only'}</span><span className={'tag '+(s.canCopy?'st-done':'')}>{s.canCopy?'Copying allowed':'Copying not allowed'}</span>{s.expiresAt&&<span className="tag st-todo">Access ends {fmtDate(String(s.expiresAt).slice(0,10))}</span>}</div>
  {folder&&cur&&<button className="linkbtn" onClick={()=>setSub(null)}>← All tasks in {s.label}</button>}
  <div className="seg tabs three dtabs" role="tablist">{[['details','Details','list'],['chat','Chat','chat'],['history','History','clock']].map(([id,l,ic])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'on':''} onClick={()=>setTab(id)}><Icon n={ic} s={14}/> {l}</button>)}</div>
  {tab==='details'&&<>
   <div className="dbody">
    {folder?(cur?<TaskPane t={cur} canEdit={canEdit} onSave={b=>save(cur,b)} onFull={()=>setEd(cur)} shareId={s.progressShareId||s.id} say={say}/>:<FolderPane s={s} onOpen={setSub}/>)
     :s.kind==='task'?<TaskPane t={s.item} canEdit={canEdit} onSave={b=>save(s.item,b)} onFull={()=>setEd(s.item)} shareId={s.progressShareId||s.id} say={say}/>
     :<div className="tpane"><Body kind={s.kind} item={s.item}/>{canEdit&&<div className="tact"><button className="btn small" onClick={()=>setEd(s.item)}><Icon n="edit" s={14}/> Edit</button></div>}</div>}
   </div>
   <div className="dactions">
    {s.canCopy&&(!folder||cur)&&<button className="btn small" onClick={()=>copy(copyId)}><Icon n="copy" s={14}/> Save a copy</button>}
    {s.canCopy&&folder&&!cur&&!!s.tasks.length&&<button className="btn small" onClick={()=>copy()}><Icon n="copy" s={14}/> Save all as copies</button>}
    <span className="grow"/>
    {(s.mine||!s.team)&&<button className="btn small danger" onClick={stop}>{s.mine?'Stop sharing':'Remove from my list'}</button>}</div></>}
  {tab==='chat'&&<div className="dsec flat"><small className="muted">{folder&&!cur?'Everyone who has this folder shared can read and write here. Open a task to chat about just that task.':'Everyone who can open this can read and write here.'}</small>
   <ChatPanel key={chatKey(chatRef)} chatRef={chatRef} say={say} ask={ask} header={false} height="min(68vh,560px)"/></div>}
  {tab==='history'&&<div className="dsec flat">
   <HistoryView name="shared-item" showTitle={folder&&!cur} deps={[s.id,itemId,k]} load={p=>api(`/shares/${s.id}/history?${p}${itemId?'&itemId='+itemId:''}`)} empty="No edits yet. Every change to this will be listed here."/></div>}
  {ed&&(s.kind==='note'||s.kind==='bookmark'?<SimpleEdit kind={s.kind} doc={ed} onSave={b=>save(ed,b)} onClose={()=>setEd(null)}/>
   :<TaskModal task={ed} projects={[]} onSave={async b=>{if(!(await save(ed,b)))throw new Error('Could not save');}} onClose={()=>setEd(null)}/>)}
 </div>;
}

export const updList=setL=>(sid,doc)=>setL(p=>p.map(s=>s.id!==sid?s:s.kind==='folder'?{...s,tasks:s.tasks.map(t=>t._id===doc._id?doc:t)}:{...s,item:doc}));

// Searchable list on the left, details on the right (used by Shared and by Teams)
export function SharedBrowser({items,setItems,say,ask,onTaskCopied,onChat,empty}){
 const [q,setQ]=useState(''),[f,setF]=useState('all'),[sort,setSort]=useState('new'),[sel,setSel]=useState(null);
 const list=useMemo(()=>{
  const n=q.toLowerCase();
  const l=(items||[]).filter(s=>(f==='all'||s.kind===f)&&(!n||(titleOf(s)+' '+s.from.name+' '+(s.team?.name||'')).toLowerCase().includes(n)));
  return l.sort((a,b)=>sort==='name'?titleOf(a).localeCompare(titleOf(b)):sort==='from'?a.from.name.localeCompare(b.from.name):String(b.sharedAt).localeCompare(String(a.sharedAt)));
 },[items,q,f,sort]);
 const pg=usePaged(list,{size:12,key:q+'|'+f+'|'+sort,store:'shared'});
 if(items===null)return <div className="empty">Loading…</div>;
 if(!items.length)return empty;
 const cur=items.find(s=>s.id===sel),shown=cur||list[0];
 const gone=id=>{setItems(p=>p.filter(x=>x.id!==id));setSel(null);};
 return <div className={'sw'+(cur?' has-sel':'')}>
  <div className="slist">
   <div className="sbar"><div className="search"><Icon n="search"/><input placeholder="Search shared items" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <select value={sort} onChange={e=>setSort(e.target.value)}><option value="new">Newest</option><option value="name">Name</option><option value="from">Shared by</option></select></div>
   <div className="chips">{[['all','All'],['folder','Folders'],['task','Tasks'],['note','Notes'],['bookmark','Bookmarks']].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setF(k)}>{l}</button>)}</div>
   <div className="srows">{!list.length?<div className="muted pad">Nothing matches.</div>:pg.rows.map(s=><button key={s.id} className={'srow'+(shown&&shown.id===s.id?' on':'')} onClick={()=>setSel(s.id)}>
    <div className="sico" style={{background:`hsl(${hue(s.from.username)} 55% 45%)`}}><Icon n={KI[s.kind]} s={16}/></div>
    <div className="smeta"><b>{titleOf(s)}</b><small>{s.mine?'You':s.from.name}{s.team?` · ${s.team.name}`:''} · {KL[s.kind]}{s.kind==='folder'?` (${s.tasks.length})`:''}</small></div>
    <span className={'dotp '+(s.perm==='edit'?'edit':'')} title={s.perm==='edit'?'Can edit':'View only'}/></button>)}</div>
   <Pagination {...pg} compact label="items"/>
  </div>
  {shown?<Detail key={shown.id} s={shown} say={say} ask={ask} upd={updList(setItems)} onGone={gone} onTaskCopied={onTaskCopied} onChat={onChat} onBack={()=>setSel(null)}/>:<div className="sdetail"><div className="empty">Select an item</div></div>}
 </div>;
}

export default function Shared({user,say,ask,onCount,onTaskCopied,onChat}){
 const [tab,setTab]=useState('in'),[inb,setInb]=useState(null),[sent,setSent]=useState(null),[bq,setBq]=useState(''),[chat,setChat]=useState(null);
 useEffect(()=>{onCount?.((inb||[]).length);},[inb]);
 const loadOut=()=>api('/shares/sent').then(setSent).catch(e=>say(e.message));
 useEffect(()=>{api('/shares/received').then(setInb).catch(e=>say(e.message));loadOut();},[]);
 const unshare=s=>api('/shares/'+s.id,{method:'DELETE'}).then(()=>{setSent(p=>p.filter(x=>x.id!==s.id));say('Sharing stopped');}).catch(e=>say(e.message));
 const patch=(s,b)=>api('/shares/'+s.id,{method:'PUT',body:b}).then(()=>{say('Updated');loadOut();}).catch(e=>say(e.message));
 const n=bq.trim().toLowerCase(),sl=(sent||[]).filter(s=>!n||(s.title+' '+(s.team?s.team.name:s.to.name+' '+s.to.username)).toLowerCase().includes(n));
 const pg=usePaged(sl,{size:10,key:n,store:'sent'});
 const refOf=s=>s.kind==='folder'?{type:'folder',owner:user.id,year:s.folder?.year??null,month:s.folder?.month??null,project:s.folder?.project??null}:{type:'item',kind:s.kind,item:s.item};
 return <>
  <div className="phead"><div><h1>Shared</h1><p className="muted">Things shared between you, other users and your teams.</p></div></div>
  <div className="seg tabs three"><button className={tab==='in'?'on':''} onClick={()=>setTab('in')}>With me{inb?` (${inb.length})`:''}</button><button className={tab==='out'?'on':''} onClick={()=>setTab('out')}>By me{sent?` (${sent.length})`:''}</button><button className={tab==='act'?'on':''} onClick={()=>setTab('act')}>History</button></div>
  <div style={{marginTop:14}}>
  {tab==='in'?<SharedBrowser items={inb} setItems={setInb} say={say} ask={ask} onChat={onChat} onTaskCopied={l=>l.forEach(onTaskCopied)} empty={<div className="empty"><b>Nothing shared with you yet</b><p>When someone shares a folder, task, note or bookmark with you, it appears here.</p></div>}/>
  :tab==='out'?(sent===null?<div className="empty">Loading…</div>:!sent.length?<div className="empty"><b>You haven’t shared anything</b><p>Use the Share button on a folder, task, note or bookmark.</p></div>
   :<div className="panel"><div className="search"><Icon n="search"/><input placeholder="Search what you shared or who with" value={bq} onChange={e=>setBq(e.target.value)}/></div>
    {!sl.length?<div className="muted pad">Nothing matches.</div>:pg.rows.map(s=><div className="prow sentrow" key={s.id}><span className="tag">{KL[s.kind]}</span><div className="grow"><b>{s.title}</b><small>with {s.team?`team ${s.team.name}`:`${s.to.name} (@${s.to.username})`} · {fmtDateTime(s.sharedAt)}{s.expiresAt?` · ends ${fmtDate(String(s.expiresAt).slice(0,10))}`:''}</small></div>
    <select className="permsel" value={s.perm} onChange={e=>patch(s,{perm:e.target.value})}><option value="view">Can view</option><option value="edit">Can edit</option></select>
    <label className="chk"><input type="checkbox" checked={s.canCopy} onChange={e=>patch(s,{canCopy:e.target.checked})}/>Can copy</label>
    <select className="permsel" value="" onChange={e=>e.target.value!==''&&patch(s,{expiresInDays:+e.target.value})}><option value="">Expiry…</option><option value="0">Never</option><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select>
    <button className="btn small" title="Chat about this" onClick={()=>setChat({ref:refOf(s),title:s.title})}><Icon n="chat" s={14}/> Chat</button>
    <button className="btn small danger" onClick={()=>unshare(s)}>Stop</button></div>)}
    <Pagination {...pg} label="shares"/></div>)
  :<div className="panel"><HistoryView name="shared-activity" load={p=>api('/shares/activity?'+p)} empty="No activity yet. Edits, sharing changes and copies show up here."/></div>}
  </div>
  {chat&&<ChatModal chatRef={chat.ref} title={chat.title} say={say} ask={ask} onClose={()=>setChat(null)}/>}
 </>;
}
