const mongoose = require('mongoose');

const advisorCommunicationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Nullable for class broadcast
  },
  recipientType: {
    type: String,
    enum: ['Student', 'Parent', 'HOD', 'Faculty', 'ClassBroadcast'],
    required: true
  },
  targetClass: {
    department: { type: String },
    year: { type: String },
    semester: { type: String },
    section: { type: String }
  },
  type: {
    type: String,
    enum: [
      'Announcement',
      'AttendanceWarning',
      'AcademicReminder',
      'MeetingNotice',
      'ExamSchedule',
      'AssignmentNotification',
      'CounselingRecommendation'
    ],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isHODEscalation: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

advisorCommunicationSchema.index({ sender: 1, type: 1 });
advisorCommunicationSchema.index({ recipient: 1 });
advisorCommunicationSchema.index({ 'targetClass.department': 1, 'targetClass.year': 1, 'targetClass.section': 1 });

module.exports = mongoose.model('AdvisorCommunication', advisorCommunicationSchema);
