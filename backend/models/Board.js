const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  priority: { type: String, default: 'Medium' },
  label: { type: String, default: 'Feature' },
  assignee: { type: String, default: 'Unassigned' },
  dueDate: { type: String, default: '' },
  estimatedHours: { type: String, default: '' },
  spentHours: { type: String, default: '' },
  checklist: [{ id: String, text: String, completed: Boolean }],
  comments: [{ id: String, text: String, time: String }],
  attachments: [{ id: String, name: String, type: String, data: String }]
});

const boardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  cards: [cardSchema]
});

module.exports = mongoose.model('Board', boardSchema);
