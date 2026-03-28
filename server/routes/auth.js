const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const Student = require('../models/Student'); 
const Unit = require('../models/Unit');
const jwt = require('jsonwebtoken');
const ClassSession = require('../models/ClassSession');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const axios = require('axios'); // Use axios to avoid the "Constructor" crash

const crypto = require('crypto');

// --- GPS LOGIC: Haversine Formula ---
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
    // --- TEMPORARY STAGING MODEL ---
    const mongoose = require('mongoose');
    const PendingStudentSchema = new mongoose.Schema({
        firstName: String,
        lastName: String,
        regNo: { type: String, unique: true },
        email: String,
        password: { type: String }, // Hashed
        course: String,
        school: String,
        otp: String,
        otpExpires: Date
    }, { timestamps: true });

    // Auto-delete records after 15 minutes if not verified
    PendingStudentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });
    const PendingStudent = mongoose.model('PendingStudent', PendingStudentSchema);

// ==========================================
// 1. REGISTRATION & OTP GENERATION
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, regNo, email, password, course, school } = req.body;

        // 1. Domain & Existence Check
        if (!email.trim().toLowerCase().endsWith("@students.jkuat.ac.ke") && !email.trim().toLowerCase().endsWith("@jkuat.ac.ke")) {
            return res.status(403).json({ message: "Only JKUAT emails are allowed." });
        }

        const alreadyVerified = await Student.findOne({ regNo });
        if (alreadyVerified) return res.status(400).json({ message: "Student already registered and verified." });

        // 2. Prep OTP & Hashing
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save to "Pending" Staging Area (Update if exists, else create)
        await PendingStudent.findOneAndUpdate(
            { regNo },
            { firstName, lastName, email, password: hashedPassword, course, school, otp, otpExpires },
            { upsert: true, new: true }
        );

        // 4. Send Email via Brevo REST API
        try {
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: "JKUAT Attendance", email: process.env.SENDER_EMAIL },
                to: [{ email: email }],
                subject: "Verify your JKUAT Student Account",
                htmlContent: `
                    <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px;">
                        <h2 style="color: #1e293b;">JKUAT Attendance System</h2>
                        <p style="color: #475569;">Hello ${firstName}, your verification code is:</p>
                        <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 30px auto; max-width: 250px; border: 2px solid #e2e8f0;">
                            <h1 style="margin: 0; color: #4338ca; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
                        </div>
                    </div>`
            }, {
                headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
            });

            res.status(200).json({ message: "OTP sent to email", requireOtp: true });

        } catch (emailErr) {
            return res.status(500).json({ message: "Email delivery failed." });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }
});

// ==========================================
// 2. OTP VERIFICATION & LOGIN
// ==========================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { regNo, otp } = req.body;

        // 1. Find in the Staging Area
        const pending = await PendingStudent.findOne({ regNo });
        if (!pending) return res.status(404).json({ message: "Registration session not found or expired." });

        // 2. Validate OTP
        if (pending.otp !== otp) return res.status(400).json({ message: "Invalid code." });
        if (new Date() > pending.otpExpires) return res.status(400).json({ message: "Code expired. Please register again." });

        // 3. THE MOMENT OF TRUTH: Transfer to the REAL Student collection
        const verifiedStudent = new Student({
            firstName: pending.firstName,
            lastName: pending.lastName,
            regNo: pending.regNo,
            email: pending.email,
            password: pending.password, // Already hashed
            course: pending.course,
            school: pending.school,
            isVerified: true
        });

        await verifiedStudent.save();

        // 4. Cleanup: Delete from Pending so it's not sitting in your DB
        await PendingStudent.deleteOne({ regNo });

        res.status(200).json({ message: "Identity verified! You can now log in." });

    } catch (error) {
        res.status(500).json({ message: "Verification error." });
    }
});
// ==========================================
// 3. SCAN DOORWAY (Geofencing)
// ==========================================
router.post('/scan', async (req, res) => {
    try {
        const { unitName, unitCode, unitId, sessionId, lecturerLat, lecturerLng, studentLat, studentLng, studentId } = req.body;
        const student = await Student.findById(studentId);
        const unit = await Unit.findOne({ code: unitCode });

        if (student.course !== unit.course) return res.status(403).json({ message: `This unit is for ${unit.course} students.` });

        const distance = calculateDistance(Number(lecturerLat), Number(lecturerLng), Number(studentLat), Number(studentLng));
        if (distance > 2850) return res.status(403).json({ message: `Too far! (${Math.round(distance)}m away)` });

        const alreadyScanned = await Attendance.findOne({ student: studentId, sessionId });
        if (alreadyScanned) return res.status(400).json({ message: "Attendance already recorded." });

        const newRecord = new Attendance({ student: studentId, unitName, unitCode, unitId, sessionId, distance: Math.round(distance), status: 'Present' });
        await newRecord.save();
        res.status(201).json({ message: "Verified!", distance: Math.round(distance) });
    } catch (error) { res.status(500).json({ message: "Scan Error" }); }
});

