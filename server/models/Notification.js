const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 key:{type:String,required:true},
 type:{type:String,enum:['overdue'],required:true},
 title:{type:String,required:true,maxlength:200},
 body:{type:String,default:'',maxlength:300},
 target:{type:m.Schema.Types.Mixed,default:null},
 readAt:{type:Date,default:null},
 resolvedAt:{type:Date,default:null},
 clearedAt:{type:Date,default:null}
},{timestamps:{createdAt:true,updatedAt:false},collection:'notifications'});
s.index({user:1,key:1},{unique:true});
s.index({user:1,createdAt:-1});
module.exports=m.model('Notification',s);
