const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    regNo: { type: String, required: true, unique: true, match: [/^[A-Z]{3}\d{3}-\d{4}\/\d{4}$/, 'Invalid Format'] },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'lecturer'], default: 'student' },
    course: { type: String, required: true }, 
    school: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);