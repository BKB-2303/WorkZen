import {useState} from 'react';import {api} from './api.js';
export default function Login({onLogin}){
 const [username,setU]=useState(''),[password,setP]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const go=async e=>{e.preventDefault();setErr('');setBusy(true);
  try{const d=await api('/auth/login',{method:'POST',body:{username,password}});localStorage.setItem('bkb_token',d.token);onLogin(d.user);}
  catch(x){setErr(x.message);setBusy(false);}};
 return <div className="loginbg"><form className="logincard" onSubmit={go}>
  <div className="brand dark"><div className="logo">W</div><div><b>WorkZen</b><small>Plan. Track. Deliver.</small></div></div>
  <h2>Welcome back</h2><p className="muted">Sign in to continue to your workspace.</p>
  <label>Username<input value={username} onChange={e=>setU(e.target.value)} placeholder="Your username" autoFocus autoComplete="username"/></label>
  <label>Password<input type="password" value={password} onChange={e=>setP(e.target.value)} placeholder="Enter your password" autoComplete="current-password"/></label>
  {err&&<div className="err">{err}</div>}
  <button className="btn primary wide" disabled={busy||!username||!password}>{busy?'Signing in…':'Log in'}</button>
  <div className="hint">Accounts are created by your administrator.</div>
 </form></div>;
}
