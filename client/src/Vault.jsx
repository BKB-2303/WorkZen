import {useEffect,useMemo,useRef,useState} from 'react';
import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import Pagination,{usePaged} from './components/Pagination.jsx';
import {strength,genPass,copyText,fmtDateTime,host,safeUrl,hue} from './utils.js';

function Meter({value}){const s=strength(value);return value?<div className="meter"><div className="bar slim"><i style={{width:s.pct+'%',background:s.color}}/></div><small style={{color:s.color,fontWeight:600}}>{s.label}</small></div>:null;}

function Gate({vault,what}){
 const [pw,setPw]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{await vault.unlock(pw);}catch(x){setErr(x.message);setBusy(false);setPw('');}};
 return <div className="gate"><form className="card lockcard" onSubmit={go}>
  <div className="lockico"><Icon n="lock" s={28}/></div><h2>Saved passwords are locked</h2>
  <p className="muted">Enter your login password to view your {what}. The vault locks again after 5 minutes of inactivity.</p>
  <input type="password" autoFocus placeholder="Login password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password"/>
  {err&&<div className="err">{err}</div>}
  <button className="btn primary wide" disabled={busy||!pw}>{busy?'Unlocking…':'Unlock vault'}</button></form></div>;
}

function ItemModal({type,item,cats,onSave,onClose}){
 const isP=type==='password';
 const [f,setF]=useState(isP?{title:'',url:'',username:'',password:'',notes:'',category:'General',favorite:false,...item}:{title:'',content:'',category:'General',favorite:false,...item});
 const [show,setShow]=useState(false),[len,setLen]=useState(16),[sym,setSym]=useState(true),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');try{await onSave(f);onClose();}catch(x){setErr(x.message);setBusy(false);}};
 return <Modal wide title={(item?.id?'Edit ':'New ')+(isP?'password':'secure note')} onClose={onClose}><form className="form" onSubmit={go} autoComplete="off">
  <label>Title<input required autoFocus value={f.title} onChange={set('title')} maxLength={120} placeholder={isP?'e.g. Company email':'e.g. Server details'}/></label>
  {isP?<>
   <div className="grid2"><label>Website<input value={f.url} onChange={set('url')} placeholder="example.com"/></label>
    <label>Username / email<input value={f.username} onChange={set('username')} autoComplete="off"/></label></div>
   <label>Password
    <div className="inline"><input required type={show?'text':'password'} value={f.password} onChange={set('password')} autoComplete="new-password"/>
     <button type="button" className="btn" title={show?'Hide':'Show'} onClick={()=>setShow(!show)}><Icon n={show?'eyeoff':'eye'}/></button>
     <button type="button" className="btn" title="Generate strong password" onClick={()=>{setF({...f,password:genPass(len,sym)});setShow(true);}}><Icon n="refresh"/> Generate</button></div>
    <Meter value={f.password}/>
    <div className="genopts"><span>Length</span><select value={len} onChange={e=>setLen(+e.target.value)}>{[12,16,20,24,32].map(n=><option key={n}>{n}</option>)}</select>
     <label className="chk"><input type="checkbox" checked={sym} onChange={e=>setSym(e.target.checked)}/> Symbols</label></div></label>
   <label>Notes<textarea rows="2" value={f.notes} onChange={set('notes')}/></label></>
  :<label>Note<textarea required rows="8" value={f.content} onChange={set('content')} placeholder="Write anything sensitive here – it is stored encrypted."/></label>}
  <div className="grid2"><label>Category<input list="vcats" value={f.category} onChange={set('category')}/><datalist id="vcats">{cats.map(c=><option key={c} value={c}/>)}</datalist></label>
   <label className="chk fav"><input type="checkbox" checked={f.favorite} onChange={e=>setF({...f,favorite:e.target.checked})}/> Mark as favorite</label></div>
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
 </form></Modal>;
}

function PassCard({i,weak,reused,say,onEdit,onDel,onFav}){
 const [show,setShow]=useState(false);const t=useRef(null);const link=safeUrl(i.url);
 const reveal=()=>{clearTimeout(t.current);if(!show)t.current=setTimeout(()=>setShow(false),15000);setShow(!show);};
 useEffect(()=>()=>clearTimeout(t.current),[]);
 return <div className="vcard">
  <div className="vtop"><div className="vav" style={{background:`hsl(${hue(i.title)} 58% 46%)`}}>{(i.title||'?')[0].toUpperCase()}</div>
   <div className="vmeta"><b>{i.title}</b><small>{i.username||host(i.url)||'—'}</small></div>
   <button className={'star'+(i.favorite?' on':'')} title="Favorite" onClick={onFav}><Icon n="star" f={i.favorite}/></button></div>
  <div className="vpass"><code>{show?i.password:'••••••••••••'}</code>
   <button className="iconbtn dark" title={show?'Hide':'Show'} onClick={reveal}><Icon n={show?'eyeoff':'eye'}/></button>
   <button className="iconbtn dark" title="Copy password" onClick={()=>copyText(i.password,say,'Password copied')}><Icon n="copy"/></button></div>
  <div className="tags"><span className="tag">{i.category}</span>{weak&&<span className="tag st-overdue">Weak</span>}{reused&&<span className="tag st-todo">Reused</span>}</div>
  {i.notes&&<p className="vnotes">{i.notes}</p>}
  <div className="vfoot"><small>Updated {fmtDateTime(i.updatedAt)}</small><span className="grow"/>
   {i.username&&<button className="iconbtn dark" title="Copy username" onClick={()=>copyText(i.username,say,'Username copied')}><Icon n="users"/></button>}
   {link&&<a className="iconbtn dark" title="Open website" href={link} target="_blank" rel="noopener noreferrer"><Icon n="link"/></a>}
   <button className="iconbtn dark" title="Edit" onClick={onEdit}><Icon n="edit"/></button>
   <button className="iconbtn dark" title="Delete" onClick={onDel}><Icon n="trash"/></button></div></div>;
}

