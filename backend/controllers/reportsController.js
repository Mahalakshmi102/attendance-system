const xlsx = require('xlsx');
const User = require('../models/User');
const Log = require('../models/Log');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Session = require('../models/Session');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// Helper to safe-stringify objects for Excel cells
const formatValueForExcel = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
};

// 1. Export Audit Report
exports.exportAuditReport = async (req, res) => {
  try {
    const query = {};

    // HoD department filtering security
    if (req.user.role === 'HoD') {
      query.$or = [
        { performedByDept: req.user.department },
        { targetDept: req.user.department }
      ];
    } else if (req.query.department) {
      query.$or = [
        { performedByDept: req.query.department },
        { targetDept: req.query.department }
      ];
    }

    if (req.query.role) query.performedByRole = req.query.role;
    if (req.query.targetModel) query.targetModel = req.query.targetModel;
    if (req.query.action) query.action = req.query.action;
    if (req.query.semester) query.targetSemester = req.query.semester;
    if (req.query.section) query.targetSection = req.query.section;

    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) query.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const conditions = [
        { action: searchRegex },
        { performedByName: searchRegex },
        { reason: searchRegex },
        { details: searchRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: conditions }];
        delete query.$or;
      } else {
        query.$or = conditions;
      }
    }

    const logs = await Log.find(query).sort({ timestamp: -1 }).lean();

    const data = logs.map(l => ({
      'Date & Time': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
      'Action': l.action,
      'Performed By': l.performedByName || 'Unknown',
      'Role': l.performedByRole || 'Staff',
      'Department': l.performedByDept || 'General',
      'Target Module': l.targetModel || '-',
      'Old Value': formatValueForExcel(l.oldValue),
      'New Value': formatValueForExcel(l.newValue),
      'Reason for Change': l.reason || 'Direct update',
      'Scope Dept': l.targetDept || 'General',
      'Scope Semester': l.targetSemester || '-',
      'Scope Section': l.targetSection || '-'
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'System Audit Log');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="system_audit_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting audit report', error: error.message });
  }
};

// 2. Export Attendance Report (Class & Student Roster Attendance Percentages)
exports.exportAttendanceSummary = async (req, res) => {
  try {
    const studentQuery = { role: 'Student' };
    if (req.user.role === 'HoD') {
      studentQuery.department = req.user.department;
    } else if (req.query.department) {
      studentQuery.department = req.query.department;
    }

    if (req.query.semester) studentQuery.semester = req.query.semester;
    if (req.query.section) studentQuery.section = req.query.section;
    if (req.query.year) studentQuery.year = req.query.year;

    const students = await User.find(studentQuery).select('name email registerNumber rollNumber department year semester section').lean();
    const studentIds = students.map(s => s._id);

    const attendanceRecords = await Attendance.find({ student: { $in: studentIds } }).lean();

    const summaryData = students.map(s => {
      const records = attendanceRecords.filter(r => r.student.toString() === s._id.toString());
      const total = records.length;
      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const onDuty = records.filter(r => r.status === 'On-Duty').length;
      const attended = present + late + onDuty;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

      return {
        'Register Number': s.registerNumber || '-',
        'Roll Number': s.rollNumber || '-',
        'Name': s.name,
        'Department': s.department,
        'Year': s.year || '-',
        'Semester': s.semester || '-',
        'Section': s.section || 'A',
        'Total Sessions': total,
        'Present Count': present,
        'Late Count': late,
        'OD Count': onDuty,
        'Absent Count': absent,
        'Attendance Percentage': `${percentage}%`,
        'Status': percentage >= 75 ? 'Compliant' : 'Defaulter'
      };
    });

    const defaultersData = summaryData.filter(item => parseInt(item['Attendance Percentage']) < 75);

    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    const wsDefaulters = xlsx.utils.json_to_sheet(defaultersData);
    const wb = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(wb, wsSummary, 'Attendance Summary');
    xlsx.utils.book_append_sheet(wb, wsDefaulters, 'Critical Defaulters (<75%)');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_summary_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting attendance summary', error: error.message });
  }
};

