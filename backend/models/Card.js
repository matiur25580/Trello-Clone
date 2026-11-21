const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 10000, default: '' },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true, index: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  labels: [{ type: String, trim: true, maxlength: 40 }],
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  dueDate: Date,
  checklist: [{ text: { type: String, required: true, maxlength: 300 }, done: { type: Boolean, default: false } }],
  position: { type: Number, default: 0, min: 0 },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

cardSchema.index({ list: 1, isArchived: 1, position: 1 });
cardSchema.index({ board: 1, isArchived: 1 });
module.exports = mongoose.models.Card || mongoose.model('Card', cardSchema);
