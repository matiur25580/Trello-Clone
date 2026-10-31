const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/User');
const Otp=require('../models/Otp');
const {generateUniqueId}=require('../utils/helpers');
const {sendOTP}=require('../utils/sendEmail');
const r=express.Router();

// SEND OTP
r.post('/send-otp',async(req,res)=>{
  try{
    const {email,role,purpose}=req.body;
    const exists=await User.findOne({email,role});
    if(exists && purpose!=='reset') return res.status(400).json({message:'This email already registered for this role'});
    const otp=Math.floor(100000+Math.random()*900000).toString();
    await Otp.deleteMany({email,role});
    await Otp.create({email,role,otp,purpose:purpose||'register'});
    await sendOTP(email,otp);
    res.json({message:'OTP sent successfully',success:true});
  }catch(e){res.status(500).json({message:e.message})}
});

// REGISTER
r.post('/register',async(req,res)=>{
  try{
    const {fullName,email,contact,dob,role,password,otp}=req.body;
    const rec=await Otp.findOne({email,role,otp});
    if(!rec) return res.status(400).json({message:'Invalid or expired OTP'});
    const uniqueId=generateUniqueId(role,fullName,dob);
    const hash=await bcrypt.hash(password,10);
    const user=await User.create({fullName,email,contact,dob,role,uniqueId,password:hash,isVerified:true});
    await Otp.deleteMany({email,role});
    res.json({message:'Registration successful',success:true,uniqueId:user.uniqueId,role:user.role,fullName:user.fullName});
  }catch(e){
    if(e.code===11000) return res.status(400).json({message:'Duplicate entry'});
    res.status(500).json({message:e.message})
  }
});

// LOGIN (email OR uniqueId)
r.post('/login',async(req,res)=>{
  try{
    const {emailOrId,password,role}=req.body;
    const user=await User.findOne({$or:[{email:emailOrId},{uniqueId:emailOrId}],role});
    if(!user) return res.status(400).json({message:'Invalid credentials'});
    const ok=await bcrypt.compare(password,user.password);
    if(!ok) return res.status(400).json({message:'Invalid credentials'});
    const token=jwt.sign({id:user._id,role:user.role,uniqueId:user.uniqueId},process.env.JWT_SECRET,{expiresIn:'7d'});
    res.json({message:'Login successful',success:true,token,user:{fullName:user.fullName,email:user.email,role:user.role,uniqueId:user.uniqueId}});
  }catch(e){res.status(500).json({message:e.message})}
});
module.exports=r;
