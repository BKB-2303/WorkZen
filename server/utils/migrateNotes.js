// One-time helper: copies old encrypted "Secure notes" into the new open Notes collection.
// Saved passwords from the old vault are NOT touched or copied. Safe to run on every start.
const Note=require('../models/Note');const VaultItem=require('../models/VaultItem');
module.exports=async()=>{
 if(!/^[0-9a-f]{64}$/i.test(process.env.VAULT_KEY||''))return;
 const {decrypt}=require('./vaultCrypto');
 const old=await VaultItem.find({type:'note'}).lean();let n=0;
 for(const d of old){
  try{
   const x=decrypt(d.blob,d.user);
   await Note.create({user:d.user,title:(x.title||'').slice(0,120),content:String(x.content||'').slice(0,20000),category:x.category||'General',pinned:!!x.favorite,createdAt:d.createdAt,updatedAt:d.updatedAt});
   await VaultItem.deleteOne({_id:d._id});n++;
  }catch(e){/* unreadable – leave as is */}
 }
 if(n)console.log(`Migrated ${n} secure note(s) to open Notes`);
};
