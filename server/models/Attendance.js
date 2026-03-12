const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    // 1. Who attended? (Links to the Student's ID)
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    // 2. What unit/course was it?
    unitName: {
        type: String,
        required: true
    },
    // 3. What is the unit code? (e.g., SIT 302)
    unitCode: {
        type: String,
        required: true
    },
    // 4. When did they scan?
    date: {
        type: Date,
        default: Date.now // Automatically sets the current time/date
    },
    // 5. Status (for future-proofing)
    status: {
        type: String,
        default: 'Present'
    }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);