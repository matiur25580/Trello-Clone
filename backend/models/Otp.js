const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['register'], default: 'register', required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0, min: 0, max: 5 },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
module.exports = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
