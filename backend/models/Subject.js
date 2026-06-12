const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  credits: { type: Number, required: true },
  department: { type: String, required: true },
  regulation: { type: String, default: '2021' },
  year: { type: String },
  semester: { type: String },
  subjectType: { type: String, enum: ['Theory', 'Lab'], default: 'Theory' },
  assignedFaculty: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
