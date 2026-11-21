const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');

process.env.JWT_SECRET = 'rate-limit-test-jwt-secret-at-least-32-characters';
process.env.OTP_SECRET = 'rate-limit-test-otp-secret-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.COOKIE_SECURE = 'false';
process.env.TRUST_PROXY_HOPS = '0';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_USER = 'rate-limit-test';
process.env.SMTP_PASS = 'rate-limit-test';

const originalCreateTransport = nodemailer.createTransport;
let sentEmails = 0;
nodemailer.createTransport = () => ({
  sendMail: async () => {
    sentEmails += 1;
    return { messageId: 'rate-limit-test' };
  }
});

const { app } = require('../server.cjs');
const RateLimit = require('../models/RateLimit');
let replicaSet;
let httpServer;
let baseUrl;

async function request(path, body) {
  return fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('login and OTP abuse limits are enforced and persisted in MongoDB', { timeout: 240000 }, async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.14' }
  });
  await mongoose.connect(replicaSet.getUri(), { dbName: 'trello-rate-limit-integration' });
  await RateLimit.init();
  httpServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    httpServer.once('listening', resolve);
    httpServer.once('error', reject);
  });
  baseUrl = 'http://127.0.0.1:' + httpServer.address().port;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await request('/api/auth/login', {
      emailOrId: 'unknown-login@example.test',
      password: 'incorrect-password'
    });
    assert.equal(response.status, 401, 'the first eight login attempts should reach credential validation');
  }
  const blockedLogin = await request('/api/auth/login', {
    emailOrId: 'unknown-login@example.test',
    password: 'incorrect-password'
  });
  assert.equal(blockedLogin.status, 429, 'the ninth login attempt should be rate limited');

  const otpEmail = 'otp-limit@example.test';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request('/api/auth/send-otp', { email: otpEmail });
    assert.equal(response.status, 202, 'the first three OTP requests should be accepted');
  }
  const blockedOtp = await request('/api/auth/send-otp', { email: otpEmail });
  assert.equal(blockedOtp.status, 429, 'the fourth OTP request should be rate limited');
  assert.equal(sentEmails, 3, 'blocked OTP requests must not send another email');

  const loginRecord = await RateLimit.findOne({ key: { $exists: true } }).lean();
  assert.ok(loginRecord, 'rate-limit counters should be persisted in MongoDB');
  assert.ok(await RateLimit.countDocuments({}) >= 3, 'global, login and OTP rate-limit keys should be recorded');
});

test.after(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
  nodemailer.createTransport = originalCreateTransport;
});
