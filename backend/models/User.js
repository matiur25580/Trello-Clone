const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  contact: { type: String, trim: true, maxlength: 30, default: '' },
  dob: { type: String, trim: true, maxlength: 10, default: '' },
  role: { type: String, enum: ['Admin', 'Manager', 'Member', 'Viewer'], default: 'Member', required: true },
  uniqueId: { type: String, unique: true, required: true, immutable: true },
  password: { type: String, required: true, select: false },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.password; delete ret.__v; return ret; } } });

userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
