const test = require('node:test');
const assert = require('node:assert/strict');
const { canMutateBoards } = require('../utils/boardPermissions');

test('Viewer accounts cannot mutate boards while workspace roles can', () => {
  for (const role of ['Admin', 'Manager', 'Member']) {
    assert.equal(canMutateBoards({ role }), true);
  }
  assert.equal(canMutateBoards({ role: 'Viewer' }), false);
  assert.equal(canMutateBoards(null), false);
});
