const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', 
        required: true
    },
    unitName: { type: String, required: true },
    unitCode: { type: String, required: true },
    sessionId: { type: String },
    unitId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Unit', 
        required: true 
    },
    distance: { type: Number, required: true },
    // Ensure this is called 'date' to match your route logic
    date: {
        type: Date,
        default: Date.now 
    },
    status: {
        type: String,
        default: 'Present'
    }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);