// Tiny dependency-free PDF writer (A4, Helvetica). Coordinates: origin top-left, units = points.
const HW=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BW=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const WIN={0x20AC:0x80,0x2026:0x85,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2122:0x99,0xA0:0x20};
const enc=s=>{let o='';for(const ch of String(s??'')){let c=ch.codePointAt(0);
 if(WIN[c]!==undefined)c=WIN[c];else if(c===0x20B9){o+='Rs';continue;}else if(c<32||(c>126&&c<160)||c>255)c=63;
 o+=String.fromCharCode(c);}return o;};
const esc=s=>s.replace(/[\\()]/g,m=>'\\'+m);
const hex=h=>{h=h.replace('#','');return[0,2,4].map(i=>(parseInt(h.slice(i,i+2),16)/255).toFixed(3)).join(' ');};
const n=v=>(+v).toFixed(2).replace(/\.?0+$/,'')||'0';
export const W=595.28,H=841.89;

export class Pdf{
 constructor(meta={}){this.pages=[];this.meta=meta;this.add();}
 add(){this.ops=[];this.pages.push(this.ops);return this.pages.length;}
 get page(){return this.pages.length;}
 goto(i){this.ops=this.pages[i-1];}
 // ---- measuring ----
 width(s,size=10,bold=false){const t=bold?BW:HW;let w=0;for(const ch of enc(s)){const c=ch.charCodeAt(0);w+=(c>=32&&c<=126?t[c-32]:556);}return w*size/1000;}
 wrap(s,maxW,size=10,bold=false){
  const out=[];
  for(const para of String(s??'').split(/\r?\n/)){
   let line='';
   for(const word of para.split(/\s+/).filter(Boolean)){
    let w=word;
    while(this.width(w,size,bold)>maxW){ // hard-break very long words
     let k=w.length;while(k>1&&this.width(w.slice(0,k),size,bold)>maxW)k--;
     if(line){out.push(line);line='';}out.push(w.slice(0,k));w=w.slice(k);}
    const t=line?line+' '+w:w;
    if(this.width(t,size,bold)<=maxW)line=t;else{out.push(line);line=w;}
   }
   out.push(line);
  }
  return out;
 }
 fit(s,maxW,size=10,bold=false){s=String(s??'');if(this.width(s,size,bold)<=maxW)return s;
  while(s.length>1&&this.width(s+'…',size,bold)>maxW)s=s.slice(0,-1);return s.trimEnd()+'…';}
 // ---- drawing ----
 text(x,y,s,{size=10,bold=false,color='#1b2540',align='left',w}={}){
  s=String(s??'');if(!s)return;
  const tw=this.width(s,size,bold);if(align==='right')x=x-tw;else if(align==='center')x=x-tw/2;
  this.ops.push(`BT /${bold?'F2':'F1'} ${n(size)} Tf ${hex(color)} rg ${n(x)} ${n(H-y)} Td (${esc(enc(s))}) Tj ET`);
 }
 rect(x,y,w,h,{fill,stroke,r=0,lw=0.8}={}){
  const o=this.ops;if(fill)o.push(hex(fill)+' rg');if(stroke)o.push(hex(stroke)+' RG '+n(lw)+' w');
  const Y=H-y-h;
  if(r>0){r=Math.min(r,w/2,h/2);const k=r*0.5523;
   o.push(`${n(x+r)} ${n(Y)} m ${n(x+w-r)} ${n(Y)} l ${n(x+w-r+k)} ${n(Y)} ${n(x+w)} ${n(Y+r-k)} ${n(x+w)} ${n(Y+r)} c ${n(x+w)} ${n(Y+h-r)} l ${n(x+w)} ${n(Y+h-r+k)} ${n(x+w-r+k)} ${n(Y+h)} ${n(x+w-r)} ${n(Y+h)} c ${n(x+r)} ${n(Y+h)} l ${n(x+r-k)} ${n(Y+h)} ${n(x)} ${n(Y+h-r+k)} ${n(x)} ${n(Y+h-r)} c ${n(x)} ${n(Y+r)} l ${n(x)} ${n(Y+r-k)} ${n(x+r-k)} ${n(Y)} ${n(x+r)} ${n(Y)} c h`);
  }else o.push(`${n(x)} ${n(Y)} ${n(w)} ${n(h)} re`);
  o.push(fill&&stroke?'B':fill?'f':'S');
 }
 line(x1,y1,x2,y2,{color='#dfe5f1',lw=0.8,dash}={}){
  this.ops.push(`${hex(color)} RG ${n(lw)} w ${dash?`[${dash}] 0 d `:''}${n(x1)} ${n(H-y1)} m ${n(x2)} ${n(H-y2)} l S${dash?' [] 0 d':''}`);
 }
 poly(pts,{fill}){
  this.ops.push(hex(fill)+' rg '+pts.map((p,i)=>`${n(p[0])} ${n(H-p[1])} ${i?'l':'m'}`).join(' ')+' h f');
 }
 // ring segment (angles in degrees, 0 = top, clockwise)
 arc(cx,cy,r1,r2,a0,a1,{fill}){
  const steps=Math.max(2,Math.ceil(Math.abs(a1-a0)/4)),pts=[];
  const P=(r,a)=>{const t=(a-90)*Math.PI/180;return[cx+r*Math.cos(t),cy+r*Math.sin(t)];};
  for(let i=0;i<=steps;i++)pts.push(P(r2,a0+(a1-a0)*i/steps));
  for(let i=steps;i>=0;i--)pts.push(P(r1,a0+(a1-a0)*i/steps));
  this.poly(pts,{fill});
 }
 circle(cx,cy,r,{fill}){this.arc(cx,cy,0.001,r,0,359.9,{fill});}
 // ---- output ----
 build(){
  const objs=[];const add=s=>{objs.push(s);return objs.length;};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');// 2 = pages (filled later)
  const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids=[];
  for(const ops of this.pages){
   const body=ops.join('\n');
   const c=add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
   kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  objs[1]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const d=new Date(),p2=v=>String(v).padStart(2,'0');
  const date=`D:${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const info=add(`<< /Title (${esc(enc(this.meta.title||'Report'))}) /Author (${esc(enc(this.meta.author||''))}) /Creator (WorkZen) /Producer (WorkZen) /CreationDate (${date}) >>`);
  let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];
  objs.forEach((o,i)=>{off.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const x=out.length;
  out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${x}\n%%EOF`;
  const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;
  return u;
 }
 blob(){return new Blob([this.build()],{type:'application/pdf'});}
}
