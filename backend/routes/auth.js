const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP } = require('../utils/sendEmail');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(input = {}) {
  const fullName = input.fullName;
  const email = String(input.email || '').trim().toLowerCase();
  const password = input.password;
  const otp = input.otp;
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100 ||
      !emailPattern.test(email) || email.length > 254 ||
      typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return null;
  return { fullName: fullName.trim(), email, password, otp };
}

function hashOtp(email, otp) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error('OTP_SECRET must contain at least 32 characters.');
  return crypto.createHmac('sha256', secret).update(email.toLowerCase() + ':' + otp).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post('/send-otp', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
    const existing = await User.exists({ email });
    if (existing) return res.status(202).json({ success: true, message: 'If the address is eligible, a verification code will be sent.' });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(email, otp);
    await Otp.findOneAndUpdate(
      { email, purpose: 'register' },
      { $set: { otpHash, attempts: 0, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await sendOTP(email, otp);
    return res.status(202).json({ success: true, message: 'If the address is eligible, a verification code will be sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/register', async (req, res, next) => {
  const registration = validateRegistration(req.body || {});
  if (!registration) {
    return res.status(400).json({ message: 'Please provide a valid name, email, password (12–128 characters), and 6-digit verification code.' });
  }
  const { fullName, email, password, otp } = registration;

  try {
    const otpRecord = await Otp.findOne({ email, purpose: 'register', expiresAt: { $gt: new Date() } });
    if (!otpRecord || otpRecord.attempts >= 5 || !safeEqual(hashOtp(email, otp), otpRecord.otpHash)) {
      if (otpRecord && otpRecord.attempts < 5) {
        await Otp.updateOne({ _id: otpRecord._id, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } });
      }
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }
  } catch (error) {
    return next(error);
  }

  const session = await User.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const record = await Otp.findOne({ email, purpose: 'register', expiresAt: { $gt: new Date() } }).session(session);
      if (!record || record.attempts >= 5 || !safeEqual(hashOtp(email, otp), record.otpHash)) {
        const error = new Error('Invalid or expired verification code.');
        error.status = 400;
        throw error;
      }
      const consumed = await Otp.findOneAndDelete({
        _id: record._id, otpHash: record.otpHash, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() }
      }, { session });
      if (!consumed) {
        const error = new Error('Invalid or expired verification code.');
        error.status = 400;
        throw error;
      }
      const uniqueId = 'TM-' + crypto.randomBytes(8).toString('hex').toUpperCase();
      const passwordHash = await bcrypt.hash(password, 12);
      [created] = await User.create([{
        fullName, email, role: 'Member',
        uniqueId, password: passwordHash, isVerified: true
      }], { session });
    });
    return res.status(201).json({ success: true, message: 'Registration successful.', uniqueId: created.uniqueId, role: created.role, fullName: created.fullName });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Unable to create this account. Please sign in or use another address.' });
    return next(error);
  } finally {
    await session.endSession();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const emailOrId = String(req.body?.emailOrId || '').trim();
    const password = req.body?.password;
    if (!emailOrId || typeof password !== 'string' || password.length > 128) return res.status(400).json({ message: 'Invalid credentials.' });
    const normalized = emailOrId.toLowerCase();
    const user = await User.findOne({ $or: [{ email: normalized }, { uniqueId: emailOrId.toUpperCase() }] }).select('+password');
    const valid = user && user.isActive && user.isVerified && await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
    const token = jwt.sign({ ver: user.tokenVersion }, secret, {
      subject: user._id.toString(), expiresIn: '15m', algorithm: 'HS256',
      issuer: 'trello-clone-api', audience: 'trello-clone-web'
    });
    return res.json({
      success: true, message: 'Login successful.', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, uniqueId: user.uniqueId }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', require('../middleware/auth')(), async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    return res.json({ success: true, message: 'Signed out.' });
  } catch (error) {
    return next(error);
  }
});

router.validateRegistration = validateRegistration;
module.exports = router;
