// One definition of "a normal, active person" used by sharing, teams and chat.
// Accounts with a missing role (created by hand in Atlas, restored, older versions) still count as normal users.
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const normal=()=>({role:{$ne:'admin'},active:{$ne:false}});
const byUsername=name=>({username:new RegExp('^'+esc(String(name||'').trim())+'$','i')});
module.exports={normal,byUsername,esc};
