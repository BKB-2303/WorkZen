import {useEffect,useMemo,useState} from 'react';import {api} from './api.js';
import Icon from './components/Icon.jsx';import Modal from './components/Modal.jsx';import {host,hue} from './utils.js';

function BookmarkModal({item,cats,onSave,onClose}){
 const [f,setF]=useState({url:'',title:'',description:'',category:'General',favorite:false,...item}),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');try{await onSave({url:f.url,title:f.title,description:f.description,category:f.category,favorite:f.favorite});onClose();}catch(x){setErr(x.message);setBusy(false);}};
 return <Modal title={item?._id?'Edit bookmark':'New bookmark'} onClose={onClose}><form className="form" onSubmit={go}>
  <label>Website address<input required autoFocus value={f.url} onChange={set('url')} placeholder="https://example.com"/></label>
  <label>Title (optional)<input value={f.title} onChange={set('title')} maxLength={120} placeholder="Defaults to the website name"/></label>
  <label>Description<input value={f.description} onChange={set('description')} maxLength={300}/></label>
  <div className="grid2"><label>Category<input list="bcats" value={f.category} onChange={set('category')}/><datalist id="bcats">{cats.map(c=><option key={c} value={c}/>)}</datalist></label>
   <label className="chk fav"><input type="checkbox" checked={f.favorite} onChange={e=>setF({...f,favorite:e.target.checked})}/> Important (pin first)</label></div>
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div></form></Modal>;
}

export default function Bookmarks({say,ask}){
 const [list,setList]=useState([]),[loading,setLoading]=useState(true),[q,setQ]=useState(''),[cat,setCat]=useState('all'),[sort,setSort]=useState('fav'),[favOnly,setFavOnly]=useState(false),[modal,setModal]=useState(null);
 useEffect(()=>{api('/bookmarks').then(setList).finally(()=>setLoading(false));},[]);
 const cats=useMemo(()=>[...new Set(list.map(b=>b.category))].sort(),[list]);
 const needle=q.toLowerCase();
 const shown=list.filter(b=>(cat==='all'||b.category===cat)&&(!favOnly||b.favorite)&&(!needle||(b.title+' '+b.url+' '+b.description+' '+b.category).toLowerCase().includes(needle)))
  .sort((a,b)=>sort==='visits'?b.visits-a.visits:sort==='recent'?String(b.createdAt).localeCompare(String(a.createdAt)):sort==='az'?a.title.localeCompare(b.title):(b.favorite-a.favorite)||(b.visits-a.visits)||a.title.localeCompare(b.title));
 const save=async(d,old)=>{
  if(old?._id){const u=await api('/bookmarks/'+old._id,{method:'PUT',body:d});setList(p=>p.map(x=>x._id===u._id?u:x));say('Bookmark updated');}
  else{const c=await api('/bookmarks',{method:'POST',body:d});setList(p=>[c,...p]);say('Bookmark added');}
 };
 const open=b=>{window.open(b.url,'_blank','noopener,noreferrer');api('/bookmarks/'+b._id+'/visit',{method:'POST'}).then(u=>setList(p=>p.map(x=>x._id===u._id?u:x))).catch(()=>{});};
 const fav=b=>api('/bookmarks/'+b._id,{method:'PUT',body:{favorite:!b.favorite}}).then(u=>setList(p=>p.map(x=>x._id===u._id?u:x))).catch(e=>say(e.message));
 const del=b=>ask({title:'Delete bookmark',message:`“${b.title}” will be removed.`,onYes:()=>api('/bookmarks/'+b._id,{method:'DELETE'}).then(()=>{setList(p=>p.filter(x=>x._id!==b._id));say('Bookmark deleted');}).catch(e=>say(e.message))});
 return <>
  <div className="phead"><div><h1>Bookmarks</h1><p className="muted">Important websites, one click away.</p></div><button className="btn primary" onClick={()=>setModal({})}><Icon n="plus"/> Add bookmark</button></div>
  <div className="stats s3">{[['Bookmarks',list.length,'c-dark'],['Important',list.filter(b=>b.favorite).length,'c-amber'],['Categories',cats.length,'c-blue']].map(([l,v,c])=><div className="stat" key={l}><small>{l.toUpperCase()}</small><b className={c}>{v}</b></div>)}</div>
  <div className="filters"><div className="search"><Icon n="search"/><input placeholder="Search bookmarks" value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={cat} onChange={e=>setCat(e.target.value)}><option value="all">All categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select>
   <select value={sort} onChange={e=>setSort(e.target.value)}><option value="fav">Sort: Important first</option><option value="visits">Sort: Most visited</option><option value="recent">Sort: Recently added</option><option value="az">Sort: A–Z</option></select>
   <button className={'btn'+(favOnly?' primary':'')} onClick={()=>setFavOnly(!favOnly)}><Icon n="star" f={favOnly}/> Important</button></div>
  {loading?<div className="empty">Loading…</div>:!list.length?<div className="empty"><b>No bookmarks yet</b><p>Save the websites you use every day.</p></div>
  :!shown.length?<div className="empty">No bookmarks match.</div>
  :<div className="vgrid">{shown.map(b=><div className="vcard bm" key={b._id}>
   <div className="vtop" onClick={()=>open(b)} style={{cursor:'pointer'}}><div className="vav" style={{background:`hsl(${hue(host(b.url))} 58% 46%)`}}>{(b.title||'?')[0].toUpperCase()}</div>
    <div className="vmeta"><b>{b.title}</b><small>{host(b.url)}</small></div>
    <button className={'star'+(b.favorite?' on':'')} onClick={e=>{e.stopPropagation();fav(b);}}><Icon n="star" f={b.favorite}/></button></div>
   {b.description&&<p className="vnotes">{b.description}</p>}
   <div className="vfoot"><span className="tag">{b.category}</span><small>{b.visits} visit{b.visits===1?'':'s'}</small><span className="grow"/>
    <button className="iconbtn dark" title="Open" onClick={()=>open(b)}><Icon n="link"/></button>
    <button className="iconbtn dark" title="Edit" onClick={()=>setModal(b)}><Icon n="edit"/></button>
    <button className="iconbtn dark" title="Delete" onClick={()=>del(b)}><Icon n="trash"/></button></div></div>)}</div>}
  {modal&&<BookmarkModal item={modal._id?modal:null} cats={cats} onSave={d=>save(d,modal)} onClose={()=>setModal(null)}/>}
 </>;
}
