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
        semester: String,
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
        const { firstName, lastName, regNo, email, password, course, semester, school } = req.body;

        // 1. Domain & Existence Check
        if (!email.trim().toLowerCase().endsWith("@students.jkuat.ac.ke") && !email.trim().toLowerCase().endsWith("@jkuat.ac.ke")) {
            return res.status(403).json({ message: "Only JKUAT emails are allowed." });
        }

        const alreadyVerified = await Student.findOne({ regNo });
        if (alreadyVerified) return res.status(400).json({ message: "Student already registered and verified." });

        // 2. Prep OTP & Hashing
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        console.log(`\n🚨 [DEV MODE] OTP for ${email} is: ${otp} 🚨\n`); //developer hack to view all otp;valid and invalid

        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save to "Pending" Staging Area (Update if exists, else create)
        await PendingStudent.findOneAndUpdate(
            { regNo },
            { firstName, lastName, email, password: hashedPassword, course, semester, school, otp, otpExpires },
            { upsert: true, returnDocument: 'after' }
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
// ==========================================
// 2. OTP VERIFICATION & LOGIN (Surgical Fix)
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

        // 3. THE FIX: Transfer ALL required fields from Pending to Student
        const verifiedStudent = new Student({
            firstName: pending.firstName,
            lastName: pending.lastName,
            regNo: pending.regNo,
            email: pending.email,
            password: pending.password, 
            course: pending.course,
            semester: pending.semester, 
            school: pending.school, 
            isVerified: true
        });

        // 4. Save and handle potential validation errors
        try {
            await verifiedStudent.save();
        } catch (saveError) {
            console.error("DB Validation Error:", saveError.message);
            return res.status(500).json({ message: "Database save failed: " + saveError.message });
        }

        // 5. Cleanup
        await PendingStudent.deleteOne({ regNo });

        res.status(200).json({ message: "Identity verified! You can now log in." });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: "Internal server error during verification." });
    }
});

// ==========================================
// LOGIN ENGINE (The Missing Link)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { regNo, password } = req.body;

        // 1. Find User by RegNo
        const user = await Student.findOne({ regNo });
        if (!user) {
            return res.status(404).json({ message: "Account not found. Please register first." });
        }

        // 2. Check if OTP was verified (Safety check)
        if (!user.isVerified) {
            return res.status(403).json({ message: "Account not verified. Please check your email for the OTP." });
        }

        // 3. Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Password." });
        }

        // 4. Generate Security Token (JWT)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'your_secret_key', 
            { expiresIn: '7d' }
        );

        // 5. Send back user data (excluding password)
        const userResponse = {
            _id: user._id, 
            firstName: user.firstName,
            lastName: user.lastName,
            regNo: user.regNo,
            email: user.email,
            role: user.role,
            course: user.course,
            school: user.school,
            semester: user.semester
        };

        res.status(200).json({
            token,
            student: userResponse // Matches your frontend 'response.data.student' logic
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});

