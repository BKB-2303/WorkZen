import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '../api.js';import Icon from './Icon.jsx';import Modal from './Modal.jsx';import {hue,fmtTime,dayLabel,dayKey} from '../utils.js';
import UserAvatar from './UserAvatar.jsx';

// conversation reference -> query string  ({type:'team',team:id} | {type:'direct',user:id} | {type:'item',kind,item} | {type:'folder',owner,year,month,project})
const qs=(ref,extra={})=>{const p=new URLSearchParams();for(const [k,v] of Object.entries({...ref,...extra}))if(v!==null&&v!==undefined&&v!=='')p.set(k,String(v));return p.toString();};
const URL_RX=/(https?:\/\/[^\s<]+)/g;
const linkify=t=>t.split(URL_RX).map((s,i)=>i%2?<a key={i} href={s} target="_blank" rel="noopener noreferrer">{s}</a>:s);
const TYPE_ICON={team:'users',direct:'chat',item:'note',folder:'folder'};

// A whole conversation: messages, search, reply, edit, delete, "load earlier", live updates.
export default function ChatPanel({chatRef,say,ask,onRead,height,header=true}){
 const key=JSON.stringify(chatRef);
 const [info,setInfo]=useState(null),[msgs,setMsgs]=useState(null),[more,setMore]=useState(false),[err,setErr]=useState(''),[older,setOlder]=useState(false);
 const [text,setText]=useState(''),[reply,setReply]=useState(null),[edit,setEdit]=useState(null),[busy,setBusy]=useState(false);
 const [sOpen,setSOpen]=useState(false),[sq,setSq]=useState(''),[sqd,setSqd]=useState('');
 const box=useRef(null),inp=useRef(null),since=useRef(null),stick=useRef(true),keep=useRef(null),msgsRef=useRef([]),readRef=useRef(onRead);
 msgsRef.current=msgs||[];readRef.current=onRead;
 const say2=m=>say?say(m):setErr(m);

 useEffect(()=>{setMsgs(null);setInfo(null);setReply(null);setEdit(null);setText('');setSq('');setSqd('');setSOpen(false);setErr('');since.current=null;},[key]);
 useEffect(()=>{const t=setTimeout(()=>setSqd(sq.trim()),300);return()=>clearTimeout(t);},[sq]);

 // first page (or search results)
 useEffect(()=>{let live=true;setErr('');
  api('/chat/messages?'+qs(chatRef,{limit:30,q:sqd})).then(d=>{if(!live)return;setInfo(d.thread);setMsgs(d.messages);setMore(d.hasMore);since.current=d.now;stick.current=true;if(!sqd)readRef.current?.();})
   .catch(e=>{if(live){setErr(e.message);setMsgs([]);}});
  return()=>{live=false;};},[key,sqd]);

 // keep the scroll position sensible
 useLayoutEffect(()=>{const el=box.current;if(!el)return;
  if(keep.current!=null){el.scrollTop=el.scrollHeight-keep.current;keep.current=null;}else if(stick.current)el.scrollTop=el.scrollHeight;},[msgs]);

 // live updates every few seconds while the tab is visible (new, edited and deleted messages)
 const ready=msgs!==null&&!sqd;
 useEffect(()=>{if(!ready)return;
  const id=setInterval(async()=>{
   if(document.visibilityState!=='visible'||!since.current)return;
   try{
    const d=await api('/chat/messages?'+qs(chatRef,{since:new Date(new Date(since.current)-3000).toISOString()}));
    since.current=d.now;if(!d.messages.length)return;
    const have=new Set(msgsRef.current.map(x=>x.id)),fresh=d.messages.some(x=>!have.has(x.id)&&!x.you);
    const el=box.current;if(el)stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<120;
    setMsgs(p=>{const arr=[...(p||[])];for(const x of d.messages){const i=arr.findIndex(y=>y.id===x.id);if(i>=0)arr[i]=x;else arr.push(x);}return arr;});
    if(fresh)api('/chat/read',{method:'POST',body:chatRef}).then(()=>readRef.current?.()).catch(()=>{});
   }catch(e){/* try again next time */}
  },4000);
  return()=>clearInterval(id);},[ready,key]);

 const loadOlder=async()=>{if(!msgs?.length||older)return;setOlder(true);
  try{const d=await api('/chat/messages?'+qs(chatRef,{limit:30,q:sqd,before:msgs[0].id}));
   const el=box.current;keep.current=el?el.scrollHeight-el.scrollTop:null;stick.current=false;
   setMsgs(p=>[...d.messages,...p]);setMore(d.hasMore);}catch(e){say2(e.message);}setOlder(false);};
 const send=async()=>{const t=text.trim();if(!t||busy)return;setBusy(true);
  try{const m=await api('/chat/messages',{method:'POST',body:{...chatRef,text:t,replyTo:reply?.id}});
   stick.current=true;setMsgs(p=>[...(p||[]),m]);setText('');setReply(null);if(inp.current)inp.current.style.height='auto';}
  catch(e){say2(e.message);}setBusy(false);inp.current?.focus();};
 const saveEdit=async()=>{const t=edit.text.trim();if(!t)return;
  try{const m=await api('/chat/messages/'+edit.id,{method:'PUT',body:{text:t}});setMsgs(p=>p.map(x=>x.id===m.id?m:x));setEdit(null);}catch(e){say2(e.message);}};
 const del=m=>{const go=async()=>{try{await api('/chat/messages/'+m.id,{method:'DELETE'});setMsgs(p=>p.map(x=>x.id===m.id?{...x,deleted:true,text:''}:x));}catch(e){say2(e.message);}};
  ask?ask({title:'Delete message',label:'Delete',message:'This message will be removed for everyone in this chat.',onYes:go}):(window.confirm('Delete this message?')&&go());};
 const onKey=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}};
 const grow=e=>{setText(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';};

 const rows=[];let lastDay='',lastSender=null,lastAt=0;
 for(const m of msgs||[]){const dk=dayKey(m.at),t=+new Date(m.at);
  if(dk!==lastDay){rows.push({k:'d'+dk+m.id,day:dayLabel(m.at)});lastDay=dk;lastSender=null;}
  rows.push({k:m.id,m,first:lastSender!==m.sender.id||t-lastAt>5*60e3});lastSender=m.sender.id;lastAt=t;}

 return <div className="chatp" style={height?{height}:undefined}>
  {header?<div className="chead">
   <div className="cico" style={{background:`hsl(${hue(info?.title||'')} 55% 45%)`}}>{info?.type==='direct'&&info.other?<UserAvatar user={{name:info.title,...info.other}} online={info.other.online}/>:info?.type==='direct'?(info.title||'?')[0].toUpperCase():<Icon n={TYPE_ICON[info?.type]||'chat'} s={18}/>}</div>
   <div className="grow cmeta"><b>{info?.title||'Chat'}</b><small>{info?.sub||' '}{info?.type==='direct'&&info.other&&<span className={'presence-dot'+(info.other.online?' on':'')}>{info.other.online?'Online':'Offline'}</span>}</small></div>
   <button className={'iconbtn dark'+(sOpen?' on':'')} title="Search in this chat" onClick={()=>{setSOpen(!sOpen);if(sOpen){setSq('');}}}><Icon n="search" s={18}/></button>
  </div>:<div className="chead slim"><small className="grow">{info?.sub||' '}</small><button className={'iconbtn dark'+(sOpen?' on':'')} title="Search in this chat" onClick={()=>{setSOpen(!sOpen);if(sOpen){setSq('');}}}><Icon n="search" s={18}/></button></div>}
  {sOpen&&<div className="csearch"><div className="search"><Icon n="search"/><input autoFocus placeholder="Search messages" value={sq} onChange={e=>setSq(e.target.value)}/></div></div>}
  <div className="mbox" ref={box}>
   {msgs===null?<div className="muted pad">Loading…</div>:<>
    {more&&<div className="moreold"><button className="btn small" disabled={older} onClick={loadOlder}>{older?'Loading…':sqd?'Show older matches':'Show earlier messages'}</button></div>}
    {!msgs.length&&<div className="cempty"><Icon n="chat" s={30}/><b>{err?'Cannot open this chat':sqd?'No messages match':'No messages yet'}</b><small>{err||(sqd?'Try different words.':'Say hello – everyone in this chat will see it.')}</small></div>}
    {sqd&&msgs.length>0&&<div className="sres">Search results for “{sqd}”</div>}
    {rows.map(r=>{if(r.day)return <div className="mday" key={r.k}><span>{r.day}</span></div>;
     const {m,first}=r,mine=m.you,mine_edit=edit?.id===m.id,canDel=mine||info?.canModerate;
     return <div className={'msg'+(mine?' me':'')+(first?' first':'')} key={r.k}>
      {!mine&&<div className="mav">{first&&<UserAvatar user={m.sender} className="aico" online={m.sender.online}/>}</div>}
      <div className="mcol">
       {first&&!mine&&<small className="mname">{m.sender.name}</small>}
       <div className="mline">
        <div className={'bubble'+(m.deleted?' del':'')}>
         {m.replyTo&&!m.deleted&&<div className="quote"><b>{m.replyTo.name}</b><span>{m.replyTo.text}</span></div>}
         {m.deleted?<i>This message was deleted</i>:mine_edit?<div className="medit"><textarea autoFocus rows="2" value={edit.text} maxLength={2000} onChange={e=>setEdit({...edit,text:e.target.value})}
           onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit();}if(e.key==='Escape'){e.stopPropagation();setEdit(null);}}}/>
           <div className="medit-b"><button className="btn small" onClick={()=>setEdit(null)}>Cancel</button><button className="btn small primary" onClick={saveEdit}>Save</button></div></div>
          :<span className="mtext">{linkify(m.text)}</span>}
         {!mine_edit&&<small className="mtime">{fmtTime(m.at)}{m.editedAt&&!m.deleted?' · edited':''}</small>}
        </div>
        {!m.deleted&&!mine_edit&&<div className="mact">
         <button title="Reply" onClick={()=>{setReply({id:m.id,name:mine?'yourself':m.sender.name,text:m.text.slice(0,100)});inp.current?.focus();}}><Icon n="reply" s={14}/></button>
         {mine&&<button title="Edit" onClick={()=>setEdit({id:m.id,text:m.text})}><Icon n="edit" s={14}/></button>}
         {canDel&&<button title="Delete" onClick={()=>del(m)}><Icon n="trash" s={14}/></button>}</div>}
       </div></div></div>;})}
   </>}
  </div>
  {sqd?<div className="composer off"><small>Clear the search to write a message.</small></div>
  :<div className="composer">
   {reply&&<div className="replybar"><Icon n="reply" s={14}/><div className="grow"><b>Replying to {reply.name}</b><span>{reply.text}</span></div><button className="iconbtn dark" aria-label="Cancel reply" onClick={()=>setReply(null)}><Icon n="x" s={14}/></button></div>}
   {err&&msgs?.length>0&&<div className="err">{err}</div>}
   <div className="crow"><textarea ref={inp} rows="1" maxLength={2000} placeholder="Write a message…" value={text} onChange={grow} onKeyDown={onKey} disabled={!info&&!!err}/>
    <button className="btn primary sendbtn" aria-label="Send" disabled={!text.trim()||busy||(!info&&!!err)} onClick={send}><Icon n="send" s={16}/></button></div>
   <small className="chint">Enter to send · Shift+Enter for a new line</small>
  </div>}
 </div>;
}

// The same conversation in a pop-up window (used from the Share window and “By me”).
export function ChatModal({chatRef,title,say,ask,onClose}){
 return <Modal wide title={title||'Chat'} onClose={onClose}><ChatPanel chatRef={chatRef} say={say} ask={ask} header={false} height="min(62vh,520px)"/></Modal>;
}
