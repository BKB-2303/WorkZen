const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 type:{type:String,enum:['password','note'],required:true},
 blob:{iv:String,tag:String,data:String}
},{timestamps:true,collection:'vaultitems'});
module.exports=m.model('VaultItem',s);
