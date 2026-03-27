const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const Student = require('../models/Student'); 
const Unit = require('../models/Unit');
const jwt = require('jsonwebtoken');

// Haversine Formula: Calculates distance in meters between two GPS points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};


// This listens for a "POST" request (sending data) to /register
router.post('/register', async (req, res) => {
    try {
        // 1. Pull ALL fields including course and school
        const { fullName, regNo, email, password, course, school } = req.body;

        let student = await Student.findOne({ regNo });
        if (student) {
            return res.status(400).json({ message: "Student already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Save with course and school
        const newStudent = new Student({
            fullName,
            regNo,
            email,
            password: hashedPassword,
            course, 
            school
        });

        await newStudent.save();
        res.status(201).json({ message: "Student registered successfully!" });
    } catch (error) {
        console.error("❌ REGISTRATION FAILED:", error.message);
        res.status(500).json({ message: "Server error: " + error.message });
    }
});

router.post('/login', async (req, res) => {
    console.log("Login Attempt:", req.body); 
    try {
        const { regNo, password } = req.body;

        const student = await Student.findOne({ regNo });
        if (!student) {
            return res.status(400).json({ message: "Invalid Registration Number or Password" });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Registration Number or Password" });
        }

        // --- NEW: SPRINT 1 JWT GENERATION ---
        // We sign a token with the user's ID and Role. 
        // Use a strong secret key (you can change 'JKUAT_SECRET_2026' later).
        const token = jwt.sign(
            { id: student._id, role: student.role || 'student' },
            'JKUAT_SECRET_2026',
            { expiresIn: '24h' }
        );

        res.json({
            message: "Welcome back!",
            token: token, 
            student: {
                _id: student._id,
                fullName: student.fullName,
                regNo: student.regNo,
                email: student.email,
                course: student.course, 
                school: student.school, 
                role: student.role || 'student'
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during login" });
    }
});

const Attendance = require('../models/Attendance');

// --- THE SCAN DOORWAY ---
router.post('/scan', async (req, res) => {
    try {
        // 1. Pull unitId from the request body (sent by the scanner)
        const { unitName, unitCode, unitId, sessionId, lecturerLat, lecturerLng, studentLat, studentLng, studentId } = req.body;

        if (!lecturerLat || !lecturerLng || !studentLat || !studentLng) {
            return res.status(400).json({ message: "GPS data missing." });
        }

        const student = await Student.findById(studentId);
        const unit = await Unit.findOne({ code: unitCode });

        if (!student || !unit) {
            return res.status(404).json({ message: "Student or Unit not found." });
        }

        // 2. The Restriction: Compare courses
        if (student.course !== unit.course) {
            return res.status(403).json({ 
                message: `This unit is for ${unit.course} students.` 
            });
        }

        const distance = calculateDistance(
            Number(lecturerLat), Number(lecturerLng), 
            Number(studentLat), Number(studentLng)
        );
        if (distance > 2850) { 
            return res.status(403).json({ message: `Too far! (${Math.round(distance)}m away)` });
        }
        // --- STEP 10: DUPLICATE CHECK ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alreadyScanned = await Attendance.findOne({
            student: studentId,
            unitCode: unitCode,
            sessionId: sessionId
        });

        if (alreadyScanned) {
            return res.status(400).json({ 
                message: "Your attendance for this unit has already been recorded." 
            });
        }

        // --- FIX: Include unitId to match your Schema ---
        const newRecord = new Attendance({
            student: studentId,
            unitName,
            unitCode,
            unitId: unitId,
            sessionId: sessionId,
            distance: Math.round(distance),
            status: 'Present'
        });

        await newRecord.save();
        res.status(201).json({ message: `Verified!`, distance: Math.round(distance) });

    } catch (error) {
        console.error("Scan Logic Error:", error);
        res.status(500).json({ message: "Server error during verification." });
    }
});

// --- FETCH STUDENT ATTENDANCE HISTORY ---
router.get('/history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const history = await Attendance.find({ student: studentId })
            .sort({ date: -1 }); // -1 means "Descending" (Newest first)
        
        res.status(200).json(history);
    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ message: "Failed to fetch attendance records" });
    }
});

// GET /api/auth/lecturer/attendance/:unitCode/:sessionId
router.get('/lecturer/attendance/:unitCode/:sessionId', async (req, res) => {
    try {
        const { unitCode, sessionId } = req.params;

        // Fetch attendance ONLY for this exact session generated by the lecturer
        const attendanceList = await Attendance.find({
            unitCode: unitCode,
            sessionId: sessionId
        }).populate('student', 'fullName regNo');

        res.status(200).json(attendanceList);
    } catch (error) {
        res.status(500).json({ message: "Error fetching live attendance" });
    }
});

// ==========================================
// STEP 12: INCREMENT SESSION (Lecturer Logbook)
// ==========================================
router.post('/lecturer/unit/:unitId/increment', async (req, res) => {
    try {
        const updatedUnit = await Unit.findByIdAndUpdate(
            req.params.unitId,
            { $inc: { totalSessions: 1 } }, // Adds +1 to the logbook
            { new: true }
        );
        res.status(200).json(updatedUnit);
    } catch (error) {
        console.error("Increment Error:", error);
        res.status(500).json({ message: "Failed to increment session" });
    }
});

// ==========================================
// STEP 12: DASHBOARD STATS (Student Math)
// ==========================================
router.get('/stats/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        
        // 1. Get all units for this student's specific course
        const courseUnits = await Unit.find({ course: student.course });
        
        // 2. Get all successful attendance records for this student
        const attendedRecords = await Attendance.find({ student: studentId });

        // 3. Match them up and calculate the stats
        const stats = courseUnits.map(unit => {
            const attendedCount = attendedRecords.filter(rec => rec.unitCode === unit.code).length;
            return {
                unitId: unit._id,
                unitCode: unit.code,
                unitName: unit.name,
                totalSessions: unit.totalSessions,
                attended: attendedCount
            };
        });

        res.status(200).json(stats);
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

module.exports = router;