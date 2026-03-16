const express = require('express');
const router = express.Router();
const Unit = require('../models/Unit');

// POST: Add a unit
router.post('/add', async (req, res) => {
  try {
    const newUnit = new Unit(req.body);
    await newUnit.save();
    res.status(201).json(newUnit);
  } catch (err) {
    res.status(500).json({ message: "Error saving unit", error: err });
  }
});

// GET: All units for a lecturer
router.get('/lecturer/:lecturerId', async (req, res) => {
  try {
    const units = await Unit.find({ lecturerId: req.params.lecturerId });
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: "Error fetching units" });
  }
});

module.exports = router;