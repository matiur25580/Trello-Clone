const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP } = require('../utils/sendEmail');
const authenticate = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimit');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashOtp(email, otp) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error('OTP_SECRET must contain at least 32 characters.');
  return crypto.createHmac('sha256', secret).update(email.toLowerCase() + ':' + otp).digest('hex');
}

function safeEqualHex(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function accountRateKey(req) {
  const identity = String(req.body?.email || req.body?.emailOrId || '').trim().toLowerCase();
  return crypto.createHash('sha256').update((req.ip || 'unknown') + ':' + identity).digest('hex');
}

const otpRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 3, keyGenerator: accountRateKey });
const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 8, keyGenerator: accountRateKey });

function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE || (production ? 'none' : 'lax');
  return {
    httpOnly: true,
    secure: production || sameSite === 'none' || process.env.COOKIE_SECURE === 'true',
    sameSite,
    path: '/',
    maxAge: 15 * 60 * 1000
  };
}

function clearSessionCookies(res) {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie('access_token', options);
  res.clearCookie('csrf_token', { ...options, httpOnly: false });
}

router.post('/send-otp', otpRateLimit, async (req, res, next) => {
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
  const { fullName, email: rawEmail, password, otp } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100 ||
      !emailPattern.test(email) || email.length > 254 ||
      typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'Please provide valid registration details. Passwords must be at least 12 characters.' });
  }

  try {
    const otpRecord = await Otp.findOne({ email, purpose: 'register', expiresAt: { $gt: new Date() } });
    if (!otpRecord || otpRecord.attempts >= 5 || !safeEqualHex(hashOtp(email, otp), otpRecord.otpHash)) {
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
      if (!record || record.attempts >= 5 || !safeEqualHex(hashOtp(email, otp), record.otpHash)) {
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
        fullName: fullName.trim(), email, role: 'Member',
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

router.post('/login', loginRateLimit, async (req, res, next) => {
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
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie('access_token', token, cookieOptions());
    res.cookie('csrf_token', csrfToken, { ...cookieOptions(), httpOnly: false });
    return res.json({
      success: true, message: 'Login successful.', csrfToken,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, uniqueId: user.uniqueId }
    });
  } catch (error) {
    return next(error);
  }
});

function requestCookie(req, name) {
  const prefix = name + '=';
  for (const part of String(req.headers.cookie || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      try { return decodeURIComponent(value.slice(prefix.length)); } catch (_error) { return ''; }
    }
  }
  return '';
}

router.get('/me', authenticate(), (req, res) => {
  let csrfToken = requestCookie(req, 'csrf_token');
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('base64url');
    res.cookie('csrf_token', csrfToken, { ...cookieOptions(), httpOnly: false });
  }
  return res.json({
    success: true, csrfToken,
    user: { id: req.user._id, fullName: req.user.fullName, email: req.user.email, role: req.user.role, uniqueId: req.user.uniqueId }
  });
});

router.post('/logout', authenticate(), async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    clearSessionCookies(res);
    return res.json({ success: true, message: 'Signed out.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
