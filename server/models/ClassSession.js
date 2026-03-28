const mongoose = require('mongoose');

const ClassSessionSchema = new mongoose.Schema({
    unitCode: { type: String, required: true },
    unitName: { type: String, required: true },
    sessionId: { type: String, required: true }, // The unique ID from the QR code
    date: { type: Date, default: Date.now } // The exact moment the lecturer clicked start
});

module.exports = mongoose.model('ClassSession', ClassSessionSchema);