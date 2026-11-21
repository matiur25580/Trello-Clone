const test = require('node:test');
const assert = require('node:assert/strict');
const { generateUniqueId } = require('../utils/helpers');

test('account identifiers are opaque, random and independent of profile details', () => {
  const first = generateUniqueId();
  const second = generateUniqueId();
  assert.match(first, /^TM-[A-F0-9]{16}$/);
  assert.match(second, /^TM-[A-F0-9]{16}$/);
  assert.notEqual(first, second);
});
