export function Donut({data,center,sub}){
 const total=data.reduce((a,d)=>a+d.value,0)||1,R=52,C=2*Math.PI*R;let off=0;
 return <svg viewBox="0 0 140 140" className="donut"><circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="16"/>
  {data.filter(d=>d.value).map(d=>{const len=d.value/total*C;const el=<circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${len} ${C-len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"/>;off+=len;return el;})}
  <text x="70" y="70" textAnchor="middle" className="dnum">{center}</text><text x="70" y="88" textAnchor="middle" className="dsub">{sub}</text></svg>;
}
export function HBars({rows}){
 const max=Math.max(1,...rows.map(r=>r.value));
 return <div className="hbars">{rows.map(r=><div className="hrow" key={r.label}><span className="hl" title={r.label}>{r.label}</span>
  <div className="htrack"><i style={{width:r.value/max*100+'%',background:r.color||'var(--brand)'}}/></div><b>{r.value}</b></div>)}</div>;
}
export function Columns({values}){
 const max=Math.max(1,...values.map(v=>v.value));
 return <div className="cols">{values.map(v=><div className="col" key={v.label} title={`${v.label}: ${v.value}`}>
  <div className="ctrack"><i style={{height:v.value/max*100+'%'}}/></div><small>{v.label}</small></div>)}</div>;
}
