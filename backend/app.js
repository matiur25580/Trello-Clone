const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/trello-clone')
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

const BoardSchema = new mongoose.Schema({
  title: String,
  description: String
});
const Board = mongoose.model('Board', BoardSchema);

app.get('/api/boards', async (req, res) => {
  try {
    const boards = await Board.find();
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const newBoard = new Board({
      title: req.body.title,
      description: req.body.description || 'Default description'
    });
    const savedBoard = await newBoard.save();
    res.json(savedBoard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
