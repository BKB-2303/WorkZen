const m=require('mongoose');
// History log: edits, comments, sharing actions and team events
const s=new m.Schema({
 actor:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 owner:{type:m.Schema.Types.ObjectId,ref:'User',index:true},
 team:{type:m.Schema.Types.ObjectId,ref:'Team',index:true},
 kind:{type:String,default:''},
 item:{type:m.Schema.Types.ObjectId,index:true},
 title:{type:String,default:'',maxlength:200},
 action:{type:String,required:true},   // edited | comment | shared | unshared | permission | copied | team
 changes:{type:[new m.Schema({field:String,from:String,to:String},{_id:false})],default:[]},
 text:{type:String,default:'',maxlength:1000}
},{timestamps:{createdAt:true,updatedAt:false},collection:'activity'});
module.exports=m.model('Activity',s);
