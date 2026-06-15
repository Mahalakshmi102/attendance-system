const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  automatedBackups: {
    type: Boolean,
    default: true,
  },
  strictGeofencing: {
    type: Boolean,
    default: false,
  },
  strictDeviceBinding: {
    type: Boolean,
    default: true,
  },
  attendanceEditWindowHours: {
    type: Number,
    default: 24,
  },
  medicalLeavePolicy: {
    type: String,
    enum: ['Count as Present', 'Count as Absent', 'Exclude'],
    default: 'Exclude'
  },
  casualLeavePolicy: {
    type: String,
    enum: ['Count as Present', 'Count as Absent', 'Exclude'],
    default: 'Count as Absent'
  },
  attendanceThreshold: {
    type: Number,
    default: 75
  },
  academicYear: {
    type: String,
    default: '2025-2026'
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
