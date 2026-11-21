const nodemailer = require('nodemailer');

async function sendOTP(email, otp) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must be configured to send verification emails.');

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host, port, secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: email,
    subject: 'Trello Clone - Email verification',
    text: 'Your verification code is ' + otp + '. It expires in 5 minutes. Do not share this code.',
    html: '<p>Your verification code is:</p><h1 style="letter-spacing:8px">' + otp + '</h1><p>It expires in 5 minutes. Do not share this code.</p>'
  });
}

module.exports = { sendOTP };
