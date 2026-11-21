const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/User');

async function main() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Workspace Administrator' } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
    throw new Error('Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).');
  }
  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ role: 'Admin' })) throw new Error('An administrator already exists. Bootstrap is disabled.');
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const user = await User.create({
    fullName: ADMIN_NAME, email, role: 'Admin',
    uniqueId: 'TM-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
    password, isVerified: true, isActive: true
  });
  console.log('Administrator created:', user.email, user.uniqueId);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
