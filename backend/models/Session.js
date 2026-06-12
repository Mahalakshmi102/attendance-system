const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  timetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  qrToken: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  facultyLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  period: { type: String },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
