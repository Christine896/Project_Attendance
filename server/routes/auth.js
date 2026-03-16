const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const Student = require('../models/Student'); 
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

// --- THE REGISTER DOORWAY ---
// This listens for a "POST" request (sending data) to /register
router.post('/register', async (req, res) => {
    console.log("Registration Attempt:", req.body); // ADD THIS
    try {
        const { fullName, regNo, email, password } = req.body;

        // 2. Check if the student is already in the database
        // We use the Reg No because it's unique to every student
        let student = await Student.findOne({ regNo });
        if (student) {
            return res.status(400).json({ message: "Student already registered with this Reg No" });
        }

        // 3. Scramble the password (Hashing)
        // We create a "salt" (random noise) then mix it with the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create a new "Student" using our Blueprint
        student = new Student({
            fullName,
            regNo,
            email,
            password: hashedPassword // We save the gibberish, NOT the real password
        });

        // 5. Push the data to the MongoDB Cloud
        await student.save();

        // Success message sent back to the Website
        res.status(201).json({ message: "Student registered successfully!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error. Something went wrong on our end." });
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
            token: token, // <--- THE GATE PASS
            student: {
                _id: student._id,
                fullName: student.fullName,
                regNo: student.regNo,
                email: student.email,
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
        // We now expect GPS coordinates from the QR code and the phone
        const { unitName, unitCode, lecturerLat, lecturerLng, studentLat, studentLng, studentId } = req.body;

        // --- STEP 3: THE DATA GUARD ---
        // This ensures the math doesn't run on "undefined" or "null" values
        if (!lecturerLat || !lecturerLng || !studentLat || !studentLng) {
            console.log("Missing coordinates in request:", req.body);
            return res.status(400).json({ 
                message: "GPS data missing. Ensure both phone and lecturer have location enabled." 
            });
        }

        // 1. Calculate the physical distance
        // Since we checked them above, we know these are now safe to calculate
        const distance = calculateDistance(
            Number(lecturerLat), 
            Number(lecturerLng), 
            Number(studentLat), 
            Number(studentLng)
        );

        // 2. The Geofence Check (50 Meters)
        if (distance > 50) {
            return res.status(403).json({ 
                message: `Too far! You are ${Math.round(distance)}m away.` 
            });
        }

        // 3. Double-Scan Prevention (Keep your existing logic)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alreadyScanned = await Attendance.findOne({
            student: studentId,
            unitCode: unitCode,
            date: { $gte: today }
        });

        if (alreadyScanned) {
            return res.status(400).json({ message: "Attendance already recorded for today." });
        }

        // 4. Create record with the Distance field
        const newRecord = new Attendance({
            student: studentId,
            unitName,
            unitCode,
            distance: Math.round(distance), // Save the proof of location
            status: 'Present'
        });

        await newRecord.save();
        res.status(201).json({ 
            message: `Successfully signed for ${unitName}!`, 
            distance: Math.round(distance) 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during verification." });
    }
});

// --- FETCH STUDENT ATTENDANCE HISTORY ---
// This allows the student to see all their past scans
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

// GET /api/auth/lecturer/attendance/:unitCode
router.get('/lecturer/attendance/:unitCode', async (req, res) => {
    try {
        const { unitCode } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        // Find attendance for this unit that happened today
        // .populate('student', 'fullName regNo') pulls the student's name from the other collection
        const attendanceList = await Attendance.find({
            unitCode: unitCode,
            date: { $gte: today }
        }).populate('student', 'fullName regNo');

        res.status(200).json(attendanceList);
    } catch (error) {
        res.status(500).json({ message: "Error fetching live attendance" });
    }
});

// We export this so the Main Brain (index.js) can use it
module.exports = router;