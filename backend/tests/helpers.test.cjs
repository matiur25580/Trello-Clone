const test = require('node:test');
const assert = require('node:assert/strict');
const { generateUniqueId } = require('../utils/helpers');

test('generated account identifiers are random, opaque and do not expose profile data', () => {
  const first = generateUniqueId();
  const second = generateUniqueId();
  assert.match(first, /^TM-[A-F0-9]{16}$/);
  assert.match(second, /^TM-[A-F0-9]{16}$/);
  assert.notEqual(first, second);
});
