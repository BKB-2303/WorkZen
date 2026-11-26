import {useEffect,useState} from 'react';import Icon from './Icon.jsx';import ProfileModal from './ProfileModal.jsx';import UserAvatar from './UserAvatar.jsx';
export default function Shell({user,children,nav,bottom,onLogout,onPassword,onUserChange,theme,onTheme,navKey}){
 const [open,setOpen]=useState(false),[profile,setProfile]=useState(false),[current,setCurrent]=useState(user);
 useEffect(()=>{setOpen(false);},[navKey]);
 useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow='';};},[open]);
 return <div className="shell">
  <header className="topbar"><button className="iconbtn" aria-label="Menu" onClick={()=>setOpen(true)}><Icon n="menu" s={22}/></button>
   <div className="brand"><div className="logo sm">W</div><b>WorkZen</b></div><span className="grow"/>
   <button className="iconbtn" aria-label="Theme" onClick={onTheme}><Icon n={theme==='dark'?'sun':'moon'} s={20}/></button></header>
  {open&&<div className="scrim" onClick={()=>setOpen(false)}/>}
  <aside className={'side'+(open?' open':'')}>
   <div className="brand"><div className="logo">W</div><div><b>WorkZen</b><small>{user.role==='admin'?'Administration':'Plan. Track. Deliver.'}</small></div>
    <button className="iconbtn closeside" aria-label="Close menu" onClick={()=>setOpen(false)}><Icon n="x" s={20}/></button></div>
   <div className="userbox"><UserAvatar user={current}/>
    <div className="uinfo"><b>{current.name}</b><small>{current.role.toUpperCase()}</small></div>
    <button className="iconbtn" title="Profile settings" aria-label="Profile settings" onClick={()=>setProfile(true)}><Icon n="edit"/></button>
    <button className="iconbtn" title={theme==='dark'?'Light mode':'Dark mode'} onClick={onTheme}><Icon n={theme==='dark'?'sun':'moon'}/></button>
    <button className="iconbtn" title="Change password" onClick={onPassword}><Icon n="key"/></button>
    <button className="iconbtn" title="Log out" onClick={onLogout}><Icon n="power"/></button></div>
   {nav}
  </aside>
  <main className="main">{children}</main>
  {bottom}
  {profile&&<ProfileModal user={current} onSave={next=>{setCurrent(next);onUserChange?.(next);}} onClose={()=>setProfile(false)}/>}
 </div>;
}
