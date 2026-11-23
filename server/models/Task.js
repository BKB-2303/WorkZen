const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true},
 title:{type:String,required:true,trim:true,maxlength:200},
 notes:{type:String,default:'',maxlength:2000},
 project:{type:String,default:'General',trim:true,maxlength:60},
 priority:{type:String,enum:['Low','Medium','High'],default:'Medium'},
 status:{type:String,enum:['todo','inprogress','done'],default:'todo'},
 dueDate:{type:String,required:true,match:/^\d{4}-\d{2}-\d{2}$/},
 checklist:{type:[new m.Schema({text:{type:String,maxlength:200},done:{type:Boolean,default:false}},{_id:false})],default:[]},
 completedAt:{type:Date,default:null}
},{timestamps:true,collection:'worktasks'});
s.index({user:1,dueDate:-1});
module.exports=m.model('Task',s);
