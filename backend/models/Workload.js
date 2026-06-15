const mongoose = require('mongoose');

const workloadSchema = new mongoose.Schema({
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true 
  },
  department: { 
    type: String, 
    required: true 
  },
  year: { 
    type: String, 
    required: true 
  },
  semester: { 
    type: String, 
    required: true 
  },
  section: { 
    type: String, 
    required: true 
  },
  assignedHours: { 
    type: Number, 
    required: true, 
    default: 36 
  }
}, { timestamps: true });

// Ensure a faculty can only have one workload entry per subject & class section combo
workloadSchema.index({ faculty: 1, subject: 1, department: 1, year: 1, semester: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Workload', workloadSchema);
