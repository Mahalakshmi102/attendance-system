const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { 
    type: String, 
    required: true
  },
  description: { type: String, required: true },
  term: { type: String } // e.g., "Fall 2026"
}, { timestamps: true });

academicCalendarSchema.index({ date: 1 });

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
