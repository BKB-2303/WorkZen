const c=require('crypto');
const key=uid=>Buffer.from(c.hkdfSync('sha256',Buffer.from(process.env.VAULT_KEY,'hex'),Buffer.from(String(uid)),Buffer.from('bkb-workzen-vault'),32));
exports.encrypt=(obj,uid)=>{
 const iv=c.randomBytes(12),ci=c.createCipheriv('aes-256-gcm',key(uid),iv);
 const data=Buffer.concat([ci.update(JSON.stringify(obj),'utf8'),ci.final()]);
 return{iv:iv.toString('base64'),tag:ci.getAuthTag().toString('base64'),data:data.toString('base64')};
};
exports.decrypt=(b,uid)=>{
 const d=c.createDecipheriv('aes-256-gcm',key(uid),Buffer.from(b.iv,'base64'));d.setAuthTag(Buffer.from(b.tag,'base64'));
 return JSON.parse(Buffer.concat([d.update(Buffer.from(b.data,'base64')),d.final()]).toString('utf8'));
};
