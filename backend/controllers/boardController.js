console.log("Server file is starting...");
const Board = require('../models/Board');

exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.status(200).json(boards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBoard = async (req, res) => {
  try {
    const { title, description } = req.body;
    const newBoard = new Board({ title, description });
    await newBoard.save();
    res.status(201).json(newBoard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
