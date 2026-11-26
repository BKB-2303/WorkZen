const m=require('mongoose');
module.exports=m.model('User',new m.Schema({
 name:{type:String,trim:true,default:''},
 username:{type:String,required:true,unique:true,trim:true},
 password:{type:String,required:true},
 role:{type:String,enum:['admin','user'],default:'user'},
 active:{type:Boolean,default:true},
 lastLogin:{type:Date,default:null},
 lastSeen:{type:Date,default:null},
 avatar:{type:String,default:'',maxlength:200000}
},{timestamps:true}));
