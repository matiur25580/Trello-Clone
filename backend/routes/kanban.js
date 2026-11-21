const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');

const router = express.Router();
router.use(auth());

const isId = (value) => mongoose.isValidObjectId(value);
const cleanText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function accessibleBoard(boardId, userId) {
  if (!isId(boardId)) return null;
  return Board.findOne({
    _id: boardId, isArchived: false,
    $or: [{ owner: userId }, { members: userId }]
  });
}

router.get('/boards', async (req, res, next) => {
  try {
    const boards = await Board.find({
      isArchived: false, $or: [{ owner: req.user._id }, { members: req.user._id }]
    }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, boards });
  } catch (error) { return next(error); }
});

router.post('/boards', async (req, res, next) => {
  try {
    const title = cleanText(req.body?.title, 100);
    const description = cleanText(req.body?.description, 500);
    if (!title) return res.status(400).json({ success: false, message: 'Board title is required (max 100 characters).' });
    const board = await Board.create({ title, description, owner: req.user._id });
    return res.status(201).json({ success: true, message: 'Board created successfully.', board });
  } catch (error) { return next(error); }
});

router.get('/boards/:id/lists', async (req, res, next) => {
  try {
    const board = await accessibleBoard(req.params.id, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    const lists = await List.find({ board: board._id }).sort({ position: 1 }).lean();
    return res.json({ success: true, lists });
  } catch (error) { return next(error); }
});

router.post('/lists', async (req, res, next) => {
  try {
    const boardId = req.body?.boardId || req.body?.board;
    const title = cleanText(req.body?.title, 100);
    if (!title || !isId(boardId)) return res.status(400).json({ success: false, message: 'A valid board and list title are required.' });
    const board = await accessibleBoard(boardId, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    const position = await List.countDocuments({ board: board._id });
    const list = await List.create({ title, board: board._id, position });
    return res.status(201).json({ success: true, message: 'List created.', list });
  } catch (error) { return next(error); }
});

router.get('/lists/:id/cards', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'List not found.' });
    const list = await List.findById(req.params.id).lean();
    if (!list || !(await accessibleBoard(list.board, req.user._id))) return res.status(404).json({ success: false, message: 'List not found.' });
    const cards = await Card.find({ list: list._id, isArchived: false }).sort({ position: 1 }).lean();
    return res.json({ success: true, cards });
  } catch (error) { return next(error); }
});

router.post('/cards', async (req, res, next) => {
  try {
    const listId = req.body?.listId || req.body?.list;
    const title = cleanText(req.body?.title, 200);
    if (!title || !isId(listId)) return res.status(400).json({ success: false, message: 'A valid list and card title are required.' });
    const list = await List.findById(listId);
    if (!list || !(await accessibleBoard(list.board, req.user._id))) return res.status(404).json({ success: false, message: 'List not found.' });
    const position = await Card.countDocuments({ list: list._id, isArchived: false });
    const card = await Card.create({
      title, list: list._id, board: list.board,
      description: cleanText(req.body?.description, 10000),
      priority: ['Low', 'Medium', 'High', 'Urgent'].includes(req.body?.priority) ? req.body.priority : 'Medium',
      position
    });
    return res.status(201).json({ success: true, message: 'Card created.', card });
  } catch (error) { return next(error); }
});

router.put('/cards/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Card not found.' });
    const card = await Card.findOne({ _id: req.params.id, isArchived: false });
    if (!card || !(await accessibleBoard(card.board, req.user._id))) return res.status(404).json({ success: false, message: 'Card not found.' });
    const body = req.body || {};
    if (Object.hasOwn(body, 'title')) {
      const title = cleanText(body.title, 200);
      if (!title) return res.status(400).json({ success: false, message: 'Card title cannot be empty.' });
      card.title = title;
    }
    if (Object.hasOwn(body, 'description')) card.description = cleanText(body.description, 10000);
    if (Object.hasOwn(body, 'priority')) {
      if (!['Low', 'Medium', 'High', 'Urgent'].includes(body.priority)) return res.status(400).json({ success: false, message: 'Invalid priority.' });
      card.priority = body.priority;
    }
    if (Object.hasOwn(body, 'dueDate')) {
      const date = body.dueDate === null || body.dueDate === '' ? null : new Date(body.dueDate);
      if (date && Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Invalid due date.' });
      card.dueDate = date;
    }
    if (Object.hasOwn(body, 'listId')) {
      if (!isId(body.listId)) return res.status(400).json({ success: false, message: 'Invalid destination list.' });
      const destination = await List.findOne({ _id: body.listId, board: card.board });
      if (!destination) return res.status(400).json({ success: false, message: 'Destination list must belong to the same board.' });
      card.list = destination._id;
    }
    await card.save();
    return res.json({ success: true, message: 'Card updated.', card });
  } catch (error) { return next(error); }
});

router.delete('/cards/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Card not found.' });
    const card = await Card.findOne({ _id: req.params.id, isArchived: false });
    if (!card || !(await accessibleBoard(card.board, req.user._id))) return res.status(404).json({ success: false, message: 'Card not found.' });
    card.isArchived = true;
    await card.save();
    return res.json({ success: true, message: 'Card archived.' });
  } catch (error) { return next(error); }
});

module.exports = router;
