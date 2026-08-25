const express = require('express');
const router = express.Router();
const { getListsByBoard, createList } = require('../controllers/listController');

router.get('/:boardId', getListsByBoard);
router.post('/', createList);

module.exports = router;