// ==========================================
// 4. LECTURER ROUTES
// ==========================================
router.post('/lecturer/session', async (req, res) => {
    try {
        await ClassSession.create(req.body);
        res.status(201).json({ message: "Session Anchored successfully" });
    } catch (error) { res.status(500).json({ message: "Failed to anchor session" }); }
});

router.get('/lecturer/attendance/:unitCode/:sessionId', async (req, res) => {
    try {
        const list = await Attendance.find({ unitCode: req.params.unitCode, sessionId: req.params.sessionId }).populate('student', 'firstName lastName regNo');
        res.status(200).json(list);
    } catch (error) { res.status(500).json({ message: "Error fetching attendance" }); }
});

router.post('/lecturer/unit/:unitId/increment', async (req, res) => {
    try {
        const updated = await Unit.findByIdAndUpdate(req.params.unitId, { $inc: { totalSessions: 1 } }, { new: true });
        res.status(200).json(updated);
    } catch (error) { res.status(500).json({ message: "Increment failed" }); }
});

// ==========================================
// 5. HISTORY & STATS ENGINE
// ==========================================
router.get('/history/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        const presentRecords = await Attendance.find({ student: req.params.studentId }).lean();
        const presentSessionIds = presentRecords.map(r => r.sessionId);

        const courseUnits = await Unit.find({ course: student.course });
        const masterSessions = await ClassSession.find({ unitCode: { $in: courseUnits.map(u => u.code) } }).lean();

        let fullHistory = [...presentRecords];
        masterSessions.forEach((session) => {
            if (!presentSessionIds.includes(session.sessionId)) {
                fullHistory.push({ _id: `absent_${session.sessionId}`, student: student._id, unitCode: session.unitCode, unitName: session.unitName, sessionId: session.sessionId, date: session.date, status: 'Absent' });
            }
        });
        fullHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.status(200).json(fullHistory);
    } catch (error) { res.status(500).json({ message: "History error" }); }
});

router.get('/stats/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        const courseUnits = await Unit.find({ course: student.course });
        const attendedRecords = await Attendance.find({ student: student._id });

        const stats = await Promise.all(courseUnits.map(async (unit) => {
            const attendedCount = attendedRecords.filter(rec => rec.unitCode === unit.code).length;
            const percent = unit.totalSessions > 0 ? (attendedCount / unit.totalSessions) * 100 : 100;

            if (unit.totalSessions >= 3 && percent < 75) {
                const lastNotif = await Notification.findOne({ student: student._id, unitCode: unit.code }).sort({ date: -1 });
                if (!lastNotif || lastNotif.type !== 'warning') {
                    await Notification.create({ student: student._id, unitCode: unit.code, title: 'Low Attendance', message: `Attendance for ${unit.name} is ${Math.round(percent)}%.`, type: 'warning' });
                }
            }
            return { unitId: unit._id, unitCode: unit.code, unitName: unit.name, totalSessions: unit.totalSessions, attended: attendedCount };
        }));
        res.status(200).json(stats);
    } catch (error) { res.status(500).json({ message: "Stats error" }); }
});

