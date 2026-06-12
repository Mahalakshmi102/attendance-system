const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetModel: { type: String, enum: ['Attendance', 'Mark', 'Leave'], required: true },
  targetRecord: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: function() { return this.targetModel !== 'Leave'; } 
  },
  reason: { type: String, required: true, maxlength: 500 },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewRemarks: { type: String, maxlength: 300 }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
