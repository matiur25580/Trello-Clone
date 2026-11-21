const crypto = require('node:crypto');

function generateUniqueId() {
  return 'TM-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

module.exports = { generateUniqueId };
