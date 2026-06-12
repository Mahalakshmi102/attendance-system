const express = require('express');
const router = express.Router();
const {
  getActiveSession,
  updateFacultyLocation,
  markAttendance,
  getSessionAttendance,
  manualUpdateAttendance,
  lockSession,
  getMyAttendance,
  getMyAttendanceByDateRange,
  getFacultyAttendanceByDateRange,
  getFacultySubjectSummary,
  downloadFacultyReportCsv,
  startSession
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// Apply protect middleware to all routes in this file
router.use(protect);

router.get('/active', getActiveSession);
router.post('/location', updateFacultyLocation);
router.post('/mark', markAttendance); // For student scans
router.get('/session/:sessionId', getSessionAttendance);
router.post('/manual', manualUpdateAttendance);
router.post('/lock', lockSession);
router.get('/my-attendance', getMyAttendance);
router.get('/my-date-range', getMyAttendanceByDateRange);
router.get('/faculty-date-range', getFacultyAttendanceByDateRange);
router.get('/faculty-summary', getFacultySubjectSummary);
router.get('/faculty-download', downloadFacultyReportCsv);
router.post('/start', startSession);

module.exports = router;
