import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";

const {Pool}=pg;
const app=express();
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false});
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET) throw new Error("JWT_SECRET is required");

app.use(cors({origin:process.env.FRONTEND_ORIGIN?.split(",").map(x=>x.trim()).filter(Boolean)||true}));
app.use(express.json({limit:"1mb"}));

const emailOk=v=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);
const usernameOk=v=>/^[a-zA-Z0-9_]{3,32}$/.test(v);
const publicUser=r=>({id:r.id,email:r.email,username:r.username,display_name:r.display_name,avatar_url:r.avatar_url});

async function auth(req,res,next){
  try{
    const h=req.headers.authorization||"";
    if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Требуется авторизация"});
    const p=jwt.verify(h.slice(7),JWT_SECRET);
    const q=await pool.query('SELECT id,email,username,display_name,avatar_url FROM "Users" WHERE id=$1',[p.sub]);
    if(!q.rowCount) return res.status(401).json({error:"Пользователь не найден"});
    req.user=q.rows[0];next();
  }catch{return res.status(401).json({error:"Недействительный токен"})}
}

app.get("/health",(_,res)=>res.json({ok:true}));
app.post("/auth/register",async(req,res)=>{
  try{
    const email=String(req.body.email||"").trim().toLowerCase();
    const password=String(req.body.password||"");
    const username=String(req.body.username||"").trim();
    if(!emailOk(email)) return res.status(400).json({error:"Введите корректный email"});
    if(password.length<8) return res.status(400).json({error:"Пароль должен содержать минимум 8 символов"});
    if(!usernameOk(username)) return res.status(400).json({error:"Никнейм: 3–32 символа, только латиница, цифры и _"});
    const exists=await pool.query('SELECT 1 FROM "Users" WHERE lower(email)=lower($1) OR lower(username)=lower($2) LIMIT 1',[email,username]);
    if(exists.rowCount) return res.status(409).json({error:"Email или никнейм уже занят"});
    const hash=await bcrypt.hash(password,12);
    const q=await pool.query('INSERT INTO "Users"(email,password_hash,username,display_name,avatar_url) VALUES($1,$2,$3,$4,$5) RETURNING id,email,username,display_name,avatar_url',[email,hash,username,"",null]);
    const user=q.rows[0],token=jwt.sign({sub:user.id},JWT_SECRET,{expiresIn:"30d"});
    res.status(201).json({token,user:publicUser(user)});
  }catch(e){console.error(e);res.status(500).json({error:"Ошибка сервера"})}
});
app.post("/auth/login",async(req,res)=>{
  try{
    const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");
    const q=await pool.query('SELECT id,email,password_hash,username,display_name,avatar_url FROM "Users" WHERE lower(email)=lower($1)',[email]);
    if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash))) return res.status(401).json({error:"Неверный email или пароль"});
    const u=q.rows[0],token=jwt.sign({sub:u.id},JWT_SECRET,{expiresIn:"30d"});
    res.json({token,user:publicUser(u)});
  }catch(e){console.error(e);res.status(500).json({error:"Ошибка сервера"})}
});
app.get("/auth/me",auth,(req,res)=>res.json({user:publicUser(req.user)}));
app.patch("/auth/profile",auth,async(req,res)=>{
  try{
    const name=String(req.body.display_name||"").trim();
    if(name.length<1||name.length>40) return res.status(400).json({error:"Имя должно быть от 1 до 40 символов"});
    const q=await pool.query('UPDATE "Users" SET display_name=$1 WHERE id=$2 RETURNING id,email,username,display_name,avatar_url',[name,req.user.id]);
    res.json({user:publicUser(q.rows[0])});
  }catch(e){console.error(e);res.status(500).json({error:"Ошибка сервера"})}
});
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log("Umar API listening on "+port));