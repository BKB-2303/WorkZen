import {useEffect,useMemo,useState} from 'react';import Icon from './Icon.jsx';

// Client-side paging for a list that is already in memory.
//   const pg=usePaged(list,{size:20,key:filterString,store:'tasks'});  ->  pg.rows is the current page
//   <Pagination {...pg}/>
export function usePaged(items,{size:def=20,key='',store}={}){
 const [size,setS]=useState(()=>{try{return +localStorage.getItem('bkb_ps_'+store)||def;}catch(e){return def;}});
 const [page,setPage]=useState(1);
 const total=items.length,pages=Math.max(1,Math.ceil(total/size));
 useEffect(()=>{setPage(1);},[key,size]);
 const p=Math.min(page,pages);
 const rows=useMemo(()=>items.slice((p-1)*size,p*size),[items,p,size]);
 const setSize=n=>{if(store)try{localStorage.setItem('bkb_ps_'+store,String(n));}catch(e){}setS(n);};
 return {rows,page:p,pages,total,size,from:total?(p-1)*size+1:0,to:Math.min(p*size,total),onPage:setPage,onSize:store?setSize:undefined};
}

const nums=(p,n)=>{ // 1 … 4 5 [6] 7 8 … 20
 if(n<=7)return Array.from({length:n},(_,i)=>i+1);
 const s=new Set([1,2,p-1,p,p+1,n-1,n]);const l=[...s].filter(x=>x>=1&&x<=n).sort((a,b)=>a-b),o=[];
 l.forEach((x,i)=>{if(i&&x-l[i-1]>1)o.push('…'+x);o.push(x);});return o;
};

// Page buttons. Works for client paging (usePaged) and server paging ({page,pages,total,size,onPage}).
export default function Pagination({page,pages,total,size,from,to,onPage,onSize,sizes=[10,20,50,100],compact,label='items',className=''}){
 if(!total||(pages<=1&&(!onSize||total<=Math.min(...sizes))))return null;
 const a=from??((page-1)*size+1),b=to??Math.min(page*size,total);
 return <nav className={'pager'+(compact?' compact':'')+' '+className} aria-label="Pagination">
  <small className="pinfo">{compact?`${a}–${b} of ${total}`:`Showing ${a}–${b} of ${total} ${label}`}</small>
  <div className="pbtns">
   {!compact&&<button className="pbtn" disabled={page<=1} onClick={()=>onPage(1)} title="First page">«</button>}
   <button className="pbtn" disabled={page<=1} onClick={()=>onPage(page-1)} aria-label="Previous page"><Icon n="left" s={14}/></button>
   {compact?<span className="pcur">{page} / {pages}</span>:nums(page,pages).map(x=>typeof x==='string'?<span className="pdots" key={x}>…</span>:<button key={x} className={'pbtn'+(x===page?' on':'')} onClick={()=>onPage(x)} aria-current={x===page?'page':undefined}>{x}</button>)}
   <button className="pbtn" disabled={page>=pages} onClick={()=>onPage(page+1)} aria-label="Next page"><Icon n="right" s={14}/></button>
   {!compact&&<button className="pbtn" disabled={page>=pages} onClick={()=>onPage(pages)} title="Last page">»</button>}
  </div>
  {onSize&&!compact&&<select className="psize" value={size} onChange={e=>onSize(+e.target.value)} aria-label="Items per page">{sizes.map(n=><option key={n} value={n}>{n} / page</option>)}</select>}
 </nav>;
}
