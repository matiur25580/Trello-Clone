const mongoose = require('mongoose');

// A list groups cards within a board and stores its display order.
const listSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  position: { type: Number, default: 0, min: 0 },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Supports retrieving a board's active lists in their intended order.
listSchema.index({ board: 1, isArchived: 1, position: 1 });
module.exports = mongoose.models.List || mongoose.model('List', listSchema);
