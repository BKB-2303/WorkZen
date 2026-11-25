const m=require('mongoose');
const s=new m.Schema({
 from:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 to:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 kind:{type:String,enum:['task','note','bookmark'],required:true},
 item:{type:m.Schema.Types.ObjectId,required:true,index:true}
},{timestamps:true,collection:'shares'});
s.index({from:1,to:1,kind:1,item:1},{unique:true});
module.exports=m.model('Share',s);
