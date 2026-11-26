const m=require('mongoose');
// One chat message. Every conversation has a `thread` key:
//   team:<teamId>   dm:<idA>:<idB> (sorted)   item:<itemId>   folder:<ownerId>:<year>:<month>:<project>
const s=new m.Schema({
 thread:{type:String,required:true,index:true},
 scope:{type:String,enum:['team','direct','item','folder'],required:true},
 sender:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 team:{type:m.Schema.Types.ObjectId,ref:'Team',index:true},
 owner:{type:m.Schema.Types.ObjectId,ref:'User'},          // owner of the shared item/folder (can moderate)
 pair:{type:[m.Schema.Types.ObjectId],default:undefined,index:true}, // the two people of a direct chat
 kind:{type:String,enum:['text','sticker'],default:'text'},
 sticker:{type:String,default:'',maxlength:16},
 text:{type:String,default:'',maxlength:2000},
 replyTo:{type:new m.Schema({id:m.Schema.Types.ObjectId,name:String,text:String},{_id:false}),default:undefined},
 editedAt:{type:Date,default:null},
 deleted:{type:Boolean,default:false}
},{timestamps:true,collection:'chatmessages'});
s.index({thread:1,createdAt:-1});
module.exports=m.model('Message',s);
