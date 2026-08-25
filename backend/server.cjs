const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

let boards = [
  { _id: 'default-1', title: '⏳ Pending', cards: [] },
  { _id: 'default-2', title: '🚀 Backlog', cards: [] },
  { _id: 'default-3', title: '💻 In Progress', cards: [] },
  { _id: 'default-4', title: '🔍 Code Review', cards: [] },
  { _id: 'default-5', title: '✅ Done', cards: [] }
];

app.get('/', (req, res) => {
  res.send('Trello Enterprise Backend is Live and Connected!');
});

app.get('/api/boards', (req, res) => {
  res.json(boards);
});

// Board create korar route
app.post('/api/boards', (req, res) => {
  const newBoard = req.body;
  console.log('🔥 Received New Board from Frontend:', newBoard);
  res.status(201).json({ message: 'Board created successfully!', board: newBoard });
});

// Card create korar route (Etai ekhon kaj korbe)
app.post('/api/cards', (req, res) => {
  const incomingData = req.body;
  console.log('🔥 Received New Card from Frontend:', incomingData);
  res.status(201).json({ message: 'Card received successfully!', data: incomingData });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 SERVER IS PERMANENTLY RUNNING ON PORT ${PORT}`);
});
