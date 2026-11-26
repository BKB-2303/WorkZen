const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 thread:{type:String,required:true,index:true},
 clearedAt:{type:Date,required:true}
},{timestamps:true,collection:'chatclears'});
s.index({user:1,thread:1},{unique:true});
module.exports=m.model('ChatClear',s);
