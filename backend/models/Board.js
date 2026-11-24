// Board model describes the MongoDB document used to organize a user's Kanban workspace.
const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  color: { type: String, default: '#2563eb', match: /^#[0-9a-fA-F]{6}$/ },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ members: 1, createdAt: -1 });
module.exports = mongoose.models.Board || mongoose.model('Board', boardSchema);
