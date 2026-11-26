export default function UserAvatar({user={},className='',online}){
 return <span className={`avatar ${className} ${online===undefined?'':online?'presence-online':'presence-offline'}`}>
  {user.avatar?<img src={user.avatar} alt="" />:(user.name||user.username||'U')[0].toUpperCase()}
  {online!==undefined&&<i aria-label={online?'Online':'Offline'} title={online?'Online':'Offline'}/>}
 </span>;
}
