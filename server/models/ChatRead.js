const m=require('mongoose');
// When a person last opened a conversation (used for unread counters)
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true},
 thread:{type:String,required:true},
 at:{type:Date,default:Date.now}
},{collection:'chatreads'});
s.index({user:1,thread:1},{unique:true});
module.exports=m.model('ChatRead',s);
