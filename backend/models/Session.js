const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  timetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  qrToken: { type: String },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  facultyLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  department: { type: String },
  year: { type: String },
  semester: { type: String },
  section: { type: String },
  period: { type: String },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

sessionSchema.index({ faculty: 1, date: -1, isActive: 1 });
sessionSchema.index({ timetable: 1, date: 1 });
sessionSchema.index({ locked: 1, date: 1 });

module.exports = mongoose.model('Session', sessionSchema);
