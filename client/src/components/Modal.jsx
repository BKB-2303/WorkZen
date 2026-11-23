import {useEffect} from 'react';import Icon from './Icon.jsx';
export default function Modal({title,onClose,children,wide}){
 useEffect(()=>{const h=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[onClose]);
 return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
  <div className={'modal'+(wide?' wide':'')}><div className="mhead"><h3>{title}</h3><button className="iconbtn dark" onClick={onClose}><Icon n="x"/></button></div>{children}</div></div>;
}
