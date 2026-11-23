import Modal from './Modal.jsx';
export default function Confirm({title,message,label='Delete',onYes,onClose}){
 return <Modal title={title} onClose={onClose}><p className="muted" style={{marginTop:0}}>{message}</p>
  <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn dangerfill" autoFocus onClick={()=>{onYes();onClose();}}>{label}</button></div></Modal>;
}
