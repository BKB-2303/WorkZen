import {useState} from 'react';
import {api} from '../api.js';
import Modal from './Modal.jsx';
import UserAvatar from './UserAvatar.jsx';

export default function ProfileModal({user,onSave,onClose}){
 const [name,setName]=useState(user.name||''),[avatar,setAvatar]=useState(user.avatar||''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const readFile=e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setErr('Choose a PNG, JPEG or WebP image smaller than 5 MB');e.target.value='';return;}
  const reader=new FileReader();reader.onerror=()=>setErr('Could not read that image');
  reader.onload=()=>{
   const image=new Image();image.onerror=()=>setErr('Could not open that image');
   image.onload=()=>{
    const canvas=document.createElement('canvas'),size=Math.min(image.width,image.height);canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');if(!context){setErr('Your browser cannot process this image');return;}
    context.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,256,256);
    let data=canvas.toDataURL('image/webp',.82);
    if(!data.startsWith('data:image/webp'))data=canvas.toDataURL('image/jpeg',.78);
    if(data.length>180000)data=canvas.toDataURL('image/jpeg',.58);
    if(data.length>200000){setErr('That image could not be compressed enough. Try another image.');return;}
    setAvatar(data);setErr('');
   };
   image.src=String(reader.result||'');
  };
  reader.readAsDataURL(file);
 };
 const save=async e=>{e.preventDefault();setBusy(true);setErr('');
  try{const result=await api('/auth/profile',{method:'PUT',body:{name,avatar}});onSave(result);onClose();}
  catch(e){setErr(e.message);setBusy(false);}
 };
 return <Modal title="Profile settings" onClose={onClose}><form className="form" onSubmit={save}>
  <div className="profile-preview"><UserAvatar user={{...user,name,avatar}} className="profile-avatar"/><span className="muted">Profile photo</span></div>
  <label>Display name<input autoFocus required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={readFile}/><small>PNG, JPEG or WebP; resized to a 256 px profile image.</small></label>
  {avatar&&<button type="button" className="linkbtn" onClick={()=>setAvatar('')}>Remove profile picture</button>}
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy?'Saving…':'Save profile'}</button></div>
 </form></Modal>;
}
