const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  department: { type: String, required: true },
  year: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  dayOfWeek: { 
    type: String, 
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  period: { type: String },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classroom: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

timetableSchema.index({ dayOfWeek: 1, startTime: 1 });
timetableSchema.index({ dayOfWeek: 1, endTime: 1 });
timetableSchema.index({ faculty: 1, isActive: 1 });
timetableSchema.index({ department: 1, year: 1, semester: 1, section: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
