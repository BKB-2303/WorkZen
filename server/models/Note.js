const m=require('mongoose');
const s=new m.Schema({
 user:{type:m.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 title:{type:String,default:'',trim:true,maxlength:120},
 content:{type:String,default:'',maxlength:20000},
 category:{type:String,default:'General',trim:true,maxlength:40},
 color:{type:String,enum:['default','yellow','green','blue','pink','purple'],default:'default'},
 pinned:{type:Boolean,default:false}
},{timestamps:true,collection:'notes'});
module.exports=m.model('Note',s);
