const express = require('express');
const router = express.Router();
const { getCardsByList, createCard } = require('../controllers/cardController');

router.get('/:listId', getCardsByList);
router.post('/', createCard);

module.exports = router;
