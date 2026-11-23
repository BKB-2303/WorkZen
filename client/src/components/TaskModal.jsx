import {useState} from 'react';import Modal from './Modal.jsx';import Icon from './Icon.jsx';import {todayStr,addDays} from '../utils.js';
export default function TaskModal({task,projects,onSave,onClose}){
 const [f,setF]=useState({title:'',notes:'',project:'General',priority:'Medium',status:'todo',dueDate:todayStr(),checklist:[],...task});
 const [item,setItem]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
 const set=k=>e=>setF({...f,[k]:e.target.value});
 const addItem=()=>{if(item.trim()){setF({...f,checklist:[...f.checklist,{text:item.trim(),done:false}]});setItem('');}};
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');
  try{await onSave({title:f.title,notes:f.notes,project:f.project,priority:f.priority,status:f.status,dueDate:f.dueDate,checklist:f.checklist});onClose();}
  catch(x){setErr(x.message);setBusy(false);}};
 return <Modal wide title={task?._id?'Edit task':'New task'} onClose={onClose}><form onSubmit={go} className="form">
  <label>Title<input required value={f.title} onChange={set('title')} autoFocus maxLength={200} placeholder="What needs to be done?"/></label>
  <label>Notes<textarea rows="3" value={f.notes} onChange={set('notes')} placeholder="Add details, links or context"/></label>
  <div className="grid2">
   <label>Project<input list="projs" value={f.project} onChange={set('project')}/><datalist id="projs">{projects.map(p=><option key={p} value={p}/>)}</datalist></label>
   <label>Due date<input type="date" required value={f.dueDate} onChange={set('dueDate')}/>
    <div className="chips">{[['Today',0],['Tomorrow',1],['Next week',7]].map(([l,n])=><button type="button" key={l} className="chip" onClick={()=>setF({...f,dueDate:addDays(n)})}>{l}</button>)}</div></label>
   <label>Priority<select value={f.priority} onChange={set('priority')}><option>Low</option><option>Medium</option><option>High</option></select></label>
   <label>Status<select value={f.status} onChange={set('status')}><option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option></select></label></div>
  <label>Checklist
   <div className="inline"><input value={item} onChange={e=>setItem(e.target.value)} placeholder="Add a step and press Enter" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addItem();}}}/>
    <button type="button" className="btn" onClick={addItem}><Icon n="plus"/></button></div></label>
  {f.checklist.length>0&&<div className="clist">{f.checklist.map((c,i)=><div className="citem" key={i}>
   <input type="checkbox" checked={c.done} onChange={()=>setF({...f,checklist:f.checklist.map((x,j)=>j===i?{...x,done:!x.done}:x)})}/>
   <span className={c.done?'strike':''}>{c.text}</span>
   <button type="button" className="iconbtn dark" onClick={()=>setF({...f,checklist:f.checklist.filter((_,j)=>j!==i)})}><Icon n="x" s={14}/></button></div>)}</div>}
  {err&&<div className="err">{err}</div>}
  <div className="actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save task</button></div>
 </form></Modal>;
}
