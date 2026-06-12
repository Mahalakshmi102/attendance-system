const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

const ATTENDANCE_GRACE_MIN = Number(process.env.ATTENDANCE_LATE_GRACE_MIN || 5);
const MAX_DISTANCE = Number(process.env.ATTENDANCE_MAX_DISTANCE_METERS || 500);
const VALID_STATUSES = new Set(['Present', 'Late', 'Absent', 'On-Duty']);

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (degree) => degree * (Math.PI / 180);
  
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const buildError = (res, statusCode, category, message, extra = {}) => {
  return res.status(statusCode).json({ category, message, ...extra });
};

const getSessionStartDateTime = (session) => {
  const start = new Date(session.date);
  if (session.timetable && session.timetable.startTime) {
    const [hourStr, minuteStr] = session.timetable.startTime.split(':');
    const hours = Number(hourStr);
    const minutes = Number(minuteStr);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      start.setHours(hours, minutes, 0, 0);
    }
  }
  return start;
};

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

const toSafeIsoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

// Get active session for Faculty
exports.getActiveSession = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const session = await Session.findOne({
      faculty: req.user.id,
      date: { $gte: today },
      isActive: true,
      expiresAt: { $gt: new Date() } // Only return if not expired
    }).populate('subject').populate('timetable');

    if (!session) {
      return res.status(200).json({ active: false, message: 'No active session found for you right now.' });
    }

    res.status(200).json({ active: true, session });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update Faculty Location for active session
