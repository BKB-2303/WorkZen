const m=require('mongoose');
const s=new m.Schema({
 task:{type:m.Schema.Types.ObjectId,ref:'Task',required:true,index:true},
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 status:{type:String,enum:['todo','inprogress','done'],default:'todo'},
 checklist:{type:[Boolean],default:[]},
 completedAt:{type:Date,default:null}
},{timestamps:true,collection:'taskprogress'});
s.index({task:1,user:1},{unique:true});
module.exports=m.model('TaskProgress',s);
