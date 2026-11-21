const test = require('node:test');
const assert = require('node:assert/strict');
const RateLimit = require('../models/RateLimit');
const createRateLimiter = require('../middleware/rateLimit');

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('database rate limiter allows the configured quota then returns 429', async () => {
  const original = RateLimit.findOneAndUpdate;
  let count = 0;
  RateLimit.findOneAndUpdate = async () => ({ count: ++count, resetAt: new Date(Date.now() + 60000) });
  try {
    const limit = createRateLimiter({ windowMs: 60000, limit: 2, keyGenerator: () => 'unit-test-key' });
    let passed = 0;
    for (let i = 0; i < 3; i += 1) {
      const res = response();
      await limit({ ip: '127.0.0.1' }, res, () => { passed += 1; });
      if (i === 2) {
        assert.equal(res.statusCode, 429);
        assert.ok(Number(res.headers['Retry-After']) > 0);
      }
    }
    assert.equal(passed, 2);
  } finally {
    RateLimit.findOneAndUpdate = original;
  }
});
