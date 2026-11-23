import {useCallback,useEffect,useRef,useState} from 'react';import {api,setVaultToken} from './api.js';
const IDLE=5*60*1000;
export default function useVault(){
 const [unlocked,setUnlocked]=useState(false),[items,setItems]=useState([]);const timer=useRef(null);
 const lock=useCallback(()=>{setVaultToken(null);setUnlocked(false);setItems([]);clearTimeout(timer.current);},[]);
 const touch=useCallback(()=>{clearTimeout(timer.current);timer.current=setTimeout(lock,IDLE);},[lock]);
 const unlock=async password=>{
  const d=await api('/vault/unlock',{method:'POST',body:{password}});setVaultToken(d.token);
  try{setItems(await api('/vault/items',{vault:true}));}catch(e){setVaultToken(null);throw e;}
  setUnlocked(true);touch();
 };
 const run=async fn=>{try{touch();return await fn();}catch(e){if(e.locked)lock();throw e;}};
 const save=({id,type,data})=>run(async()=>{
  const r=id?await api('/vault/items/'+id,{method:'PUT',body:{type,data},vault:true}):await api('/vault/items',{method:'POST',body:{type,data},vault:true});
  setItems(p=>id?p.map(x=>x.id===r.id?r:x):[r,...p]);return r;
 });
 const remove=id=>run(async()=>{await api('/vault/items/'+id,{method:'DELETE',vault:true});setItems(p=>p.filter(x=>x.id!==id));});
 useEffect(()=>{if(!unlocked)return;const ev=['mousemove','keydown','click','scroll'],h=()=>touch();
  ev.forEach(e=>window.addEventListener(e,h,{passive:true}));return()=>ev.forEach(e=>window.removeEventListener(e,h));},[unlocked,touch]);
 useEffect(()=>()=>{setVaultToken(null);clearTimeout(timer.current);},[]);
 return{unlocked,items,unlock,lock,save,remove};
}
