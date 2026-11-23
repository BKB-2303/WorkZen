import {useState} from 'react';import Modal from './Modal.jsx';import {genPassword} from '../utils.js';
export default function PasswordModal({title,needCurrent,allowGenerate,onSubmit,onClose}){
 const [current,setC]=useState('');const [password,setP]=useState('');const [show,setShow]=useState(false);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
 const go=async e=>{e.preventDefault();setErr('');setBusy(true);
  try{await onSubmit({current,password});onClose();}catch(x){setErr(x.message);setBusy(false);}};
 return <Modal title={title} onClose={onClose}><form onSubmit={go} className="form">
  {needCurrent&&<label>Current password<input type="password" value={current} onChange={e=>setC(e.target.value)} autoFocus/></label>}
  <label>New password (min 6 characters)
   <div className="inline"><input type={show?'text':'password'} value={password} onChange={e=>setP(e.target.value)} autoFocus={!needCurrent}/>
    {allowGenerate&&<button type="button" className="btn" onClick={()=>{setP(genPassword());setShow(true);}}>Generate</button>}
    <button type="button" className="btn" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label>
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save password</button></div>
 </form></Modal>;
}
