const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const secret = 'test-only-secret-that-is-at-least-32-characters-long';
process.env.JWT_SECRET = secret;

function token(version = 0) {
  return jwt.sign({ ver: version }, secret, {
    subject: '507f1f77bcf86cd799439011',
    expiresIn: '1m',
    issuer: 'trello-clone-api',
    audience: 'trello-clone-web'
  });
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('authentication middleware rejects missing, revoked and unauthorized sessions', async () => {
  const original = User.findById;
  try {
    let req = { headers: {} };
    let res = response();
    let nextCalled = false;
    await authenticate()(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);

    User.findById = () => ({ select: async () => null });
    req = { headers: { authorization: 'Bearer ' + token() } };
    res = response();
    await authenticate()(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);

    User.findById = () => ({ select: async () => ({
      _id: '507f1f77bcf86cd799439011', role: 'Member', isActive: true, tokenVersion: 1
    }) });
    req = { headers: { authorization: 'Bearer ' + token(0) } };
    res = response();
    await authenticate()(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);

    User.findById = () => ({ select: async () => ({
      _id: '507f1f77bcf86cd799439011', role: 'Member', isActive: true, tokenVersion: 0
    }) });
    req = { headers: { authorization: 'Bearer ' + token() } };
    res = response();
    await authenticate(['Admin'])(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);

    req = { headers: { authorization: 'Bearer ' + token() } };
    res = response();
    nextCalled = false;
    await authenticate(['Member'])(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'Member');
  } finally {
    User.findById = original;
  }
});
