const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  school: { type: String, required: true },
  course: { type: String, required: true },
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalSessions: { type: Number, default: 0 },
  schedule: [
    {
      day: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
      },
      startTime: { type: String }, 
      endTime: { type: String }
    }
  ]
});

module.exports = mongoose.model('Unit', UnitSchema);