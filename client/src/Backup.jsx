import {useRef,useState} from 'react';import {api} from './api.js';import Icon from './components/Icon.jsx';import {fmtDateTime,todayStr} from './utils.js';
const LS='wz_last_backup';
const get=()=>{try{return localStorage.getItem(LS);}catch(e){return null;}};
export default function Backup({user,say,onRestored}){
 const [withPw,setWithPw]=useState(false),[pw,setPw]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[last,setLast]=useState(get());
 const [file,setFile]=useState(null),[rpw,setRpw]=useState(''),[rerr,setRerr]=useState(''),[rbusy,setRbusy]=useState(false),[res,setRes]=useState(null);const fi=useRef();
 const days=last?Math.floor((Date.now()-new Date(last))/864e5):null;

 const download=async()=>{setBusy(true);setErr('');
  try{const d=await api('/backup/export',{method:'POST',body:{includePasswords:withPw,password:pw}});
   const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workzen-backup-${user.username}-${todayStr()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
   const now=new Date().toISOString();try{localStorage.setItem(LS,now);}catch(e){}setLast(now);setPw('');
   say(`Backup downloaded · ${d.tasks.length} tasks, ${d.notes.length} notes, ${d.bookmarks.length} bookmarks${d.passwords?`, ${d.passwords.length} passwords`:''}`);
  }catch(e){setErr(e.message);}setBusy(false);};

 const pickFile=async e=>{const f=e.target.files?.[0];setRes(null);setRerr('');setFile(null);if(!f)return;
  try{const d=JSON.parse(await f.text());if(d?.app!=='WorkZen')throw 0;setFile({name:f.name,data:d});}catch(x){setRerr('This is not a valid WorkZen backup file.');}};
 const restore=async()=>{setRbusy(true);setRerr('');
  try{const r=await api('/backup/import',{method:'POST',body:{data:file.data,password:rpw}});setRes(r);setRpw('');setFile(null);if(fi.current)fi.current.value='';onRestored?.();say('Restore complete');}
  catch(e){setRerr(e.message);}setRbusy(false);};
 const n=k=>Array.isArray(file?.data?.[k])?file.data[k].length:0;

 return <>
  <div className="phead"><div><h1>Backup &amp; restore</h1><p className="muted">Keep your own copy of everything, safe on your device.</p></div></div>
  <div className={'bkstatus'+(last&&days<30?' ok':' warn')}><Icon n={last&&days<30?'shield':'alert'} s={18}/><span>{last?`Last backup from this device: ${fmtDateTime(last)}${days>=30?` — ${days} days ago, time for a new one.`:'.'}`:'You haven’t downloaded a backup from this device yet.'}</span></div>

  <div className="panel">
   <h3><Icon n="down"/> Download a backup</h3>
   <p className="muted">One file with all your tasks, notes and bookmarks. If the hosting service ever stops or something goes wrong, you can restore everything from it.</p>
   <label className="chk"><input type="checkbox" checked={withPw} onChange={e=>setWithPw(e.target.checked)}/> Also include my saved passwords</label>
   {withPw&&<div className="bkwarn"><b>Careful:</b> passwords in the file are <b>not encrypted</b>. Anyone who gets the file can read them. Store it somewhere private (an encrypted drive or password manager).
    <input type="password" autoComplete="current-password" placeholder="Enter your login password to confirm" value={pw} onChange={e=>setPw(e.target.value)}/></div>}
   {err&&<div className="err">{err}</div>}
   <div><button className="btn primary" disabled={busy||(withPw&&!pw)} onClick={download}><Icon n="down"/> {busy?'Preparing…':'Download backup'}</button></div>
  </div>

  <div className="panel">
   <h3><Icon n="upload"/> Restore from a backup</h3>
   <p className="muted">Choose a WorkZen backup file. Items already in your account are skipped, and nothing is overwritten or deleted.</p>
   <input ref={fi} type="file" accept=".json,application/json" onChange={pickFile}/>
   {file&&<div className="bkpreview"><b>{file.name}</b><span>{n('tasks')} tasks · {n('notes')} notes · {n('bookmarks')} bookmarks{n('passwords')?` · ${n('passwords')} saved passwords`:''}</span>
    {file.data.exportedAt&&<small className="muted">Backup made {fmtDateTime(file.data.exportedAt)}</small>}
    {n('passwords')>0&&<input type="password" autoComplete="current-password" placeholder="Login password (needed for saved passwords)" value={rpw} onChange={e=>setRpw(e.target.value)}/>}</div>}
   {rerr&&<div className="err">{rerr}</div>}
   {res&&<div className="bkdone"><Icon n="check"/> Restored: {res.added.tasks} tasks, {res.added.notes} notes, {res.added.bookmarks} bookmarks{res.added.passwords?`, ${res.added.passwords} passwords`:''}.
    {(res.skipped.tasks+res.skipped.notes+res.skipped.bookmarks+res.skipped.passwords)>0&&<small> {res.skipped.tasks+res.skipped.notes+res.skipped.bookmarks+res.skipped.passwords} duplicates skipped.</small>}</div>}
   <div><button className="btn primary" disabled={!file||rbusy||(n('passwords')>0&&!rpw)} onClick={restore}><Icon n="upload"/> {rbusy?'Restoring…':'Restore'}</button></div>
  </div>
  <p className="muted small-note">Items other people shared with you belong to them and aren’t included in your backup. Keep the backup file safe — it is a plain text (JSON) file.</p>
 </>;
}
