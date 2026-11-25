const m=require('mongoose');
const s=new m.Schema({
 name:{type:String,required:true,trim:true,maxlength:60},
 description:{type:String,default:'',trim:true,maxlength:300},
 owner:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 members:{type:[new m.Schema({user:{type:m.Schema.Types.ObjectId,ref:'User',required:true},role:{type:String,enum:['admin','member'],default:'member'},addedAt:{type:Date,default:Date.now}},{_id:false})],default:[]}
},{timestamps:true,collection:'teams'});
s.index({'members.user':1});
module.exports=m.model('Team',s);