exports.updateFacultyLocation = async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, faculty: req.user.id, isActive: true },
      { facultyLocation: { lat, lng } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Active session not found' });
    }

    res.json({ message: 'Faculty location updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Mark Attendance for Student via QR
exports.markAttendance = async (req, res) => {
  try {
    const { qrToken, studentLocation } = req.body;

    // Check token and find active session
    if (!qrToken || typeof qrToken !== 'string' || !qrToken.trim()) {
      return buildError(res, 400, 'validation', 'QR token is required.');
    }

    const session = await Session.findOne({ qrToken: qrToken.trim(), isActive: true }).populate('timetable');

    if (!session) {
      return buildError(res, 400, 'expired', 'Invalid or expired QR code.');
    }

    const now = new Date();
    if (now > session.expiresAt || now < session.date) {
      return buildError(res, 400, 'expired', 'QR code has expired.');
    }

    // Location validation
    if (!studentLocation || typeof studentLocation !== 'object') {
      return buildError(res, 400, 'validation', 'Location access is required to mark attendance.');
    }
    const { lat, lng } = studentLocation;
    const hasValidStudentLocation = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasValidStudentLocation) {
      return buildError(res, 400, 'validation', 'Valid student location coordinates are required.');
    }

    if (session.facultyLocation && Number.isFinite(session.facultyLocation.lat) && Number.isFinite(session.facultyLocation.lng)) {
      const distance = calculateDistance(
        session.facultyLocation.lat,
        session.facultyLocation.lng,
        lat,
        lng
      );

      if (distance > MAX_DISTANCE) {
        return buildError(
          res,
          403,
          'forbidden',
          `Location verification failed! You are ${Math.round(distance)} meters away. You must be within ${MAX_DISTANCE} meters of the faculty.`
        );
      }
    }

    // Prevent duplicate mark (app-level check)
    const existing = await Attendance.findOne({ session: session._id, student: req.user.id });
    if (existing) {
      return buildError(res, 409, 'conflict', 'Attendance already marked for this session.');
    }

    // Deterministic late logic from timetable/session start + grace
    const sessionStart = getSessionStartDateTime(session);
    const timeDiffMinutes = (now - sessionStart) / (1000 * 60);
    const status = timeDiffMinutes > ATTENDANCE_GRACE_MIN ? 'Late' : 'Present';

    // Mark attendance
    const attendance = new Attendance({
      session: session._id,
      student: req.user.id,
      subject: session.subject,
      date: session.date,
      period: session.period || (session.timetable && session.timetable.period) || 'H1',
      status,
      markedBy: 'Student',
      entryType: 'QR',
      markedAt: now
    });
    await attendance.save();

    res.status(200).json({
      category: 'success',
      message: `Attendance marked successfully as ${status}!`,
      record: attendance
    });
  } catch (error) {
    // If unique index fails (race condition)
    if (error.code === 11000) {
      return buildError(res, 409, 'conflict', 'Attendance already marked for this session.');
    }
    res.status(500).json({ category: 'server', message: 'Server Error' });
  }
};

// Get all attendance records for a specific session (For Faculty)
exports.getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify the session belongs to this faculty
    const session = await Session.findOne({ _id: sessionId, faculty: req.user.id });
    if (!session) {
      return res.status(403).json({ message: 'Not authorized to view this session.' });
    }

    const filters = { session: sessionId };
    if (req.query.status && VALID_STATUSES.has(req.query.status)) {
      filters.status = req.query.status;
    }

    const records = await Attendance.find(filters).populate('student', 'name email');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Manually update or add an attendance record (For Faculty)
exports.manualUpdateAttendance = async (req, res) => {
  try {
    const { sessionId, studentId, status, remarks, reason } = req.body;

    let session;
    if (req.user.role === 'Admin' || req.user.role === 'HoD') {
      session = await Session.findById(sessionId).populate('timetable');
    } else {
      session = await Session.findOne({ _id: sessionId, faculty: req.user.id }).populate('timetable');
    }

    if (!session) {
      return res.status(403).json({ message: 'Not authorized for this session.' });
    }

    if (session.locked && req.user.role !== 'Admin' && req.user.role !== 'HoD') {
      return res.status(403).json({ message: 'Session is locked. Direct edits are not allowed. Please raise a request.' });
    }

    const studentUser = await User.findOne({ _id: studentId, role: 'Student' }).select('name department semester section');
    if (!studentUser) {
      return res.status(400).json({ message: 'Invalid student for attendance update.' });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const existingRecord = await Attendance.findOne({ session: sessionId, student: studentId });
    const oldStatus = existingRecord ? existingRecord.status : 'None';

    // Upsert the attendance record
    const record = await Attendance.findOneAndUpdate(
      { session: sessionId, student: studentId },
      { 
        status, 
        markedBy: ['Faculty', 'Class Advisor'].includes(req.user.role) ? 'Faculty' : 'Admin',
        entryType: 'Manual',
        updatedBy: req.user.id,
        remarks: remarks ? String(remarks).trim() : undefined,
        markedAt: new Date(),
        subject: session.subject,
        date: session.date,
        period: session.period || (session.timetable && session.timetable.period) || 'H1'
      },
      { new: true, upsert: true }
    );

    // Audit logging
    const { createLog } = require('../utils/logger');
    await createLog('Manual Attendance Update', req.user, 'Attendance', record._id, {
      oldValue: oldStatus,
      newValue: status,
      reason: reason || remarks || 'Manual mark by staff',
      targetDept: studentUser.department || 'General',
      targetSemester: studentUser.semester,
      targetSection: studentUser.section,
      student: studentUser._id,
      details: `Manual attendance marked as ${status} for ${studentUser.name}`
    });

    res.json({ message: 'Attendance updated manually.', record });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Lock a session so no further attendance edits can be made
exports.lockSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await Session.findOneAndUpdate(
      { _id: sessionId, faculty: req.user.id },
      { locked: true, isActive: false },
      { new: true }
    );
    
    if (!session) {
       return res.status(404).json({ message: 'Session not found or not authorized.' });
    }
    
    // update all related attendance to locked
    // optional since we check session.locked anyway, but good for consistency
    await Attendance.updateMany({ session: sessionId }, { $set: { locked: true } });
    
    res.json({ message: 'Session locked successfully.', session });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get attendance records for the logged in student
exports.getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ student: req.user.id })
      .populate('subject', 'name code')
      .sort({ date: -1 });
    
    // Group by subject and calculate percentage
    const summary = {};
    records.forEach(r => {
      const subjId = r.subject._id.toString();
      if (!summary[subjId]) {
        summary[subjId] = { subject: r.subject.name, present: 0, late: 0, total: 0 };
      }
      summary[subjId].total += 1;
      if (r.status === 'Present' || r.status === 'On-Duty') summary[subjId].present += 1;
      if (r.status === 'Late') summary[subjId].late += 1; // Late could count as partial, but we track it separately
    });

    res.json({ records, summary });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get my attendance records in a date range (Student)
exports.getMyAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = { student: req.user.id };

    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filters)
      .populate('subject', 'name code')
      .sort({ date: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get faculty date-range attendance records for sessions they own
exports.getFacultyAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const facultySessions = await Session.find({ faculty: req.user.id }).select('_id');
    const sessionIds = facultySessions.map((s) => s._id);

    const filters = { session: { $in: sessionIds } };
    if (status && VALID_STATUSES.has(status)) {
      filters.status = status;
    }
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filters)
      .populate('student', 'name email')
      .populate('subject', 'name code')
      .sort({ date: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Subject-wise summary for faculty dashboard
exports.getFacultySubjectSummary = async (req, res) => {
  try {
    const facultyId = new mongoose.Types.ObjectId(req.user.id);

    const summary = await Attendance.aggregate([
      {
        $lookup: {
          from: 'sessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDoc'
        }
      },
      { $unwind: '$sessionDoc' },
      { $match: { 'sessionDoc.faculty': facultyId } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectDoc'
        }
      },
      { $unwind: '$subjectDoc' },
      {
        $group: {
          _id: '$subjectDoc._id',
          subjectName: { $first: '$subjectDoc.name' },
          subjectCode: { $first: '$subjectDoc.code' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $addFields: {
          attendancePercent: {
            $round: [
              {
                $multiply: [
                  { $divide: [{ $add: ['$present', '$late', '$onDuty'] }, { $cond: [{ $eq: ['$total', 0] }, 1, '$total'] }] },
                  100
                ]
              },
              1
            ]
          }
        }
      },
      { $sort: { subjectName: 1 } }
    ]);

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Download faculty attendance records as CSV (Excel-compatible)
exports.downloadFacultyReportCsv = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const facultySessions = await Session.find({ faculty: req.user.id }).select('_id');
    const sessionIds = facultySessions.map((s) => s._id);

    const filters = { session: { $in: sessionIds } };
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filters.subject = subjectId;
    }

    const records = await Attendance.find(filters)
      .populate('student', 'name email')
      .populate('subject', 'name code')
      .sort({ date: -1 });

    const headers = ['Date', 'Subject Code', 'Subject', 'Student Name', 'Student Email', 'Status', 'Marked By', 'Entry Type'];
    const rows = records.map((record) => ([
      toSafeIsoDate(record.date),
      record.subject?.code || '',
      record.subject?.name || '',
      record.student?.name || '',
      record.student?.email || '',
      record.status,
      record.markedBy,
      record.entryType
    ]));

    const csv = [headers, ...rows]
      .map((row) => row.map(toCsvValue).join(','))
      .join('\n');

    const fileName = subjectId ? `faculty-report-${subjectId}.csv` : 'faculty-report.csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('downloadFacultyReportCsv error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.startSession = async (req, res) => {
  try {
    const { timetableId } = req.body;
    const Timetable = require('../models/Timetable');
    const timetable = await Timetable.findOne({ _id: timetableId, faculty: req.user.id });
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable entry not found or not assigned to you.' });
    }
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let existing = await Session.findOne({ timetable: timetableId, date: { $gte: today } });
    if (existing) {
      existing.isActive = true;
      existing.locked = false;
      await existing.save();
      return res.json({ message: 'Session unlocked.', session: existing });
    }
    
    const { v4: uuidv4 } = require('uuid');
    const qrToken = uuidv4();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    
    const session = new Session({
      timetable: timetableId,
      subject: timetable.subject,
      faculty: req.user.id,
      date: now,
      period: timetable.period,
      qrToken,
      expiresAt
    });
    await session.save();
    res.status(201).json({ message: 'Session created successfully.', session });
  } catch (error) {
    console.error('startSession error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
