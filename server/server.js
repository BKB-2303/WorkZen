require('dotenv').config();
const express=require('express'),cors=require('cors'),path=require('path'),fs=require('fs'),mongoose=require('mongoose'),bcrypt=require('bcryptjs');
const User=require('./models/User');
const app=express();app.use(cors());app.get('/api/health',(req,res)=>res.json({ok:true,version:'7.2'}));app.use(express.json({limit:'8mb'}));
app.use('/api/auth',require('./routes/auth'));
app.use('/api/tasks',require('./routes/tasks'));
app.use('/api/users',require('./routes/users'));
app.use('/api/vault',require('./routes/vault'));
app.use('/api/notes',require('./routes/notes'));
app.use('/api/bookmarks',require('./routes/bookmarks'));
app.use('/api/shares',require('./routes/shares'));
app.use('/api/teams',require('./routes/teams'));
app.use('/api/chat',require('./routes/chat'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/backup',require('./routes/backup'));
app.use('/api',(req,res)=>res.status(404).json({message:'Not found'}));
const dist=path.join(__dirname,'../client/dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')));}
(async()=>{
 try{
  if(!/^[0-9a-f]{64}$/i.test(process.env.VAULT_KEY||'')){console.error('VAULT_KEY missing or invalid in server/.env (needs 64 hex characters)');process.exit(1);}
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected:',mongoose.connection.host);
  // repair accounts that have no role / active flag (made by hand, restored, or from an older version)
  await User.updateMany({$or:[{role:{$exists:false}},{role:null},{role:{$nin:['admin','user']}}]},{$set:{role:'user'}});
  await User.updateMany({$or:[{active:{$exists:false}},{active:null}]},{$set:{active:true}});
  if(!(await User.findOne({role:'admin',active:{$ne:false}}))){
   const hash=await bcrypt.hash('BKBWORK@COM',10);
   const old=await User.findOne(require('./utils/people').byUsername('BKB'));
   if(old){old.role='admin';old.active=true;old.password=hash;await old.save();console.log('No active admin found - account BKB restored as admin: BKB / BKBWORK@COM');}
   else{await User.create({name:'Administrator',username:'BKB',password:hash,role:'admin'});console.log('Default admin created: BKB / BKBWORK@COM');}
  }
  try{await require('./models/Share').collection.dropIndex('from_1_to_1_kind_1_item_1');}catch(e){} // old one-share-per-item index, replaced by team/folder sharing
  try{await require('./utils/migrateNotes')();}catch(e){console.error('Note migration skipped:',e.message);}
  try{await require('./utils/migrateComments')();}catch(e){console.error('Comment migration skipped:',e.message);}
  const port=process.env.PORT||5000;app.listen(port,()=>console.log('API on port',port));
 }catch(e){console.error('MongoDB connection failed:',e.message);process.exit(1);}
})();
