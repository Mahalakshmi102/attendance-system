const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { 
  getSubjects, addSubject, updateSubject, deleteSubject,
  getUsers, addUser, updateUser, deleteUser,
  getTimetable, addTimetable, updateTimetable, deleteTimetable,
  getCalendar, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  getAnalyticsOverview,
  getStudentsAcademic,
  getStudentAttendanceDetails,
  handleBulkUpload,
  getAttendanceMonitoringData,
  saveBulkAttendance,
  updateAttendanceRecord,
  generateReport,
  createNotification,
  getSystemSettings,
  updateSystemSettings,
  getAdvisorStats,
  getAdvisorRecords,
  createAdvisorRecord,
  updateAdvisorRecord,
  deleteAdvisorRecord,
  createAdvisorCommunication,
  getAdvisorCommunications,
  getAdvisorAuditLogs,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getFacultyAttendanceActivities
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Apply protection to all routes in this file
router.use(protect);

// Role-based Access Control Middlewares
const authCore = authorize('Admin', 'Principal', 'CoE', 'HoD');
const authAllStaff = authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty');

// Subjects
router.route('/subjects')
  .get(authAllStaff, getSubjects)
  .post(authCore, addSubject);
router.route('/subjects/:id')
  .put(authCore, updateSubject)
  .delete(authCore, deleteSubject);

// Users
router.get('/students/academic', authAllStaff, getStudentsAcademic);
router.get('/students/:id/attendance-details', authAllStaff, getStudentAttendanceDetails);
router.route('/users')
  .get(authAllStaff, getUsers)
  .post(authCore, addUser);
router.route('/users/:id')
  .put(authAllStaff, updateUser)
  .delete(authCore, deleteUser);

// Timetable
router.route('/timetable')
  .get(authAllStaff, getTimetable)
  .post(authCore, addTimetable);
router.route('/timetable/:id')
  .put(authCore, updateTimetable)
  .delete(authCore, deleteTimetable);

// Academic Calendar
router.route('/calendar')
  .get(authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student'), getCalendar)
  .post(authCore, addCalendarEvent);
router.route('/calendar/:id')
  .put(authCore, updateCalendarEvent)
  .delete(authCore, deleteCalendarEvent);

// Bulk Upload (Excel/CSV)
router.post('/upload/:type', authCore, upload.single('file'), handleBulkUpload);

// Analytics & Submissions
router.get('/analytics/overview', authCore, getAnalyticsOverview);
router.get('/analytics/attendance-monitoring', authCore, getAttendanceMonitoringData);
router.post('/attendance/bulk', authCore, saveBulkAttendance);
router.put('/attendance/:id', authCore, updateAttendanceRecord);

// Reports & Notifications
router.get('/reports/generate', authCore, generateReport);
router.post('/notifications', authCore, createNotification);
router.get('/notifications', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student'), getNotifications);
router.put('/notifications/read-all', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student'), markAllNotificationsRead);
router.put('/notifications/:id/read', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student'), markNotificationRead);
router.get('/faculty/:id/attendance-activities', authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty'), getFacultyAttendanceActivities);

// System Settings (Admin, Principal & CoE)
router.route('/settings')
  .get(authorize('Admin', 'Principal', 'CoE'), getSystemSettings)
  .post(authorize('Admin', 'Principal', 'CoE'), updateSystemSettings);

// --- Class Advisor Dashboard Endpoints ---
router.get('/advisor/stats', authAllStaff, getAdvisorStats);

router.route('/advisor/records')
  .get(authAllStaff, getAdvisorRecords)
  .post(authAllStaff, createAdvisorRecord);

router.route('/advisor/records/:id')
  .put(authAllStaff, updateAdvisorRecord)
  .delete(authAllStaff, deleteAdvisorRecord);

router.route('/advisor/communications')
  .get(authorize('Admin', 'Principal', 'CoE', 'HoD', 'Faculty', 'Student'), getAdvisorCommunications)
  .post(authAllStaff, createAdvisorCommunication);

router.get('/advisor/audit-logs', authAllStaff, getAdvisorAuditLogs);

module.exports = router;
