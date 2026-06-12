const mongoose = require('mongoose');

const isValidCoordinate = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

exports.validateMarkAttendance = (req, res, next) => {
  const { qrToken, studentLocation } = req.body || {};

  if (!qrToken || typeof qrToken !== 'string' || !qrToken.trim()) {
    return res.status(400).json({ category: 'validation', message: 'Valid qrToken is required.' });
  }

  if (!studentLocation || typeof studentLocation !== 'object') {
    return res.status(400).json({ category: 'validation', message: 'studentLocation is required.' });
  }

  const { lat, lng } = studentLocation;
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return res.status(400).json({ category: 'validation', message: 'studentLocation coordinates are invalid.' });
  }

  next();
};

exports.validateManualUpdateAttendance = (req, res, next) => {
  const { sessionId, studentId, status, remarks } = req.body || {};
  const allowedStatus = new Set(['Present', 'Late', 'Absent', 'On-Duty']);

  if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ category: 'validation', message: 'Valid sessionId and studentId are required.' });
  }

  if (!allowedStatus.has(status)) {
    return res.status(400).json({ category: 'validation', message: 'Status must be one of Present, Late, Absent, or On-Duty.' });
  }

  if (remarks !== undefined && (typeof remarks !== 'string' || remarks.length > 300)) {
    return res.status(400).json({ category: 'validation', message: 'remarks must be a string up to 300 characters.' });
  }

  next();
};
