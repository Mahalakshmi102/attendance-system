const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  timestamp: { type: Date, default: Date.now },
  markedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'On-Duty'], default: 'Present' },
  markedBy: { type: String, enum: ['Student', 'Faculty', 'Admin'], default: 'Student' },
  entryType: { type: String, enum: ['QR', 'Manual'], default: 'QR' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, trim: true, maxlength: 300 },
  period: { type: String },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent duplicate attendance for same session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ subject: 1, date: -1 });
attendanceSchema.index({ session: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
