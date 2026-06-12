const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String },
  performedByRole: { type: String },
  performedByDept: { type: String },
  targetModel: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String, default: 'Administrative Update' },
  targetDept: { type: String, default: 'General' },
  targetSemester: { type: String },
  targetSection: { type: String },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Optional: Automatically expire logs after some time (e.g., 1 year)
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('Log', logSchema);
