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
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
