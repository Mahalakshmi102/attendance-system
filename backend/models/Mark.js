const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  internal: { type: Number, default: 0 },
  external: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, trim: true, maxlength: 300 },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent duplicate marks for same student and subject
markSchema.index({ student: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
