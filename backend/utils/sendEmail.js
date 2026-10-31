const nodemailer=require('nodemailer');
async function sendOTP(email,otp){
  const t=nodemailer.createTransport({service:'gmail',auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});
  await t.sendMail({from:process.env.EMAIL_USER,to:email,subject:'Trello Clone - OTP Verification',html:`<div style="font-family:sans-serif;padding:20px"><h2 style="color:#2563eb">Your OTP is</h2><h1 style="font-size:36px;letter-spacing:8px">${otp}</h1><p>Valid for 5 minutes. Do not share.</p></div>`});
}
module.exports={sendOTP};
