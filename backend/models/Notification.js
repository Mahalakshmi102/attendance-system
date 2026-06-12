const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['Alert', 'Info', 'Warning', 'Success'], default: 'Info' },
  read: { type: Boolean, default: false },
  link: { type: String }
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
