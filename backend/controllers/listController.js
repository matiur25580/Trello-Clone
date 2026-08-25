const List = require('../models/List');

// নির্দিষ্ট বোর্ডের সব লিস্ট পাওয়ার জন্য
exports.getListsByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const lists = await List.find({ boardId });
    res.status(200).json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// নতুন লিস্ট তৈরি করার জন্য
exports.createList = async (req, res) => {
  try {
    const { title, boardId, order } = req.body;
    const newList = new List({ title, boardId, order });
    await newList.save();
    res.status(201).json(newList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
