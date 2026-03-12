const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // The scrambler we just installed
const Student = require('../models/Student'); // The blueprint we made in Step 1

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

// --- THE LOGIN DOORWAY ---
// --- THE LOGIN DOORWAY ---
router.post('/login', async (req, res) => {
    console.log("Login Attempt:", req.body); 
    try {
        const { regNo, password } = req.body;

        // 1. Find the student by Registration Number
        const student = await Student.findOne({ regNo });
        if (!student) {
            return res.status(400).json({ message: "Invalid Registration Number or Password" });
        }

        // 2. Compare the entered password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Registration Number or Password" });
        }

        // 3. Send back success and the info (Including _id and ROLE!)
        res.json({
            message: "Welcome back!",
            student: {
                _id: student._id,       // Crucial for tracking who is scanning
                fullName: student.fullName,
                regNo: student.regNo,
                email: student.email,
                role: student.role || 'student' // Sends 'lecturer' if you updated it in Compass
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
        const { studentId, unitName, unitCode } = req.body;

        // 1. Check if the student already scanned for THIS unit TODAY
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alreadyScanned = await Attendance.findOne({
            student: studentId,
            unitCode: unitCode,
            date: { $gte: today }
        });

        if (alreadyScanned) {
            return res.status(400).json({ message: "You have already signed for this unit today!" });
        }

        // 2. Create the record
        const newRecord = new Attendance({
            student: studentId,
            unitName,
            unitCode
        });

        await newRecord.save();
        res.status(201).json({ message: `Successfully signed for ${unitName}!` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during scanning" });
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