require('dotenv').config();
const express=require('express'),cors=require('cors'),path=require('path'),fs=require('fs'),mongoose=require('mongoose'),bcrypt=require('bcryptjs');
const User=require('./models/User');
const app=express();app.use(cors());app.use(express.json({limit:'200kb'}));
app.use('/api/auth',require('./routes/auth'));
app.use('/api/tasks',require('./routes/tasks'));
app.use('/api/users',require('./routes/users'));
app.use('/api/vault',require('./routes/vault'));
app.use('/api/notes',require('./routes/notes'));
app.use('/api/bookmarks',require('./routes/bookmarks'));
app.use('/api',(req,res)=>res.status(404).json({message:'Not found'}));
const dist=path.join(__dirname,'../client/dist');
if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')));}
(async()=>{
 try{
  if(!/^[0-9a-f]{64}$/i.test(process.env.VAULT_KEY||'')){console.error('VAULT_KEY missing or invalid in server/.env (needs 64 hex characters)');process.exit(1);}
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected:',mongoose.connection.host);
  if(!(await User.findOne({role:'admin'}))){
   await User.create({name:'Administrator',username:'BKB',password:await bcrypt.hash('BKBWORK@COM',10),role:'admin'});
   console.log('Default admin created: BKB / BKBWORK@COM');
  }
  try{await require('./utils/migrateNotes')();}catch(e){console.error('Note migration skipped:',e.message);}
  const port=process.env.PORT||5000;app.listen(port,()=>console.log('API on port',port));
 }catch(e){console.error('MongoDB connection failed:',e.message);process.exit(1);}
})();
