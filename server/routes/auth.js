const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const Student = require('../models/Student'); 
const Unit = require('../models/Unit');
const jwt = require('jsonwebtoken');
const ClassSession = require('../models/ClassSession');

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
        const { firstName, lastName, regNo, email, password, course, school } = req.body;

        let student = await Student.findOne({ regNo });
        if (student) {
            return res.status(400).json({ message: "Student already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Save with course and school
        const newStudent = new Student({
            firstName,
            lastName,
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
                firstName: student.firstName,
                lastName: student.lastName,
                fullName: `${student.firstName} ${student.lastName}`,
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

// ==========================================
// NEW: LECTURER ANCHOR (Start Session)
// ==========================================
router.post('/lecturer/session', async (req, res) => {
    try {
        const { unitCode, unitName, sessionId } = req.body;
        
        // Save the indestructible anchor
        await ClassSession.create({
            unitCode,
            unitName,
            sessionId
        });
        
        res.status(201).json({ message: "Session Anchored successfully" });
    } catch (error) {
        console.error("Session Anchor Error:", error);
        res.status(500).json({ message: "Failed to anchor session" });
    }
});

router.get('/history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);

        if (!student) return res.status(404).json({ message: "Student not found" });

        // 1. Get this student's actual "Present" records
        const presentRecords = await Attendance.find({ student: studentId }).lean();
        const presentSessionIds = presentRecords.map(r => r.sessionId);

        // 2. Find all units for this student's course
        const courseUnits = await Unit.find({ course: student.course });
        const courseUnitCodes = courseUnits.map(u => u.code);

        // ... (Keep sections 1 & 2 the same) ...

        // 3. Find ALL Master Sessions created by Lecturers for these units
        const masterSessions = await ClassSession.find({ unitCode: { $in: courseUnitCodes } }).lean();

        // 4. Compare Master List against Student's Present List
        let fullHistory = [...presentRecords];

        masterSessions.forEach((sessionInfo) => {
            if (!presentSessionIds.includes(sessionInfo.sessionId)) {
                // If the lecturer created a session but this student didn't scan, generate an Absence
                fullHistory.push({
                    _id: `absent_${sessionInfo.sessionId}`, // Mock ID for React
                    student: studentId,
                    unitCode: sessionInfo.unitCode,
                    unitName: sessionInfo.unitName,
                    sessionId: sessionInfo.sessionId,
                    date: sessionInfo.date,
                    status: 'Absent'
                });
            }
        });

        // 5. Sort from newest to oldest
        fullHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(fullHistory);

        masterSessions.forEach((sessionInfo, sessionId) => {
            if (!presentSessionIds.includes(sessionId)) {
                // If the session happened but this student didn't scan, generate a Virtual Absence
                fullHistory.push({
                    _id: `absent_${sessionId}`, // Mock ID for React
                    student: studentId,
                    unitCode: sessionInfo.unitCode,
                    unitName: sessionInfo.unitName,
                    sessionId: sessionInfo.sessionId,
                    date: sessionInfo.date,
                    status: 'Absent'
                });
            }
        });

        // 5. Sort from newest to oldest
        fullHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(fullHistory);
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
        }).populate('student', 'firstName lastName regNo');

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

// Add this import at the top of your auth.js file
const Notification = require('../models/Notification');

// ==========================================
// STEP 12 & 14b: DASHBOARD STATS & ALERT ENGINE
// ==========================================
router.get('/stats/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        
        // 1. Get all units for this student's specific course
        const courseUnits = await Unit.find({ course: student.course });
        
        // 2. Get all successful attendance records for this student
        const attendedRecords = await Attendance.find({ student: studentId });

        // 3. The Engine: Calculate stats AND trigger notifications
        const stats = await Promise.all(courseUnits.map(async (unit) => {
            const attendedCount = attendedRecords.filter(rec => rec.unitCode === unit.code).length;
            const percent = unit.totalSessions > 0 ? (attendedCount / unit.totalSessions) * 100 : 100;

                // --- ALERT LOGIC ---
            if (unit.totalSessions >= 3) { 
                if (percent < 75) {
                    // Look at the very last notification for this unit
                    const lastNotif = await Notification.findOne({
                        student: studentId,
                        unitCode: unit.code
                    }).sort({ date: -1 });

                    // Only send a warning if they don't have one, OR if they just recovered and dropped again
                    if (!lastNotif || lastNotif.type !== 'warning') {
                        await Notification.create({
                            student: studentId,
                            unitCode: unit.code,
                            title: 'Low Attendance Alert',
                            message: `Your attendance for ${unit.name} is now at ${Math.round(percent)}%.`,
                            type: 'warning'
                        });
                    }
                } else if (percent >= 75) {
                     // Look at the last notification to see if they just recovered
                     const lastNotif = await Notification.findOne({
                         student: studentId,
                         unitCode: unit.code
                     }).sort({ date: -1 });

                     if (lastNotif && lastNotif.type === 'warning') {
                         await Notification.create({
                            student: studentId,
                            unitCode: unit.code,
                            title: 'Attendance Restored',
                            message: `Great job! Your attendance for ${unit.name} is back above 75%.`,
                            type: 'success'
                        });
                     }
                }
            }

            return {
                unitId: unit._id,
                unitCode: unit.code,
                unitName: unit.name,
                totalSessions: unit.totalSessions,
                attended: attendedCount
            };
        }));

        res.status(200).json(stats);
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

// ==========================================
// STEP 14b: FETCH NOTIFICATIONS
// ==========================================
router.get('/notifications/:studentId', async (req, res) => {
    try {
        const notifications = await Notification.find({ student: req.params.studentId })
            .sort({ date: -1 })
            .limit(20); // Keep it reasonable
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// ==========================================
// STEP 14b: MARK NOTIFICATIONS AS READ
// ==========================================
router.put('/notifications/mark-read/:studentId', async (req, res) => {
    try {
        await Notification.updateMany(
            { student: req.params.studentId, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: "Marked all as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update notifications" });
    }
});

module.exports = router;