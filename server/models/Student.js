const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    regNo: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'lecturer'], default: 'student' },
    course: { type: String, required: true }, // Changed from "General" to required
    school: { type: String, required: true }, // ADDED THIS FIELD
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);