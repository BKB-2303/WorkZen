import Icon from './components/Icon.jsx';
import {ago} from './utils.js';

export default function Notifications({items,unread,loading,error,onRefresh,onClear,onClearOne,onOpen}){
 return <>
  <div className="phead"><div><h1>Due date alerts</h1><p className="muted">{unread?`${unread} unread overdue task${unread===1?'':'s'}`:'Alerts for tasks past their due date.'}</p></div>
   <div className="hbtns"><button className="btn" onClick={onRefresh}><Icon n="refresh"/> Refresh</button>
    <button className="btn danger" disabled={!items.length} onClick={onClear}><Icon n="trash"/> Clear all</button></div></div>
  {error&&<div className="err notif-error">{error}</div>}
  {loading&&!items.length?<div className="empty">Loading notifications…</div>:!items.length?
   <div className="empty notif-empty"><Icon n="inbox" s={28}/><b>No due date alerts</b><p>Overdue tasks will show up here.</p></div>
   :<div className="notif-list">{items.map(n=><article key={n.id} className={'notif-item'+(!n.readAt?' unread':'')}>
    <button className="notif-open" onClick={()=>onOpen(n)}>
     <span className="notif-icon overdue"><Icon n="alert" s={18}/></span>
     <span className="notif-copy"><b>{n.title}</b><span>{n.body}</span><small>{ago(n.createdAt)}</small></span>
     {!n.readAt&&<i className="notif-unread" aria-label="Unread"/>}
    </button>
    <button className="iconbtn dark notif-clear" aria-label="Clear notification" title="Clear notification" onClick={()=>onClearOne(n)}><Icon n="x" s={16}/></button>
   </article>)}</div>}
 </>;
}