// ==========================================
// 3. SCAN DOORWAY (Geofencing & Security)
// ==========================================
router.post('/scan', async (req, res) => {
    try {
        const { unitName, unitCode, unitId, sessionId, lecturerLat, lecturerLng, studentLat, studentLng, studentId, distance: preCalculatedDistance } = req.body;
        
        const student = await Student.findById(studentId);
        const unit = await Unit.findOne({ code: unitCode });

        if (!student || !unit) {
            return res.status(404).json({ message: "Student or Unit not found." });
        }

        // 🚨 SECURITY CHECK 1 & 2: Correct Course and Semester?
        if (student.course !== unit.course) {
            return res.status(403).json({ message: `Denied: This unit is for ${unit.course} students.` });
        }
        if (student.semester !== unit.semester) {
            return res.status(403).json({ message: `Denied: This unit is for ${unit.semester} students.` });
        }

        // 🚨 SECURITY CHECK 3: Geofencing (SMART FIX FOR OFFLINE SYNC)
        let finalDistance = 0;

        // If it's a live scan, we recalculate. If it's an offline sync, we use the preCalculatedDistance
        if (lecturerLat && lecturerLng && studentLat && studentLng) {
            finalDistance = calculateDistance(Number(lecturerLat), Number(lecturerLng), Number(studentLat), Number(studentLng));
        } else if (preCalculatedDistance !== undefined) {
            finalDistance = Number(preCalculatedDistance); // Trust the offline geofence calculation
        } else {
            return res.status(400).json({ message: "No valid location data provided." });
        }

        if (finalDistance > 2850) {
            return res.status(403).json({ message: `Too far! (${Math.round(finalDistance)}m away)` });
        }

        // 🚨 SECURITY CHECK 4: No Double Scanning
        const alreadyScanned = await Attendance.findOne({ student: studentId, sessionId });
        if (alreadyScanned) {
            return res.status(400).json({ message: "Attendance already recorded." });
        }

        // Save the valid scan
        const newRecord = new Attendance({ 
            student: studentId, 
            unitName, 
            unitCode, 
            unitId, 
            sessionId, 
            distance: Math.round(finalDistance), 
            status: 'Present' 
        });
        
        await newRecord.save();
        res.status(201).json({ message: "Verified!", distance: Math.round(finalDistance) });

    } catch (error) { 
        console.error("Scan Error:", error);
        res.status(500).json({ message: "Scan Error", error: error.message }); 
    }
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
        const updated = await Unit.findByIdAndUpdate(req.params.unitId, { $inc: { totalSessions: 1 } }, { returnDocument: 'after' });
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

        const courseUnits = await Unit.find({ course: student.course, semester: student.semester });
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
        const courseUnits = await Unit.find({ course: student.course, semester: student.semester });
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
// ==========================================
// STEP 16: FORGOT PASSWORD (Generate Link)
// ==========================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { regNo } = req.body;

        // 1. STRICT GATEKEEPER: Reject empty requests immediately
        if (!regNo || regNo.trim() === "") {
            return res.status(400).json({ message: "Registration number is required." });
        }

        // 2. Search by Registration Number, NOT email
        const student = await Student.findOne({ regNo });

        if (!student) {
            return res.status(200).json({ message: "If that ID exists, a reset link has been sent." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        student.resetPasswordToken = resetToken;
        student.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await student.save();

        // Replace the hardcoded string with this dynamic origin check:
        const clientUrl = req.get('origin') || process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "JKUAT Security", email: process.env.SENDER_EMAIL },
            to: [{ email: student.email }], // Uses the specific email attached to this RegNo
            subject: "Password Reset Request",
            htmlContent: `
                <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #1e293b;">Password Reset</h2>
                    <p style="color: #475569; font-size: 16px;">We received a password reset request for account: <strong>${regNo}</strong>.</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset My Password</a>
                    <p style="color: #94a3b8; font-size: 12px;">This link expires in 15 minutes.</p>
                </div>
            `
        }, {
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' }
        });

        res.status(200).json({ message: "A reset link has been sent to the registered email." });

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

// ==========================================
// STEP 19: MANUAL ATTENDANCE OVERRIDE
// ==========================================
router.post('/lecturer/attendance/toggle', async (req, res) => {
    try {
        const { studentId, sessionId, unitCode, unitName, unitId, action } = req.body;

        if (action === 'mark_present') {
            // Prevent duplicates if clicked twice quickly
            const existing = await Attendance.findOne({ student: studentId, sessionId });
            if (!existing) {
                const newRecord = new Attendance({
                    student: studentId,
                    unitName,
                    unitCode,
                    unitId,
                    sessionId,
                    distance: 0, // Bypasses GPS
                    status: 'Manual' // Flags it as a lecturer override
                });
                await newRecord.save();
            }
        } else if (action === 'mark_absent') {
            // "Untoggle" a student by deleting their scan for this session
            await Attendance.deleteOne({ student: studentId, sessionId });
        }

        res.status(200).json({ message: "Attendance updated manually." });
    } catch (error) {
        console.error("Toggle Error:", error);
        res.status(500).json({ message: "Failed to toggle attendance." });
    }
});

// FETCH ALL STUDENTS EXPECTED FOR A SPECIFIC UNIT (By Course & Semester)
router.get('/expected-students/:course/:semester', async (req, res) => {
    try {
        const { course, semester } = req.params;
        
        // Find students who match BOTH the course and the semester
        const students = await Student.find({ 
            course: course, 
            semester: semester 
        }).select('firstName lastName regNo _id').sort({ firstName: 1 });

        res.status(200).json(students);
    } catch (error) {
        console.error("Error fetching expected students:", error);
        res.status(500).json({ message: "Failed to fetch student list." });
    }
});

router.get('/lecturer/unit-history/:unitCode', async (req, res) => {
    try {
        const unit = await Unit.findOne({ code: req.params.unitCode });
        if (!unit) return res.status(404).json({ message: "Unit not found" });

        const expectedStudents = await Student.find({ 
            course: unit.course, 
            semester: unit.semester 
        }).sort({ firstName: 1 });

        const attendances = await Attendance.find({ unitCode: unit.code });

        // 1. Identify unique sessions and sort them
        const uniqueSessionIds = [...new Set(attendances.map(a => a.sessionId))].sort();
        
        // 2. Create clean headers: "Session 1 - 23 Apr (Thu)"
        const sessionHeaders = uniqueSessionIds.map((sId, index) => {
            const sample = attendances.find(a => a.sessionId === sId);
            const d = new Date(sample.date);
            const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const dayStr = d.toLocaleDateString('en-GB', { weekday: 'short' });
            return `Session ${index + 1} - ${dateStr} (${dayStr})`;
        });

        const students = expectedStudents.map(student => {
            const studentScans = attendances.filter(a => a.student.toString() === student._id.toString());
            
            // 3. Map status for EVERY session (Matrix)
            const matrix = uniqueSessionIds.map(sId => {
                const found = studentScans.find(scan => scan.sessionId === sId);
                return found ? "Present" : "Absent";
            });

            return {
                id: student._id,
                name: `${student.firstName} ${student.lastName}`,
                regNo: student.regNo,
                percentage: (unit.totalSessions || 0) > 0 ? Math.round((studentScans.length / unit.totalSessions) * 100) : 0,
                matrix 
            };
        });

        res.status(200).json({ students, sessionHeaders });
    } catch (error) {
        res.status(500).json({ message: "Server error generating history" });
    }
});

/*
// ==========================================
// 🚨 DEV BACKDOOR: BULK PASSWORD RESET 🚨
// ==========================================
router.get('/dev/reset-passwords', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);

        // Put the 3 specific emails you want to KEEP here:
        const emailsToKeep = [
            'lemashon.ian@students.jkuat.ac.ke', 
            'christine.muiruri@students.jkuat.ac.ke',
            'christine.muiruri@students.jkuat.ac.ke'
        ];

        const result = await Student.updateMany(
            { email: { $nin: emailsToKeep } }, 
            { $set: { password: hashedPassword } }
        );

        res.status(200).json({ 
            message: "Success! Passwords reset to 'Password123!'", 
            studentsUpdated: result.modifiedCount 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
*/

module.exports = router;