const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 title:{type:String,required:true,trim:true,maxlength:120},
 url:{type:String,required:true,maxlength:2000},
 description:{type:String,default:'',maxlength:300},
 category:{type:String,default:'General',trim:true,maxlength:40},
 favorite:{type:Boolean,default:false},
 visits:{type:Number,default:0},
 lastVisited:{type:Date,default:null}
},{timestamps:true,collection:'bookmarks'});
module.exports=m.model('Bookmark',s);