// 3. Export Faculty Activity Report
exports.exportFacultyActivity = async (req, res) => {
  try {
    const facultyQuery = { role: 'Faculty' };
    if (req.user.role === 'HoD') {
      facultyQuery.department = req.user.department;
    } else if (req.query.department) {
      facultyQuery.department = req.query.department;
    }

    const facultyList = await User.find(facultyQuery).select('name email department employeeId designation qualification').lean();
    const facultyIds = facultyList.map(f => f._id);

    const [timetables, sessions] = await Promise.all([
      Timetable.find({ faculty: { $in: facultyIds } }).lean(),
      Session.find({ faculty: { $in: facultyIds } }).lean()
    ]);

    const activityData = facultyList.map(f => {
      const fTimetables = timetables.filter(t => t.faculty.toString() === f._id.toString());
      const fSessions = sessions.filter(s => s.faculty.toString() === f._id.toString());
      const totalSessions = fSessions.length;
      const lockedSessions = fSessions.filter(s => s.locked).length;
      const activeSessions = fSessions.filter(s => s.isActive && !s.locked).length;
      
      const compliance = totalSessions > 0 ? Math.round((lockedSessions / totalSessions) * 100) : 100;

      return {
        'Employee ID': f.employeeId || '-',
        'Name': f.name,
        'Designation': f.designation || 'Assistant Professor',
        'Department': f.department,
        'Assigned Slots (Timetable)': fTimetables.length,
        'Total Sessions Created': totalSessions,
        'Attendance Locked Sessions': lockedSessions,
        'Pending/Active Sessions': activeSessions,
        'Marking Compliance Rate': `${compliance}%`
      };
    });

    const ws = xlsx.utils.json_to_sheet(activityData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Faculty Activity & Compliance');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="faculty_activity_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting faculty activity', error: error.message });
  }
};

// 4. Export Student Report
exports.exportStudentReport = async (req, res) => {
  try {
    const studentQuery = { role: 'Student' };
    if (req.user.role === 'HoD') {
      studentQuery.department = req.user.department;
    } else if (req.query.department) {
      studentQuery.department = req.query.department;
    }

    if (req.query.semester) studentQuery.semester = req.query.semester;
    if (req.query.section) studentQuery.section = req.query.section;
    if (req.query.year) studentQuery.year = req.query.year;

    const students = await User.find(studentQuery).lean();

    const studentData = students.map(s => ({
      'Register Number': s.registerNumber || '-',
      'Roll Number': s.rollNumber || '-',
      'Name': s.name,
      'Email': s.email,
      'Department': s.department,
      'Year': s.year || '-',
      'Semester': s.semester || '-',
      'Section': s.section || 'A',
      'Gender': s.gender || '-',
      'DOB': s.dob ? new Date(s.dob).toLocaleDateString() : '-',
      'Mobile': s.mobile || '-',
      'Parent Name': s.parentDetails?.name || '-',
      'Parent Contact': s.parentDetails?.mobile || '-',
      'Status': s.isActive ? 'Active' : 'Suspended'
    }));

    const ws = xlsx.utils.json_to_sheet(studentData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Student Directory');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="student_directory.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting student report', error: error.message });
  }
};

// 5. Export Department Performance KPI Report
exports.exportDeptPerformance = async (req, res) => {
  try {
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'];
    
    const performanceData = await Promise.all(departments.map(async (dept) => {
      const [totalStudents, totalFaculty, timetableCount, sessionsList] = await Promise.all([
        User.countDocuments({ role: 'Student', department: dept }),
        User.countDocuments({ role: 'Faculty', department: dept }),
        Timetable.countDocuments({ department: dept }),
        Session.find().populate({
          path: 'subject',
          match: { department: dept }
        }).lean()
      ]);

      // Filter sessions belonging to department subjects
      const deptSessions = sessionsList.filter(s => s.subject);
      const totalSessions = deptSessions.length;
      const lockedSessions = deptSessions.filter(s => s.locked).length;
      const compliance = totalSessions > 0 ? Math.round((lockedSessions / totalSessions) * 100) : 100;

      // Calculate Average Attendance
      const deptStudents = await User.find({ role: 'Student', department: dept }).select('_id');
      const studentIds = deptStudents.map(s => s._id);
      
      const attendanceSummary = await Attendance.aggregate([
        { $match: { student: { $in: studentIds } } },
        {
          $group: {
            _id: null,
            attended: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late', 'On-Duty']] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ]);

      let avgAttendance = 100;
      if (attendanceSummary.length > 0 && attendanceSummary[0].total > 0) {
        avgAttendance = Math.round((attendanceSummary[0].attended / attendanceSummary[0].total) * 100);
      }

      let rating = 'Excellent';
      if (avgAttendance < 65) rating = 'Critical';
      else if (avgAttendance < 75) rating = 'Needs Improvement';
      else if (avgAttendance < 85) rating = 'Good';

      return {
        'Department': dept,
        'Total Students Roster': totalStudents,
        'Total Faculty Strength': totalFaculty,
        'Timetable Slots Configured': timetableCount,
        'Attendance Sessions Recorded': totalSessions,
        'Compliant Submissions': lockedSessions,
        'Faculty Compliance Rate': `${compliance}%`,
        'Average Student Attendance': `${avgAttendance}%`,
        'Academic Performance Rating': rating
      };
    }));

    const ws = xlsx.utils.json_to_sheet(performanceData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Department KPIs Performance');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="department_performance.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buf);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting department performance', error: error.message });
  }
};
