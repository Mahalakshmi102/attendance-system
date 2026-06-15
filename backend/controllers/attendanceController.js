const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Workload = require('../models/Workload');
const AcademicCalendar = require('../models/AcademicCalendar');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

const ATTENDANCE_GRACE_MIN = Number(process.env.ATTENDANCE_LATE_GRACE_MIN || 5);
const MAX_DISTANCE = Number(process.env.ATTENDANCE_MAX_DISTANCE_METERS || 500);
const VALID_STATUSES = new Set(['Present', 'Late', 'Absent', 'On-Duty', 'On Duty', 'Medical Leave', 'Casual Leave']);

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
  return res.status(400).json({ message: 'Geofencing location services are disabled. Attendance is marked manually.' });
};

// Mark Attendance for Student via QR
exports.markAttendance = async (req, res) => {
  return res.status(400).json({ 
    category: 'forbidden',
    message: 'QR based student self-check-in has been disabled. Attendance is marked manually by faculty.' 
  });
};

// Get all attendance records for a specific session (For Faculty & Admin)
exports.getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify authority
    let session;
    const isStaff = ['Admin', 'Principal', 'CoE', 'HoD'].includes(req.user.role);
    if (isStaff) {
      session = await Session.findById(sessionId);
    } else {
      session = await Session.findOne({ _id: sessionId, faculty: req.user.id });
    }

    if (!session) {
      return res.status(403).json({ message: 'Not authorized to view this session.' });
    }

    // HOD security boundary
    if (req.user.role === 'HoD') {
      const Subject = require('../models/Subject');
      const subject = await Subject.findById(session.subject);
      if (subject && subject.department !== req.user.department) {
        return res.status(403).json({ message: 'Not authorized to view another department\'s sessions.' });
      }
    }

    const filters = { session: sessionId };
    if (req.query.status && VALID_STATUSES.has(req.query.status)) {
      filters.status = req.query.status;
    }

    const records = await Attendance.find(filters).populate('student', 'name email registerNumber rollNumber');
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

    const Settings = require('../models/Settings');
    const settings = await Settings.findOne() || { automatedBackups: false, strictGeofencing: true, strictDeviceBinding: false, attendanceEditWindowHours: 24 };
    const editWindowHours = settings.attendanceEditWindowHours !== undefined ? settings.attendanceEditWindowHours : 24;
    const timeDiffHours = (new Date() - new Date(session.date)) / (1000 * 60 * 60);
    if (timeDiffHours > editWindowHours && req.user.role !== 'Admin' && req.user.role !== 'HoD') {
      return res.status(403).json({ message: `The edit window of ${editWindowHours} hours has elapsed. Direct edits are not allowed. Please raise a request.` });
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
        period: session.period || (session.timetable && session.timetable.period) || 'H1',
        faculty: session.faculty,
        department: studentUser.department,
        year: studentUser.year,
        semester: studentUser.semester,
        section: studentUser.section
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
    const { getLeavePolicies, calculatePercentage } = require('../utils/attendanceCalculator');
    const policies = await getLeavePolicies();

    const records = await Attendance.find({ student: req.user.id })
      .populate('subject', 'name code')
      .sort({ date: -1 });
    
    // Group by subject and calculate percentage
    const summary = {};
    records.forEach(r => {
      const subjId = r.subject._id.toString();
      if (!summary[subjId]) {
        summary[subjId] = {
          subject: r.subject.name,
          counts: { Present: 0, Late: 0, Absent: 0, 'On-Duty': 0, 'On Duty': 0, 'Medical Leave': 0, 'Casual Leave': 0 },
          total: 0
        };
      }
      summary[subjId].counts[r.status] = (summary[subjId].counts[r.status] || 0) + 1;
      summary[subjId].total += 1;
    });

    const summaryList = {};
    Object.keys(summary).forEach(subjId => {
      const s = summary[subjId];
      const percentage = calculatePercentage(s.counts, policies);
      summaryList[subjId] = {
        subject: s.subject,
        present: (s.counts['Present'] || 0) + (s.counts['On-Duty'] || 0) + (s.counts['On Duty'] || 0),
        late: s.counts['Late'] || 0,
        absent: s.counts['Absent'] || 0,
        medicalLeave: s.counts['Medical Leave'] || 0,
        casualLeave: s.counts['Casual Leave'] || 0,
        total: s.total,
        percentage
      };
    });

    res.json({ records, summary: summaryList });
  } catch (err) {
    console.error('getMyAttendance error:', err);
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
    const { getLeavePolicies, calculatePercentage } = require('../utils/attendanceCalculator');
    const policies = await getLeavePolicies();

    const records = await Attendance.aggregate([
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
      { $unwind: '$subjectDoc' }
    ]);

    // Group in JS
    const summaryMap = {};
    records.forEach(r => {
      const subId = r.subjectDoc._id.toString();
      if (!summaryMap[subId]) {
        summaryMap[subId] = {
          _id: r.subjectDoc._id,
          subjectName: r.subjectDoc.name,
          subjectCode: r.subjectDoc.code,
          counts: {
            Present: 0, Late: 0, Absent: 0, 'On-Duty': 0, 'On Duty': 0, 'Medical Leave': 0, 'Casual Leave': 0
          },
          total: 0
        };
      }
      summaryMap[subId].counts[r.status] = (summaryMap[subId].counts[r.status] || 0) + 1;
      summaryMap[subId].total += 1;
    });

    const summary = Object.values(summaryMap).map(s => {
      const pct = calculatePercentage(s.counts, policies);
      return {
        _id: s._id,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        present: s.counts['Present'] || 0,
        late: s.counts['Late'] || 0,
        absent: s.counts['Absent'] || 0,
        onDuty: (s.counts['On-Duty'] || 0) + (s.counts['On Duty'] || 0),
        medicalLeave: s.counts['Medical Leave'] || 0,
        casualLeave: s.counts['Casual Leave'] || 0,
        total: s.total,
        attendancePercent: pct
      };
    });

    res.json({ summary });
  } catch (error) {
    console.error('getFacultySubjectSummary error:', error);
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
    const { timetableId, date } = req.body;
    const Timetable = require('../models/Timetable');
    const timetable = await Timetable.findOne({ _id: timetableId, faculty: req.user.id });
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable entry not found or not assigned to you.' });
    }
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let existing = await Session.findOne({ 
      timetable: timetableId, 
      date: { $gte: startOfDay, $lte: endOfDay } 
    });
    if (existing) {
      existing.isActive = true;
      existing.locked = false;
      await existing.save();
      return res.json({ message: 'Session unlocked.', session: existing });
    }
    
    const { v4: uuidv4 } = require('uuid');
    const qrToken = uuidv4();
    const expiresAt = new Date(targetDate.getTime() + 15 * 60 * 1000);
    
    const session = new Session({
      timetable: timetableId,
      subject: timetable.subject,
      faculty: req.user.id,
      date: targetDate,
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

exports.startCustomSession = async (req, res) => {
  try {
    const { subject, department, year, semester, section, date, period } = req.body;
    
    if (!subject || !department || !year || !semester || !section || !period) {
      return res.status(400).json({ message: 'All fields (subject, department, year, semester, section, period) are required.' });
    }
    
    const now = new Date();
    const sessionDate = date ? new Date(date) : now;
    
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let existing = await Session.findOne({
      faculty: req.user.id,
      subject,
      department,
      year,
      semester,
      section,
      period,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const { v4: uuidv4 } = require('uuid');
    const qrToken = uuidv4();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    
    if (existing) {
      existing.isActive = true;
      existing.locked = false;
      existing.expiresAt = expiresAt;
      existing.qrToken = qrToken; // generate fresh QR token on restart
      await existing.save();
      return res.json({ message: 'Custom session unlocked/restarted.', session: existing });
    }
    
    const session = new Session({
      subject,
      faculty: req.user.id,
      date: sessionDate,
      department,
      year,
      semester,
      section,
      period,
      qrToken,
      expiresAt
    });
    await session.save();
    res.status(201).json({ message: 'Custom session created successfully.', session });
  } catch (error) {
    console.error('startCustomSession error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// Helper to compute pending attendance list for a faculty
const computePendingList = async (facultyId) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[now.getDay()];

  // 1. Get today's scheduled timetable slots
  const todayTimetable = await Timetable.find({
    faculty: facultyId,
    dayOfWeek: todayDayName,
    isActive: { $ne: false }
  }).populate('subject').lean();

  // 2. Get today's conducted sessions
  const todaySessions = await Session.find({
    faculty: facultyId,
    date: { $gte: todayStart, $lte: todayEnd }
  }).populate('subject').lean();

  // 3. Overall pending sessions from previous days (not locked)
  const overallPendingSessions = await Session.find({
    faculty: facultyId,
    locked: false
  }).populate('subject').lean();

  // 4. Today's passed timetable slots with no session (only after period end time is completed)
  const todayPassedNoSession = todayTimetable.filter(slot => {
    const session = todaySessions.find(s => 
      (s.timetable && s.timetable.toString() === slot._id.toString()) ||
      (s.period === slot.period && s.subject?._id?.toString() === slot.subject?._id?.toString())
    );
    if (session) return false;
    
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, 0, 0);
    return now > slotEnd;
  });

  // 5. Previous days' missed timetable slots (no session created at all)
  const pastWorkingDays = await AcademicCalendar.find({
    type: 'Working Day',
    date: { $lt: todayStart }
  }).select('date').lean();

  const pastSessions = await Session.find({
    faculty: facultyId,
    date: { $lt: todayStart }
  }).select('date period timetable subject').lean();

  const hasPastSessionKeys = new Set();
  pastSessions.forEach(s => {
    const dateStr = new Date(s.date).toDateString();
    if (s.timetable) {
      hasPastSessionKeys.add(`${dateStr}_${s.timetable.toString()}`);
    } else {
      hasPastSessionKeys.add(`${dateStr}_${s.period}_${s.subject?.toString()}`);
    }
  });

  const facultyTimetable = await Timetable.find({
    faculty: facultyId,
    isActive: { $ne: false }
  }).populate('subject').lean();

  const slotsByDay = {};
  facultyTimetable.forEach(slot => {
    const day = slot.dayOfWeek;
    if (!slotsByDay[day]) slotsByDay[day] = [];
    slotsByDay[day].push(slot);
  });

  const pastMissedSlots = [];
  for (const wDay of pastWorkingDays) {
    const wDate = new Date(wDay.date);
    const dayName = daysOfWeek[wDate.getDay()];
    const slots = slotsByDay[dayName] || [];

    for (const slot of slots) {
      const dateStr = wDate.toDateString();
      const ttKey = `${dateStr}_${slot._id.toString()}`;
      const altKey = `${dateStr}_${slot.period}_${slot.subject?._id?.toString() || slot.subject?.toString()}`;

      if (!hasPastSessionKeys.has(ttKey) && !hasPastSessionKeys.has(altKey)) {
        const dept = slot.department || 'CSE';
        const yr = slot.year || '1';
        const sem = slot.semester || '1';
        const sec = slot.section || 'A';
        const className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;

        pastMissedSlots.push({
          _id: null,
          date: wDate,
          period: slot.period,
          subjectCode: slot.subject?.code || 'N/A',
          subjectName: slot.subject?.name || 'N/A',
          class: className,
          type: 'timetable',
          timetableId: slot._id
        });
      }
    }
  }

  pastMissedSlots.sort((a, b) => b.date - a.date);

  const pendingList = [];

  // Add overall pending sessions
  for (const s of overallPendingSessions) {
    let className = 'General';
    let period = s.period || 'H1';
    let endTime = null;
    if (s.timetable) {
      const tt = await Timetable.findById(s.timetable).lean();
      if (tt) {
        const dept = tt.department || 'CSE';
        const yr = tt.year || '1';
        const sem = tt.semester || '1';
        const sec = tt.section || 'A';
        className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;
        period = tt.period || period;
        endTime = tt.endTime;
      }
    } else if (s.department && s.year && s.semester && s.section) {
      className = `${s.department} Y${s.year} Sem ${s.semester} Sec ${s.section}`;
    } else if (s.subject) {
      className = `${s.subject.department || 'CSE'} Class`;
    }

    // Filter out today's unlocked sessions if the class timing has not ended yet
    const sDate = new Date(s.date);
    const isToday = sDate.getFullYear() === now.getFullYear() &&
                    sDate.getMonth() === now.getMonth() &&
                    sDate.getDate() === now.getDate();

    if (isToday) {
      if (!endTime) {
        const matchingSlot = todayTimetable.find(t => t.period === period);
        if (matchingSlot) {
          endTime = matchingSlot.endTime;
        } else {
          const generalSlot = await Timetable.findOne({ faculty: facultyId, period }).lean();
          if (generalSlot) {
            endTime = generalSlot.endTime;
          }
        }
      }

      if (endTime) {
        const [endHour, endMin] = endTime.split(':').map(Number);
        const sessionEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, 0, 0);
        if (now <= sessionEnd) {
          continue; // keep as it is, do not show as pending attendance yet
        }
      }
    }

    pendingList.push({
      _id: s._id,
      date: s.date,
      period: period,
      subjectCode: s.subject?.code || 'N/A',
      subjectName: s.subject?.name || 'N/A',
      class: className,
      type: 'session',
      timetableId: s.timetable
    });
  }

  // Add past missed slots with no session
  pastMissedSlots.forEach(slot => {
    pendingList.push(slot);
  });

  // Add today's passed slots with no session
  todayPassedNoSession.forEach(slot => {
    const dept = slot.department || 'CSE';
    const yr = slot.year || '1';
    const sem = slot.semester || '1';
    const sec = slot.section || 'A';
    const className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;

    // Avoid duplicates
    const exists = pendingList.some(p => p.timetableId && p.timetableId.toString() === slot._id.toString() && new Date(p.date).toDateString() === todayStart.toDateString());
    if (!exists) {
      pendingList.push({
        _id: null,
        date: todayStart,
        period: slot.period,
        subjectCode: slot.subject?.code || 'N/A',
        subjectName: slot.subject?.name || 'N/A',
        class: className,
        type: 'timetable',
        timetableId: slot._id
      });
    }
  });

  return pendingList;
};

exports.computePendingList = computePendingList;

exports.getFacultyDashboardSummary = async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Load workloads assigned to this faculty and compute workload stats
    const Workload = require('../models/Workload');
    const workloads = await Workload.find({ faculty: facultyId }).lean();

    let totalAssignedHours = 0;
    let totalCompletedHours = 0;
    const workloadsData = [];

    for (const wl of workloads) {
      totalAssignedHours += wl.assignedHours || 0;

      // Find all timetable slots matching this workload
      const timetableSlots = await Timetable.find({
        faculty: facultyId,
        subject: wl.subject,
        department: wl.department,
        year: wl.year,
        semester: wl.semester,
        section: wl.section
      }).select('_id');
      
      const ttIds = timetableSlots.map(t => t._id);

      // Count locked sessions matching this subject and class
      const countCompleted = await Session.countDocuments({
        faculty: facultyId,
        subject: wl.subject,
        $or: [
          { timetable: { $in: ttIds } },
          {
            department: wl.department,
            year: wl.year,
            semester: wl.semester,
            section: wl.section
          }
        ],
        locked: true
      });
      
      totalCompletedHours += countCompleted;

      const subjectDoc = await Subject.findById(wl.subject).lean();

      workloadsData.push({
        ...wl,
        subject: subjectDoc,
        completedHours: countCompleted,
        pendingHours: Math.max(0, (wl.assignedHours || 0) - countCompleted),
        completionRate: wl.assignedHours > 0 ? Math.round((countCompleted / wl.assignedHours) * 100) : 0
      });
    }

    const totalPendingHours = Math.max(0, totalAssignedHours - totalCompletedHours);
    const attendanceTaken = totalCompletedHours;
    const completionPercentage = totalAssignedHours > 0 
      ? Math.round((totalCompletedHours / totalAssignedHours) * 100) 
      : 0;

    const now = new Date();
    // Start and end of today in local system time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = daysOfWeek[now.getDay()];

    // 1. Get today's scheduled timetable slots
    const todayTimetable = await Timetable.find({
      faculty: facultyId,
      dayOfWeek: todayDayName,
      isActive: { $ne: false }
    }).populate('subject').lean();

    // 2. Get today's conducted sessions
    const todaySessions = await Session.find({
      faculty: facultyId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).populate('subject').lean();

    // 3. Compute today's schedule with status
    const todaySchedule = todayTimetable.map(slot => {
      const session = todaySessions.find(s => 
        (s.timetable && s.timetable.toString() === slot._id.toString()) || 
        (s.period === slot.period && s.subject?._id?.toString() === slot.subject?._id?.toString())
      );
      
      let status = 'Upcoming';
      let sessionId = null;
      let locked = false;

      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, 0, 0);

      if (session) {
        sessionId = session._id;
        locked = session.locked;
        if (session.locked) {
          status = 'Submitted';
        } else {
          // Created but not locked: show as Pending only after period time is completed
          status = now > slotEnd ? 'Pending' : 'Upcoming';
        }
      } else {
        // No session created: show as Pending only after period time is completed
        status = now > slotEnd ? 'Pending' : 'Upcoming';
      }

      const dept = slot.department || 'CSE';
      const yr = slot.year || '1';
      const sem = slot.semester || '1';
      const sec = slot.section || 'A';
      const className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;

      return {
        timetableId: slot._id,
        period: slot.period,
        subjectCode: slot.subject?.code || 'N/A',
        subjectName: slot.subject?.name || 'N/A',
        class: className,
        startTime: slot.startTime,
        endTime: slot.endTime,
        classroom: slot.classroom,
        status,
        sessionId,
        locked
      };
    });

    // Sort today's schedule by start time
    todaySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Stats calculations
    const todayAssigned = todaySchedule.length;
    const attendanceSubmitted = todaySchedule.filter(s => s.status === 'Submitted').length;
    const upcomingClasses = todaySchedule.filter(s => s.status === 'Upcoming').length;

    // 5. Get pending list using the helper function
    const pendingList = await computePendingList(facultyId);

    // 6. Get historical conducted sessions (locked or conducted sessions history)
    const historySessions = await Session.find({ faculty: facultyId })
      .populate('subject')
      .populate('timetable')
      .sort({ date: -1 })
      .lean();

    const sessionIds = historySessions.map(s => s._id);
    const attendanceRecords = await Attendance.find({ session: { $in: sessionIds } }).lean();

    const sessionsList = historySessions.map(s => {
      const sRecs = attendanceRecords.filter(r => r.session.toString() === s._id.toString());
      const total = sRecs.length;
      const present = sRecs.filter(r => ['Present', 'Late', 'On-Duty'].includes(r.status)).length;
      
      const dept = s.timetable?.department || s.subject?.department || 'General';
      const yr = s.timetable?.year || '1';
      const sem = s.timetable?.semester || '1';
      const sec = s.timetable?.section || 'A';
      const className = `${dept} Y${yr} Sem ${sem} Sec ${sec}`;

      return {
        _id: s._id,
        date: s.date,
        period: s.period,
        subjectCode: s.subject?.code || 'N/A',
        subjectName: s.subject?.name || 'N/A',
        class: className,
        locked: s.locked,
        submissionTime: s.locked ? s.updatedAt : null,
        totalStudents: total,
        attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0
      };
    });

    const pendingAttendanceHours = pendingList.length;
    const submittedAttendanceHours = totalCompletedHours;
    const conductedHours = submittedAttendanceHours + pendingAttendanceHours;
    
    const overallWorkCompletionPercentage = conductedHours > 0
      ? Math.round((submittedAttendanceHours / conductedHours) * 100)
      : 0;

    const overallPct = conductedHours > 0
      ? Math.round((submittedAttendanceHours / conductedHours) * 100)
      : 0;

    const todayRemainingClasses = todaySchedule.filter(s => s.status === 'Upcoming' || s.status === 'Pending').length;

    res.json({
      success: true,
      stats: {
        todayAssigned,
        attendanceSubmitted,
        pendingAttendance: pendingList.length,
        upcomingClasses,
        totalAssignedHours,
        totalCompletedHours,
        totalPendingHours,
        attendanceTaken,
        completionPercentage,
        assignedHours: totalAssignedHours,
        conductedHours,
        submittedAttendanceHours,
        pendingAttendanceHours,
        overallWorkCompletionPercentage: overallPct,
        todayRemainingClasses
      },
      todaySchedule,
      pendingList,
      sessionsList,
      workloads: workloadsData
    });
  } catch (error) {
    console.error('getFacultyDashboardSummary error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

