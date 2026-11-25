// One-time: v6 stored comments in the history log. They now live in chat; move them over (safe to run on every start).
const Activity=require('../models/Activity'),Message=require('../models/Message');
module.exports=async()=>{
 const old=await Activity.find({action:'comment'}).lean();
 if(!old.length)return;
 const docs=old.filter(a=>a.item&&a.actor&&a.text).map(a=>({thread:'item:'+a.item,scope:'item',sender:a.actor,owner:a.owner,text:String(a.text).slice(0,2000),deleted:false,editedAt:null,createdAt:a.createdAt,updatedAt:a.createdAt}));
 if(docs.length)await Message.collection.insertMany(docs);
 await Activity.deleteMany({_id:{$in:old.map(a=>a._id)}});
 console.log(`Moved ${docs.length} comment(s) into chat`);
};
