const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Principal', 'CoE', 'Faculty', 'Student', 'HoD', 'Other Staff', 'Class Advisor'],
    default: 'Student',
  },
  department: {
    type: String,
    default: 'General',
  },
  semester: {
    type: String,
  },
  year: {
    type: String,
  },
  section: {
    type: String,
  },
  batch: { type: String },
  registerNumber: {
    type: String,
  },
  rollNumber: { type: String },
  employeeId: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dob: { type: Date },
  mobile: { type: String },
  address: { type: String },
  parentDetails: {
    name: { type: String },
    mobile: { type: String }
  },
  designation: { type: String },
  qualification: { type: String },
  dateOfJoining: { type: Date },
  employmentStatus: { 
    type: String, 
    enum: ['Full-time', 'Part-time', 'Contract', 'Ad-hoc'],
    default: 'Full-time'
  },
  experience: { type: String },
  classAdvisorDetails: {
    isClassAdvisor: { type: Boolean, default: false },
    department: { type: String },
    year: { type: String },
    semester: { type: String },
    section: { type: String }
  },
  permissions: [{ type: String }],
  lastLogin: { type: Date },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFirstLogin: {
    type: Boolean,
    default: true,
  },
  resetPasswordOtp: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
