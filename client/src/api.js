let vtoken=null;
export const setVaultToken=t=>{vtoken=t;};
export async function api(path,{method='GET',body,vault=false}={}){
 const token=localStorage.getItem('bkb_token');
 const res=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(vault&&vtoken?{'X-Vault-Token':vtoken}:{})},body:body?JSON.stringify(body):undefined});
 const nt=res.headers.get('X-Vault-Token');if(vault&&nt)vtoken=nt;
 const data=await res.json().catch(()=>({}));
 if(res.status===401&&token&&path!=='/auth/login'){localStorage.removeItem('bkb_token');location.reload();}
 if(res.status===423){const e=new Error(data.message||'Vault is locked');e.locked=true;throw e;}
 if(!res.ok)throw new Error(data.message||'Request failed');
 return data;
}
