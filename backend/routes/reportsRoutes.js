const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Apply protection and check role authorization for Staff
router.use(protect);
router.use(authorize('Admin', 'Principal', 'CoE', 'HoD'));

router.get('/audit', reportsController.exportAuditReport);
router.get('/attendance-summary', reportsController.exportAttendanceSummary);
router.get('/faculty-activity', reportsController.exportFacultyActivity);
router.get('/student-report', reportsController.exportStudentReport);
router.get('/dept-performance', reportsController.exportDeptPerformance);

module.exports = router;
