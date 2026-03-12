const mongoose = require('mongoose');

// This is the "Schema" - the rules for our data
const StudentSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true // The server will REJECT the save if this is missing
    },
    regNo: { 
        type: String, 
        required: true, 
        unique: true // This ensures two students can't have the same Reg Number
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true // We will scramble this later for security
    },
    role: {
        type: String,
        enum: ['student', 'lecturer'], // Only allows these two values
        default: 'student' // New sign-ups are students by default
    },
    course: {
        type: String,
        default: "General" // If they don't provide a course, it defaults to this
    },
    createdAt: { 
        type: Date, 
        default: Date.now // Automatically records the date they signed up
    }
});

// We "export" this so our other files can use this blueprint
module.exports = mongoose.model('Student', StudentSchema);