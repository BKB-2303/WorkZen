import {useEffect,useState} from 'react';import {api} from './api.js';
import Login from './Login.jsx';import Workspace from './Workspace.jsx';import AdminUsers from './AdminUsers.jsx';
export default function App(){
 const [user,setUser]=useState(null),[ready,setReady]=useState(false);
 const [theme,setTheme]=useState(()=>localStorage.getItem('bkb_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('bkb_theme',theme);},[theme]);
 useEffect(()=>{if(!localStorage.getItem('bkb_token'))return setReady(true);
  api('/auth/me').then(setUser).catch(()=>localStorage.removeItem('bkb_token')).finally(()=>setReady(true));},[]);
 const logout=()=>{localStorage.removeItem('bkb_token');setUser(null);};
 const toggle=()=>setTheme(t=>t==='dark'?'light':'dark');
 if(!ready)return <div className="loginbg"><div className="muted">Loading…</div></div>;
 if(!user)return <Login onLogin={setUser}/>;
 return user.role==='admin'?<AdminUsers user={user} onLogout={logout} theme={theme} onTheme={toggle}/>:<Workspace user={user} onLogout={logout} theme={theme} onTheme={toggle}/>;
}
