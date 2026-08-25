const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
