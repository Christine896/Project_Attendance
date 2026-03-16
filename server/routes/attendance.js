const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // <--- CRITICAL IMPORT
const Attendance = require('../models/Attendance');

// The Handshake Endpoint
router.post('/log', async (req, res) => {
    try {
        let { studentId, unitId, distance } = req.body;

        // Fetch the unit using the ID sent by the phone
        const Unit = require('../models/Unit');
        const unitDetails = await Unit.findById(unitId);

        if (!unitDetails) {
            return res.status(404).json({ message: "Unit not found" });
        }

        // We take '.name' from the Unit model and save it as 'unitName' in Attendance
        const newRecord = new Attendance({
            student: new mongoose.Types.ObjectId(studentId),
            unitId: new mongoose.Types.ObjectId(unitId),
            unitName: unitDetails.name, // Mapping 'name' to 'unitName'
            unitCode: unitDetails.code, // Mapping 'code' to 'unitCode'
            distance: distance,
            status: 'Present'
        });

        await newRecord.save();
        res.status(201).json({ message: "Attendance Success!" });
    } catch (err) {
        console.error("DB Error:", err.message);
        res.status(500).json({ message: "Database Error", error: err.message });
    }
});

module.exports = router;