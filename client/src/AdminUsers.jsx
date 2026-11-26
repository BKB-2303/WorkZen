import {useEffect,useState} from 'react';import {api} from './api.js';
import Shell from './components/Shell.jsx';import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';
import Pagination,{usePaged} from './components/Pagination.jsx';import PasswordModal from './components/PasswordModal.jsx';import Confirm from './components/Confirm.jsx';import {genPassword,fmtDateTime} from './utils.js';
const blank=()=>({name:'',username:'',password:genPassword(),role:'user'});
export default function AdminUsers({user,onUserChange,onLogout,theme,onTheme}){
 const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[q,setQ]=useState(''),[role,setRole]=useState('all');
 const [add,setAdd]=useState(null),[reset,setReset]=useState(null),[self,setSelf]=useState(false),[ask,setAsk]=useState(null),[toast,setToast]=useState(''),[err,setErr]=useState('');
 const say=m=>{setToast(m);setTimeout(()=>setToast(''),2500);};
 const refresh=()=>api('/users').then(setUsers).catch(()=>{});
 useEffect(()=>{api('/users').then(setUsers).finally(()=>setLoading(false));},[]);
 const patch=async(u,body)=>{try{const n=await api('/users/'+u.id,{method:'PUT',body});setUsers(p=>p.map(x=>x.id===n.id?{...x,...n,tasks:x.tasks,lastLogin:x.lastLogin}:x));say('User updated');}catch(e){say(e.message);refresh();}};
 const del=async u=>{try{await api('/users/'+u.id,{method:'DELETE'});setUsers(p=>p.filter(x=>x.id!==u.id));say('User deleted');}catch(e){say(e.message);refresh();}};
 const create=async e=>{e.preventDefault();setErr('');
  try{const n=await api('/users',{method:'POST',body:add});setUsers(p=>[...p,n]);
   navigator.clipboard?.writeText(`Username: ${add.username}\nPassword: ${add.password}`).catch(()=>{});
   say('User created – credentials copied to clipboard');setAdd(null);}catch(x){setErr(x.message);}};
 const list=users.filter(u=>(role==='all'||u.role===role)&&(u.name+u.username).toLowerCase().includes(q.toLowerCase()));
 const pg=usePaged(list,{size:10,key:q+'|'+role,store:'users'});
 const sideNav=<nav className="tree"><div className="navlabel">ADMIN</div><button className="nitem on"><Icon n="users"/><span>User management</span><em>{users.length}</em></button></nav>;
 return <Shell user={user} nav={sideNav} navKey="admin" onLogout={onLogout} onPassword={()=>setSelf(true)} onUserChange={onUserChange} theme={theme} onTheme={onTheme}>
  <div className="phead"><div><h1>User management</h1><p className="muted">Create accounts, reset passwords and control access.</p></div>
   <button className="btn primary" onClick={()=>{setErr('');setAdd(blank());}}><Icon n="plus"/> Add user</button></div>
  <div className="stats s4">{[['Total users',users.length,'c-dark'],['Active',users.filter(u=>u.active).length,'c-green'],['Disabled',users.filter(u=>!u.active).length,'c-red'],['Admins',users.filter(u=>u.role==='admin').length,'c-blue']]
   .map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>
  <div className="filters"><div className="search"><Icon n="search"/><input placeholder="Search name or username" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={role} onChange={e=>setRole(e.target.value)}><option value="all">All roles</option><option value="user">Users</option><option value="admin">Admins</option></select></div>
  {loading?<div className="empty">Loading…</div>:<div className="table"><div className="trh"><span>User</span><span>Role</span><span>Tasks</span><span>Last login</span><span>Status</span><span className="r">Actions</span></div>
   {pg.rows.map(u=><div className="tr" key={u.id}>
    <span className="ucell"><div className="avatar sm">{(u.name||'U')[0].toUpperCase()}</div><div><b>{u.name}</b><small>@{u.username}</small></div></span>
    <span><span className={'tag '+(u.role==='admin'?'st-inprogress':'')}>{u.role}</span></span>
    <span>{u.tasks}</span><span className="muted">{u.lastLogin?fmtDateTime(u.lastLogin):'Never'}</span>
    <span><span className={'tag '+(u.active?'st-done':'st-overdue')}>{u.active?'Active':'Disabled'}</span></span>
    <span className="r acts"><button className="btn small" onClick={()=>setReset(u)}>Reset password</button>
     {u.id!==user.id&&<><button className="btn small" onClick={()=>patch(u,{active:!u.active})}>{u.active?'Disable':'Enable'}</button>
     <button className="btn small danger" onClick={()=>setAsk({title:'Delete user',message:`${u.username} and all of their tasks will be permanently deleted.`,onYes:()=>del(u)})}>Delete</button></>}</span></div>)}
   {!list.length&&<div className="empty">No users found.</div>}</div>}
  <Pagination {...pg} label="users"/>
  {add&&<Modal title="Add user" onClose={()=>setAdd(null)}><form className="form" onSubmit={create}>
   <label>Full name<input value={add.name} onChange={e=>setAdd({...add,name:e.target.value})} autoFocus/></label>
   <div className="grid2"><label>Username<input required value={add.username} onChange={e=>setAdd({...add,username:e.target.value})}/></label>
   <label>Role<select value={add.role} onChange={e=>setAdd({...add,role:e.target.value})}><option value="user">User</option><option value="admin">Admin</option></select></label></div>
   <label>Password<div className="inline"><input value={add.password} onChange={e=>setAdd({...add,password:e.target.value})}/>
    <button type="button" className="btn" onClick={()=>setAdd({...add,password:genPassword()})}>Generate</button></div></label>
   {err&&<div className="err">{err}</div>}
   <div className="actions"><button type="button" className="btn" onClick={()=>setAdd(null)}>Cancel</button><button className="btn primary">Create user</button></div></form></Modal>}
  {reset&&<PasswordModal title={`Reset password – ${reset.username}`} allowGenerate onSubmit={({password})=>api(`/users/${reset.id}/password`,{method:'PUT',body:{password}}).then(()=>{navigator.clipboard?.writeText(password).catch(()=>{});say('Password reset – copied to clipboard');})} onClose={()=>setReset(null)}/>}
  {self&&<PasswordModal title="Change my password" needCurrent onSubmit={({current,password})=>api('/auth/password',{method:'PUT',body:{current,password}}).then(()=>say('Password changed'))} onClose={()=>setSelf(false)}/>}
  {ask&&<Confirm {...ask} onClose={()=>setAsk(null)}/>}
  {toast&&<div className="toast">{toast}</div>}
 </Shell>;
}
