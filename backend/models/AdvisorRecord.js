const mongoose = require('mongoose');

const advisorRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  advisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Counseling', 'ParentMeeting', 'Grievance', 'Mentorship', 'Intervention'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Open', 'In-Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  actionTaken: {
    type: String,
    trim: true,
    maxlength: 500
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isEscalatedToHOD: {
    type: Boolean,
    default: false
  },
  escalationRemarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  parentName: {
    type: String,
    trim: true
  },
  parentMobile: {
    type: String,
    trim: true
  }
}, { timestamps: true });

advisorRecordSchema.index({ student: 1, type: 1 });
advisorRecordSchema.index({ advisor: 1, type: 1 });

module.exports = mongoose.model('AdvisorRecord', advisorRecordSchema);
