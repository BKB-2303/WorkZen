const m=require('mongoose');
// One "grant": owner (from) gives a person (to) or a team (team) access to an item or a folder of tasks.
// kind = task | note | bookmark | folder.   folder = {year, month(0-11), project} (any can be null = "all")
const s=new m.Schema({
 from:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 to:{type:m.Schema.Types.ObjectId,ref:'User',index:true},
 team:{type:m.Schema.Types.ObjectId,ref:'Team',index:true},
 kind:{type:String,enum:['task','note','bookmark','folder'],required:true},
 item:{type:m.Schema.Types.ObjectId,index:true},
 folder:{year:{type:String,default:null},month:{type:Number,default:null},project:{type:String,default:null}},
 perm:{type:String,enum:['view','edit'],default:'view'},
 canCopy:{type:Boolean,default:false},
 expiresAt:{type:Date,default:null}
},{timestamps:true,collection:'shares'});
module.exports=m.model('Share',s);
