const Share=require('../models/Share'),A=require('./activity');
// record an owner's own edit in the history, but only when they share things (keeps the log small)
module.exports=async(req,kind,before,after)=>{
 try{
  if(!before||!after||!(await Share.exists({from:req.user._id})))return;
  const changes=A.diff(before,after);
  if(changes.length)await A.log({actor:req.user._id,owner:req.user._id,kind,item:after._id,title:after.title||'Untitled note',action:'edited',changes});
 }catch(e){}
};
