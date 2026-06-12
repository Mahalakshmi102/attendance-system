const buildError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

// Check if current time is within the allowed Marks Entry time slot (11 AM to 5 PM)
exports.validateMarksTimeSlot = (req, res, next) => {
  // Bypassed for Admin
  if (req.user && req.user.role === 'Admin') {
    return next();
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Allowed from 11:00 (inclusive) to 17:00 (exclusive)
  if (currentHour >= 11 && currentHour < 17) {
    next();
  } else {
    return buildError(res, 403, 'Time Slot Based Entry Restricted: Marks can only be entered between 11:00 AM and 05:00 PM.');
  }
};

// Check if current time is within the allowed Attendance Entry time slot
// We now rely purely on the dynamic active Session created by the Timetable Cron Job.
exports.validateAttendanceTimeSlot = (req, res, next) => {
  return next();
};
