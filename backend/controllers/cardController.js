const Card = require('../models/Card');

// নির্দিষ্ট লিস্টের সব কার্ড পাওয়ার জন্য
exports.getCardsByList = async (req, res) => {
  try {
    const { listId } = req.params;
    const cards = await Card.find({ listId });
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// নতুন কার্ড তৈরি করার জন্য
exports.createCard = async (req, res) => {
  try {
    const { title, description, listId, order } = req.body;
    const newCard = new Card({ title, description, listId, order });
    await newCard.save();
    res.status(201).json(newCard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
