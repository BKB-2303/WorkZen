const ALLOWED=new Set(['P','BR','STRONG','B','EM','I','U','H1','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function sanitizeRichText(value=''){
 const doc=new DOMParser().parseFromString(String(value),'text/html');
 const clean=node=>{
  if(node.nodeType===Node.TEXT_NODE)return escapeText(node.nodeValue||'');
  if(node.nodeType!==Node.ELEMENT_NODE)return '';
  const tag=node.tagName,children=[...node.childNodes].map(clean).join('');
  if(!ALLOWED.has(tag))return children;
  if(tag==='BR')return '<br>';
  if(tag==='A'){
   const href=node.getAttribute('href')||'';
   if(!/^(https?:|mailto:)/i.test(href))return children;
   return `<a href="${escapeText(href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
  }
  return `<${tag.toLowerCase()}>${children}</${tag.toLowerCase()}>`;
 };
 return [...doc.body.childNodes].map(clean).join('');
}

export function richTextToText(value=''){
 const doc=new DOMParser().parseFromString(sanitizeRichText(value),'text/html');
 return doc.body.textContent||'';
}
