const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const { canMutateBoards } = require('../utils/boardPermissions');

const router = express.Router();
router.use(auth());
router.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !canMutateBoards(req.user)) {
    return res.status(403).json({ success: false, message: 'Viewer accounts have read-only board access.' });
  }
  return next();
});

const isId = (value) => mongoose.isValidObjectId(value);
const cleanText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function accessibleBoard(boardId, userId) {
  if (!isId(boardId)) return null;
  return Board.findOne({
    _id: boardId, isArchived: false,
    $or: [{ owner: userId }, { members: userId }]
  });
}

async function ownedBoard(boardId, userId, archived = false) {
  if (!isId(boardId)) return null;
  return Board.findOne({ _id: boardId, owner: userId, isArchived: archived });
}

router.delete('/boards/:id', async (req, res, next) => {
  try {
    const board = await ownedBoard(req.params.id, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    board.isArchived = true;
    await board.save();
    return res.json({ success: true, message: 'Board archived. Its lists and cards are retained but no longer accessible.' });
  } catch (error) { return next(error); }
});

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

router.put('/boards/:id', async (req, res, next) => {
  try {
    const board = await accessibleBoard(req.params.id, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    const body = req.body || {};
    if (!Object.hasOwn(body, 'title') && !Object.hasOwn(body, 'description')) {
      return res.status(400).json({ success: false, message: 'At least one board field is required.' });
    }
    if (Object.hasOwn(body, 'title')) {
      const title = cleanText(body.title, 100);
      if (!title) return res.status(400).json({ success: false, message: 'Board title cannot be empty.' });
      board.title = title;
    }
    if (Object.hasOwn(body, 'description')) board.description = cleanText(body.description, 500);
    await board.save();
    return res.json({ success: true, message: 'Board updated.', board });
  } catch (error) { return next(error); }
});

router.get('/boards/:id/lists', async (req, res, next) => {
  try {
    const board = await accessibleBoard(req.params.id, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    const lists = await List.find({ board: board._id, isArchived: false }).sort({ position: 1 }).lean();
    return res.json({ success: true, board: { _id: board._id, title: board.title, description: board.description, color: board.color }, lists });
  } catch (error) { return next(error); }
});

router.post('/lists', async (req, res, next) => {
  try {
    const boardId = req.body?.boardId || req.body?.board;
    const title = cleanText(req.body?.title, 100);
    if (!title || !isId(boardId)) return res.status(400).json({ success: false, message: 'A valid board and list title are required.' });
    const board = await accessibleBoard(boardId, req.user._id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    const position = await List.countDocuments({ board: board._id, isArchived: false });
    const list = await List.create({ title, board: board._id, position });
    return res.status(201).json({ success: true, message: 'List created.', list });
  } catch (error) { return next(error); }
});

router.put('/lists/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'List not found.' });
    const list = await List.findOne({ _id: req.params.id, isArchived: false });
    if (!list || !(await accessibleBoard(list.board, req.user._id))) return res.status(404).json({ success: false, message: 'List not found.' });
    const title = cleanText(req.body?.title, 100);
    if (!title) return res.status(400).json({ success: false, message: 'List title cannot be empty.' });
    list.title = title;
    await list.save();
    return res.json({ success: true, message: 'List updated.', list });
  } catch (error) { return next(error); }
});

router.delete('/lists/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'List not found.' });
    const list = await List.findOne({ _id: req.params.id, isArchived: false });
    if (!list || !(await accessibleBoard(list.board, req.user._id))) return res.status(404).json({ success: false, message: 'List not found.' });
    list.isArchived = true;
    await list.save();
    return res.json({ success: true, message: 'List archived. Its cards are retained and hidden with the list.' });
  } catch (error) { return next(error); }
});

router.get('/lists/:id/cards', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'List not found.' });
    const list = await List.findOne({ _id: req.params.id, isArchived: false }).lean();
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
    const list = await List.findOne({ _id: listId, isArchived: false });
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
    if (Object.hasOwn(body, 'checklist')) {
      if (!Array.isArray(body.checklist) || body.checklist.length > 50) {
        return res.status(400).json({ success: false, message: 'Checklist must contain at most 50 items.' });
      }
      const checklist = [];
      for (const item of body.checklist) {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.text !== 'string' || !item.text.trim() || item.text.trim().length > 300 ||
            (Object.hasOwn(item, 'done') && typeof item.done !== 'boolean')) {
          return res.status(400).json({ success: false, message: 'Each checklist item needs text (1–300 characters) and an optional boolean done value.' });
        }
        checklist.push({ text: item.text.trim(), done: item.done === true });
      }
      card.checklist = checklist;
    }
    if (Object.hasOwn(body, 'listId')) {
      if (!isId(body.listId)) return res.status(400).json({ success: false, message: 'Invalid destination list.' });
      const destination = await List.findOne({ _id: body.listId, board: card.board, isArchived: false });
      if (!destination) return res.status(400).json({ success: false, message: 'Destination list must belong to the same board.' });
      if (!card.list.equals(destination._id)) {
        card.position = await Card.countDocuments({ list: destination._id, isArchived: false });
        card.list = destination._id;
      }
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

router.get('/archive', async (req, res, next) => {
  try {
    const boards = await Board.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] })
       .select('_id title isArchived owner').lean();
    const boardIds = boards.map((board) => board._id);
    const [archivedLists, archivedCards] = await Promise.all([
      List.find({ board: { $in: boardIds }, isArchived: true }).select('_id title board').lean(),
      Card.find({ board: { $in: boardIds }, isArchived: true }).select('_id title board list priority dueDate').lean()
    ]);
    return res.json({
      success: true,
      boards: boards.filter((board) => board.isArchived).map((board) => ({
        _id: board._id, title: board.title, isArchived: true,
        canRestore: String(board.owner) === String(req.user._id)
      })),
      lists: archivedLists,
      cards: archivedCards
    });
  } catch (error) { return next(error); }
});

router.post('/boards/:id/restore', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Board not found.' });
    const board = await ownedBoard(req.params.id, req.user._id, true);
    if (!board) return res.status(404).json({ success: false, message: 'Archived board not found.' });
    board.isArchived = false;
    await board.save();
    return res.json({ success: true, message: 'Board restored.', board });
  } catch (error) { return next(error); }
});

router.post('/lists/:id/restore', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'List not found.' });
    const list = await List.findOne({ _id: req.params.id, isArchived: true });
    if (!list || !(await accessibleBoard(list.board, req.user._id))) {
      return res.status(404).json({ success: false, message: 'Archived list not found or its board is still archived.' });
    }
    list.isArchived = false;
    list.position = await List.countDocuments({ board: list.board, isArchived: false });
    await list.save();
    return res.json({ success: true, message: 'List restored.', list });
  } catch (error) { return next(error); }
});

router.post('/cards/:id/restore', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Card not found.' });
    const card = await Card.findOne({ _id: req.params.id, isArchived: true });
    if (!card || !(await accessibleBoard(card.board, req.user._id))) {
      return res.status(404).json({ success: false, message: 'Archived card not found or its board is still archived.' });
    }
    const list = await List.findOne({ _id: card.list, board: card.board, isArchived: false });
    if (!list) return res.status(409).json({ success: false, message: 'Restore the card’s list before restoring this card.' });
    card.isArchived = false;
    card.position = await Card.countDocuments({ list: list._id, isArchived: false });
    await card.save();
    return res.json({ success: true, message: 'Card restored.', card });
  } catch (error) { return next(error); }
});

module.exports = router;