// ==========================================
// 6. NOTIFICATION SYSTEM
// ==========================================
router.get('/notifications/:studentId', async (req, res) => {
    try {
        const notifs = await Notification.find({ student: req.params.studentId }).sort({ date: -1 }).limit(20);
        res.status(200).json(notifs);
    } catch (error) { res.status(500).json({ message: "Fetch failed" }); }
});

router.put('/notifications/mark-read/:studentId', async (req, res) => {
    try {
        await Notification.updateMany({ student: req.params.studentId, isRead: false }, { $set: { isRead: true } });
        res.status(200).json({ message: "Marked all as read" });
    } catch (error) { res.status(500).json({ message: "Update failed" }); }
});

// ==========================================
// STEP 16: FORGOT PASSWORD (Generate Link)
// ==========================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const student = await Student.findOne({ email });

        if (!student) {
            // Security best practice: Don't reveal if the email exists or not
            return res.status(200).json({ message: "A reset link has been sent to the email." });
        }

        // Generate a secure, random 64-character hex token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Save to database (Expires in 15 minutes)
        student.resetPasswordToken = resetToken;
        student.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await student.save();

        // Create the reset link (pointing to your React frontend)
        //const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
        
        const resetUrl = `http://192.168.0.102:5173/reset-password/${resetToken}`;

        // 5. Send Email via Brevo REST API (Matching your working register route)
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "JKUAT Security", email: process.env.SENDER_EMAIL },
            to: [{ email: email }],
            subject: "Password Reset Request",
            htmlContent: `
                <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #1e293b;">Password Reset</h2>
                    <p style="color: #475569; font-size: 16px;">We received a request to reset your password.</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset My Password</a>
                    <p style="color: #94a3b8; font-size: 12px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
                </div>
            `
        }, {
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
        });

        res.status(200).json({ message: "A reset link has been sent to the email." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Error processing request." });
    }
});

// ==========================================
// STEP 16: RESET PASSWORD (Save New Password)
// ==========================================
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        
        // Find student with this token AND ensure it hasn't expired
        const student = await Student.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!student) {
            return res.status(400).json({ message: "Invalid or expired reset link." });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(password, salt);

        // Clear the tokens so the link can't be used again
        student.resetPasswordToken = null;
        student.resetPasswordExpires = null;
        await student.save();

        res.status(200).json({ message: "Password has been successfully reset!" });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Server error during password reset." });
    }
});

// ==========================================
// STEP 16: CHANGE PASSWORD (Inside Profile)
// ==========================================
router.post('/change-password', async (req, res) => {
    try {
        const { studentId, currentPassword, newPassword } = req.body;
        const student = await Student.findById(studentId);

        if (!student) return res.status(404).json({ message: "Student not found." });

        // 1. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        // --- NEW SECURITY CHECK STARTS HERE ---
        // Check if the new password is the same as the old one
        const isSamePassword = await bcrypt.compare(newPassword, student.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be the same as your current one." });
        }
        // --- NEW SECURITY CHECK ENDS HERE ---

        // 2. Hash and Save new password
        const salt = await bcrypt.genSalt(10);
        student.password = await bcrypt.hash(newPassword, salt);
        await student.save();

        // 3. Send Security Alert via Brevo REST API
        try {
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: "JKUAT Security", email: process.env.SENDER_EMAIL },
                to: [{ email: student.email }],
                subject: "Security Alert: Password Changed",
                htmlContent: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #1e293b;">Security Notification</h2>
                        <p>Hello ${student.firstName},</p>
                        <p>This is a confirmation that the password for your JKUAT Attendance account was recently changed.</p>
                        <p style="color: #64748b; font-size: 14px;">If you did not perform this action, please contact the ICT department immediately.</p>
                    </div>`
            }, {
                headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
            });
        } catch (emailErr) {
            console.error("Alert Email Failed:", emailErr.message);
        }

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: "Server error during update." });
    }
});

module.exports = router;