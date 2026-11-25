import Icon from './Icon.jsx';import {hue,ago,fmtTime,fmtDateTime} from '../utils.js';
const VERB={edited:'edited',shared:'shared',unshared:'stopped sharing',permission:'changed access to',copied:'saved a copy of',team:'',comment:'commented on'};
const ICON={edited:'edit',comment:'chat',shared:'share',unshared:'x',permission:'key',copied:'copy',team:'users'};
export const ACTIONS={edited:'Edit',shared:'Shared',unshared:'Stopped',permission:'Access',copied:'Copy',team:'Team',comment:'Comment'};
// One entry of the history. `time` = 'rel' (3 min ago) or 'clock' (10:32 AM, used under a day heading)
export function ActivityRow({a,showTitle=false,time='rel'}){
 return <div className={'arow a-'+a.action}>
  <div className="aico" style={{background:`hsl(${hue(a.actor.username||a.actor.name)} 55% 45%)`}} title={a.actor.name}>{(a.actor.name||'?')[0].toUpperCase()}</div>
  <div className="abody">
   <div className="aline"><b>{a.you?'You':a.actor.name}</b>{VERB[a.action]&&<span className="muted"> {VERB[a.action]}</span>}{showTitle&&a.title&&a.action!=='team'&&<b className="atitle"> {a.title}</b>}
    <span className={'atag t-'+a.action}><Icon n={ICON[a.action]||'clock'} s={11}/> {ACTIONS[a.action]||a.action}</span>
    <small className="atime" title={fmtDateTime(a.at)}>{time==='clock'?fmtTime(a.at):ago(a.at)}</small></div>
   {a.action==='comment'&&<div className="abubble">{a.text}</div>}
   {a.action!=='comment'&&a.text&&<div className="atext">{a.text}</div>}
   {a.changes&&a.changes.length>0&&<ul className="achg">{a.changes.map((c,i)=><li key={i}><b>{c.field}</b>{c.from?<>: <s>{c.from}</s> → <span>{c.to}</span></>:<>: {c.to}</>}</li>)}</ul>}
  </div></div>;
}
// Simple list (no filters). The full history screen is HistoryView.
export default function ActivityList({rows,showTitle=false,empty='No activity yet.'}){
 if(!rows)return <div className="muted pad">Loading…</div>;
 if(!rows.length)return <div className="muted pad">{empty}</div>;
 return <div className="alist">{rows.map(a=><ActivityRow key={a.id} a={a} showTitle={showTitle}/>)}</div>;
}
