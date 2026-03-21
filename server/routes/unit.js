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

router.put('/increment-session/:unitCode', async (req, res) => {
  try {
    const unit = await Unit.findOneAndUpdate(
      { code: req.params.unitCode },
      { $inc: { totalSessions: 1 } }, // Surgically increase by 1
      { new: true }
    );
    res.json({ message: "Session started", total: unit.totalSessions });
  } catch (err) {
    res.status(500).json({ message: "Counter failed" });
  }
});

// GET: Fetch every unit in the system for cross-referencing
router.get('/all', async (req, res) => {
  try {
    const units = await Unit.find({});
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: "Error fetching all units" });
  }
});

module.exports = router;