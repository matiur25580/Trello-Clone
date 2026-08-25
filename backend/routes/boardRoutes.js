
const express = require('express');
const router = express.Router();
const Board = require('../models/Board');

// Get all boards
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find();
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle POST request from frontend (/api/boards)
router.post('/', async (req, res) => {
  try {
    console.log('🔥 Received Data from Frontend:', req.body);
    const { boardId, card, _id, title, cards } = req.body;

    // Case 1: Adding a new card to an existing board
    if (boardId && card) {
      const board = await Board.findOne({ _id: boardId });
      if (!board) {
        // Fallback for default boards if not in DB yet
        const newBoardDoc = new Board({
          _id: boardId,
          title: boardId, // fallback title
          cards: [card]
        });
        await newBoardDoc.save();
        return res.status(201).json({ message: 'Card added and board created', board: newBoardDoc });
      }
      board.cards.push(card);
      await board.save();
      return res.json({ message: 'Card added successfully', board });
    }

    // Case 2: Creating a new custom board
    if (_id && title) {
      let existingBoard = await Board.findOne({ _id });
      if (existingBoard) {
        existingBoard.title = title;
        if (cards) existingBoard.cards = cards;
        await existingBoard.save();
        return res.json({ message: 'Board updated successfully', board: existingBoard });
      }

      const newBoard = new Board({
        _id,
        title,
        cards: cards || []
      });
      await newBoard.save();
      return res.status(201).json({ message: 'Board created successfully', board: newBoard });
    }

    res.status(400).json({ error: 'Invalid request payload' });
  } catch (err) {
    console.error('Error handling POST /api/boards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save or Update all boards (Bulk sync)
router.post('/sync', async (req, res) => {
  try {
    const { boards } = req.body;
    await Board.deleteMany({}); // Purge old data and save fresh state
    const savedBoards = await Board.insertMany(boards);
    res.json({ message: 'Boards synced successfully', savedBoards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