export default function Vault({vault,say,ask}){
 const type='password',isP=true;
 const [q,setQ]=useState(''),[cat,setCat]=useState('all'),[flt,setFlt]=useState('all'),[modal,setModal]=useState(null);
 const all=vault.items.filter(i=>i.type===type);
 const cats=useMemo(()=>[...new Set(vault.items.map(i=>i.category))].sort(),[vault.items]);
 const counts=useMemo(()=>{const m={};vault.items.filter(i=>i.type==='password').forEach(i=>{m[i.password]=(m[i.password]||0)+1;});return m;},[vault.items]);
 const weak=i=>strength(i.password).score<3,reused=i=>i.password&&counts[i.password]>1;
 const needle=q.toLowerCase();
 const shown=all.filter(i=>(cat==='all'||i.category===cat)&&(flt==='all'||(flt==='fav'&&i.favorite)||(flt==='weak'&&weak(i))||(flt==='reused'&&reused(i)))
  &&(!needle||[i.title,i.username,i.url,i.category,i.notes,i.content].join(' ').toLowerCase().includes(needle)))
  .sort((a,b)=>(b.favorite-a.favorite)||a.title.localeCompare(b.title));
 const pg=usePaged(shown,{size:12,key:q+'|'+cat+'|'+flt,store:'vault'});
 const save=async(f,old)=>{await vault.save({id:old?.id,type,data:f});say(old?.id?'Changes saved':'Added to vault');};
 const fav=i=>vault.save({id:i.id,type,data:{...i,favorite:!i.favorite}}).catch(e=>say(e.message));
 const del=i=>ask({title:'Delete entry',message:`“${i.title}” will be permanently deleted from your vault.`,onYes:()=>vault.remove(i.id).then(()=>say('Deleted')).catch(e=>say(e.message))});
 const head=<div className="phead"><div><h1>{isP?'Saved passwords':'Secure notes'}</h1><p className="muted">{isP?'Encrypted logins, available only after you unlock the vault.':'Private notes, encrypted and available only after you unlock the vault.'}</p></div>
  {vault.unlocked&&<div className="hbtns"><button className="btn" onClick={vault.lock}><Icon n="lock"/> Lock now</button><button className="btn primary" onClick={()=>setModal({})}><Icon n="plus"/> {isP?'Add password':'Add note'}</button></div>}</div>;
 if(!vault.unlocked)return <>{head}<Gate vault={vault} what={isP?'saved passwords':'secure notes'}/></>;
 const wk=all.filter(weak).length,ru=all.filter(reused).length;
 return <>{head}
  {isP&&<div className="stats s4">{[['Saved logins',all.length,'c-dark'],['Favorites',all.filter(i=>i.favorite).length,'c-amber'],['Weak passwords',wk,wk?'c-red':'c-green'],['Reused passwords',ru,ru?'c-red':'c-green']]
   .map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>}
  <div className="filters"><div className="search"><Icon n="search"/><input placeholder={isP?'Search title, username or website':'Search notes'} value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={cat} onChange={e=>setCat(e.target.value)}><option value="all">All categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select>
   <select value={flt} onChange={e=>setFlt(e.target.value)}><option value="all">Show all</option><option value="fav">Favorites</option>{isP&&<><option value="weak">Weak only</option><option value="reused">Reused only</option></>}</select></div>
  {!all.length?<div className="empty"><b>{isP?'No saved passwords yet':'No secure notes yet'}</b><p>Click “{isP?'Add password':'Add note'}” to save your first one.</p></div>
  :!shown.length?<div className="empty">Nothing matches your search.</div>
  :<><div className="vgrid">{pg.rows.map(i=>isP
   ?<PassCard key={i.id} i={i} weak={weak(i)} reused={reused(i)} say={say} onEdit={()=>setModal(i)} onDel={()=>del(i)} onFav={()=>fav(i)}/>
   :<div className="vcard note" key={i.id} onClick={()=>setModal(i)}>
     <div className="vtop"><div className="vav" style={{background:`hsl(${hue(i.title)} 58% 46%)`}}><Icon n="note"/></div><div className="vmeta"><b>{i.title}</b><small>{fmtDateTime(i.updatedAt)}</small></div>
      <button className={'star'+(i.favorite?' on':'')} onClick={e=>{e.stopPropagation();fav(i);}}><Icon n="star" f={i.favorite}/></button></div>
     <p className="vnotes">{i.content.slice(0,180)}{i.content.length>180?'…':''}</p>
     <div className="vfoot"><span className="tag">{i.category}</span><span className="grow"/><button className="iconbtn dark" title="Delete" onClick={e=>{e.stopPropagation();del(i);}}><Icon n="trash"/></button></div></div>)}</div><Pagination {...pg} label="entries"/></>}
  {modal&&<ItemModal type={type} item={modal.id?modal:null} cats={cats} onSave={f=>save(f,modal)} onClose={()=>setModal(null)}/>}
 </>;
}
