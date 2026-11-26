import {useEffect,useRef} from 'react';
import Icon from './Icon.jsx';
import {sanitizeRichText} from '../utils/richText.js';

const tools=[
 ['bold','Bold','bold'],['italic','Italic','italic'],['underline','Underline','underline'],
 ['formatBlock','Heading 1','h1'],['formatBlock','Heading 2','h2'],
 ['insertUnorderedList','Bulleted list','ul'],['insertOrderedList','Numbered list','ol'],
 ['formatBlock','Quote','quote']
];
const command=(cmd,value)=>document.execCommand(cmd,false,value);

export default function RichTextEditor({value,onChange,label='Write your note here…'}){
 const editor=useRef(null);
 useEffect(()=>{
  if(editor.current&&document.activeElement!==editor.current){
   const safe=sanitizeRichText(value||'');
   if(editor.current.innerHTML!==safe)editor.current.innerHTML=safe;
  }
 },[value]);
 const apply=(cmd,val)=>{editor.current?.focus();command(cmd,val);onChange(sanitizeRichText(editor.current?.innerHTML||''));};
 return <div className="rich-editor">
  <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
   {tools.map(([cmd,title,key])=><button type="button" className="rich-tool" key={title} title={title} aria-label={title}
    onMouseDown={e=>e.preventDefault()} onClick={()=>apply(cmd,key==='h1'?'h1':key==='h2'?'h2':key==='quote'?'blockquote':undefined)}>
    {key==='bold'?<b>B</b>:key==='italic'?<i>I</i>:key==='underline'?<u>U</u>:key==='h1'?'H1':key==='h2'?'H2':<Icon n={key==='ul'?'list':key==='ol'?'list':'quote'} s={15}/>}
   </button>)}
  </div>
  <div ref={editor} className="rich-canvas" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
   data-placeholder={label} onInput={e=>{const safe=sanitizeRichText(e.currentTarget.innerHTML);if(safe!==e.currentTarget.innerHTML)e.currentTarget.innerHTML=safe;onChange(safe);}}
   onPaste={e=>{e.preventDefault();const text=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,text);}}/>
 </div>;
}
