const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, min: 0 },
  resetAt: { type: Date, required: true }
}, { versionKey: false });

rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);
