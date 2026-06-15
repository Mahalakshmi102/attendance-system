const Request = require('../models/Request');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createLog } = require('../utils/logger');

// Helper to notify all Admin users of important changes made by HOD
const notifyAdmins = async (message, type = 'Info', link = '') => {
  try {
    const admins = await User.find({ role: 'Admin' }).select('_id');
    const notifications = admins.map(admin => ({
      user: admin._id,
      message,
      type,
      link
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

exports.submitRequest = async (req, res) => {
  try {
    const { targetModel, targetRecord, reason, newValue } = req.body;

    if (!['Attendance', 'Mark', 'Leave'].includes(targetModel)) {
      return res.status(400).json({ success: false, message: 'Invalid target model.' });
    }

    const reqUserId = req.user._id || req.user.id;

    // Fetch the record to get oldValue
    let record;
    let oldValue;
    let finalTargetRecord = targetModel === 'Leave' ? (targetRecord || reqUserId) : targetRecord;

    if (targetModel === 'Attendance') {
      const mongoose = require('mongoose');
      let isIdValid = mongoose.Types.ObjectId.isValid(finalTargetRecord);
      if (isIdValid) {
        record = await Attendance.findById(finalTargetRecord);
      }
      
      if (!record) {
        // Try looking up by studentId and sessionId
        const { studentId, sessionId } = req.body;
        if (studentId && sessionId) {
          record = await Attendance.findOne({ session: sessionId, student: studentId });
          if (!record) {
            const Session = require('../models/Session');
            const targetSession = await Session.findById(sessionId);
            if (targetSession) {
              const studentDetails = await User.findById(studentId).select('department year semester section').lean();
              record = new Attendance({
                session: sessionId,
                student: studentId,
                subject: targetSession.subject,
                date: targetSession.date,
                period: targetSession.period || 'H1',
                status: 'Absent',
                markedBy: 'Faculty',
                entryType: 'Manual',
                locked: true,
                faculty: targetSession.faculty,
                department: studentDetails?.department || targetSession.department,
                year: studentDetails?.year || targetSession.year,
                semester: studentDetails?.semester || targetSession.semester,
                section: studentDetails?.section || targetSession.section
              });
              await record.save();
            }
          }
          if (record) {
            finalTargetRecord = record._id;
          }
        }
      }

      if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found.' });
      oldValue = record.status;
    } else if (targetModel === 'Mark') {
      record = await Mark.findById(finalTargetRecord);
      if (!record) return res.status(404).json({ success: false, message: 'Mark record not found.' });
      oldValue = { internal: record.internal, external: record.external, total: record.total };
    } else if (targetModel === 'Leave') {
      oldValue = 'Pending';
    }

    const newRequest = await Request.create({
      requestedBy: reqUserId,
      targetModel,
      targetRecord: finalTargetRecord,
      reason,
      oldValue,
      newValue,
    });

    await createLog('Submitted Correction Request', req.user, 'Request', newRequest._id, {
      oldValue,
      newValue,
      reason,
      targetDept: req.user.department || 'General',
      details: `Submitted correction request for ${targetModel}`
    });

    res.status(201).json({ success: true, message: 'Request submitted successfully.', request: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const query = {};
    
    // Non-admin roles (HOD, Faculty) should not see PasswordReset requests
    if (['HoD', 'Faculty', 'Class Advisor'].includes(req.user.role)) {
      query.targetModel = { $ne: 'PasswordReset' };
    }

    if (req.user.role === 'HoD') {
      // HODs only see requests for students in their department who DO NOT have a class advisor, plus department faculty
      const advisors = await User.find({
        role: 'Faculty',
        'classAdvisorDetails.isClassAdvisor': true,
        department: req.user.department,
        isActive: true
      });
      
      const advisedClasses = advisors.map(adv => ({
        year: adv.classAdvisorDetails.year,
        semester: adv.classAdvisorDetails.semester,
        section: adv.classAdvisorDetails.section
      }));

      const allDeptStudents = await User.find({
        role: 'Student',
        department: req.user.department
      });

      const studentsWithoutAdvisor = allDeptStudents.filter(student => {
        const hasAdvisor = advisedClasses.some(c => 
          String(student.year) === String(c.year) &&
          String(student.semester) === String(c.semester) &&
          student.section === c.section
        );
        return !hasAdvisor;
      });

      const studentIdsWithoutAdvisor = studentsWithoutAdvisor.map(s => s._id);

      const deptFaculty = await User.find({
        role: 'Faculty',
        department: req.user.department
      });
      const facultyIds = deptFaculty.map(f => f._id);

      query.requestedBy = { $in: [...studentIdsWithoutAdvisor, ...facultyIds] };
    } else if (req.user.role === 'Faculty' || req.user.role === 'Class Advisor') {
      const isClassAdvisor = (req.user.classAdvisorDetails && req.user.classAdvisorDetails.isClassAdvisor) || req.user.role === 'Class Advisor';
      if (isClassAdvisor) {
        const adv = req.user.classAdvisorDetails;
        const advisedStudents = await User.find({
          role: 'Student',
          department: adv.department,
          year: adv.year,
          semester: adv.semester,
          section: adv.section
        }).select('_id');
        const advisedIds = advisedStudents.map(s => s._id);
        query.$or = [
          { requestedBy: req.user._id || req.user.id },
          { requestedBy: { $in: advisedIds } }
        ];
      } else {
        query.requestedBy = req.user._id || req.user.id;
      }
    } else if (req.user.role === 'Student') {
      query.requestedBy = req.user._id || req.user.id;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const requests = await Request.find(query)
      .populate('requestedBy', 'name email role department year semester section')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

exports.reviewRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewRemarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
    }

    const request = await Request.findById(requestId).populate('requestedBy');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Boundary check for HOD
    if (req.user.role === 'HoD') {
      if (request.requestedBy.department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'Access denied: Request is outside your department.' });
      }

      // HOD cannot approve student request if a class advisor is present for that student's class
      if (request.requestedBy.role === 'Student') {
        const student = request.requestedBy;
        const advisor = await User.findOne({
          role: 'Faculty',
          'classAdvisorDetails.isClassAdvisor': true,
          'classAdvisorDetails.department': student.department,
          'classAdvisorDetails.year': student.year,
          'classAdvisorDetails.semester': student.semester,
          'classAdvisorDetails.section': student.section,
          isActive: true
        });
        if (advisor) {
          return res.status(403).json({ success: false, message: 'Access denied: This request must be reviewed by the Class Advisor.' });
        }
      }
    }

    // Boundary check for Class Advisor (Faculty)
    if (req.user.role === 'Faculty' || req.user.role === 'Class Advisor') {
      const isClassAdvisor = (req.user.classAdvisorDetails && req.user.classAdvisorDetails.isClassAdvisor) || req.user.role === 'Class Advisor';
      if (!isClassAdvisor) {
        return res.status(403).json({ success: false, message: 'Access denied: Only Class Advisors are allowed to review requests.' });
      }
      const adv = req.user.classAdvisorDetails;
      const isAdvisedStudent = 
        request.requestedBy.role === 'Student' &&
        request.requestedBy.department === adv.department &&
        String(request.requestedBy.year) === String(adv.year) &&
        String(request.requestedBy.semester) === String(adv.semester) &&
        request.requestedBy.section === adv.section;
        
      if (!isAdvisedStudent) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only review requests for students in your advised class.' });
      }
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request is already processed.' });
    }

    request.status = status;
    request.reviewedBy = req.user._id || req.user.id;
    request.reviewRemarks = reviewRemarks;

    // Apply changes if approved
    if (status === 'Approved') {
      if (request.targetModel === 'Attendance') {
        await Attendance.findByIdAndUpdate(request.targetRecord, { status: request.newValue, updatedBy: req.user._id || req.user.id, remarks: 'Updated via approved request' });
      } else if (request.targetModel === 'Mark') {
        const { internal, external } = request.newValue;
        const total = (Number(internal) || 0) + (Number(external) || 0);
        await Mark.findByIdAndUpdate(request.targetRecord, { internal, external, total, updatedBy: req.user._id || req.user.id, remarks: 'Updated via approved request' });
      } else if (request.targetModel === 'Leave') {
        const studentId = request.requestedBy._id || request.requestedBy;
        const student = await User.findById(studentId);
        if (student) {
          const startDate = new Date(request.newValue.startDate);
          const endDate = new Date(request.newValue.endDate);
          const leaveType = request.newValue.leaveType || 'General';

          let attendanceStatus = 'On-Duty';
          if (leaveType === 'Medical Leave' || leaveType === 'ML') {
            attendanceStatus = 'Medical Leave';
          } else if (leaveType === 'Casual Leave' || leaveType === 'CL') {
            attendanceStatus = 'Casual Leave';
          }

          // Fetch all timetable entries for this student's class
          const Timetable = require('../models/Timetable');
          const timetables = await Timetable.find({
            department: student.department,
            year: student.year,
            semester: student.semester,
            section: student.section
          });

          // Loop through each date in the range
          const currentDate = new Date(startDate);
          currentDate.setHours(0,0,0,0);
          const endLimitDate = new Date(endDate);
          endLimitDate.setHours(23,59,59,999);

          const Session = require('../models/Session');
          const AcademicCalendar = require('../models/AcademicCalendar');

          while (currentDate <= endLimitDate) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23,59,59,999);

            // Check if it's a holiday/non-working day
            const calendarEntry = await AcademicCalendar.findOne({
              date: { $gte: dayStart, $lte: dayEnd }
            });

            if (!calendarEntry || calendarEntry.type !== 'Holiday') {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayOfWeekName = days[currentDate.getDay()];

              // Find timetable entries for this day of the week
              const slotsForToday = timetables.filter(t => t.dayOfWeek === dayOfWeekName);

              for (const slot of slotsForToday) {
                // Find or create session for this timetable slot and date
                let session = await Session.findOne({
                  timetable: slot._id,
                  date: { $gte: dayStart, $lte: dayEnd }
                });

                if (!session) {
                  session = new Session({
                    timetable: slot._id,
                    subject: slot.subject,
                    faculty: slot.faculty,
                    date: new Date(currentDate),
                    period: slot.period,
                    locked: true,
                    isActive: false,
                    department: student.department,
                    year: student.year,
                    semester: student.semester,
                    section: student.section
                  });
                  await session.save();
                }

                // Create or update attendance record
                await Attendance.findOneAndUpdate(
                  {
                    session: session._id,
                    student: studentId
                  },
                  {
                    status: attendanceStatus,
                    updatedBy: req.user._id || req.user.id,
                    remarks: `Leave approved: ${leaveType}`,
                    subject: slot.subject,
                    date: new Date(currentDate),
                    faculty: slot.faculty,
                    department: student.department,
                    year: student.year,
                    semester: student.semester,
                    section: student.section,
                    entryType: 'Manual',
                    markedBy: 'Admin'
                  },
                  { upsert: true, new: true }
                );
              }
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      } else if (request.targetModel === 'PasswordReset') {
        const studentId = request.requestedBy._id || request.requestedBy;
        const targetUser = await User.findById(studentId);
        if (targetUser) {
          const targetDob = targetUser.dob;
          if (!targetDob) {
            return res.status(400).json({ success: false, message: 'User does not have a Date of Birth set in their profile.' });
          }
          const d = new Date(targetDob);
          if (isNaN(d.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid Date of Birth format.' });
          }
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const dobString = `${dd}${mm}${yyyy}`;

          const bcrypt = require('bcryptjs');
          const salt = await bcrypt.genSalt(10);
          targetUser.password = await bcrypt.hash(dobString, salt);
          targetUser.isFirstLogin = true;
          await targetUser.save();
        }
      }
    }

    await request.save();

    await createLog(`Request ${status}`, req.user, 'Request', request._id, {
      oldValue: request.oldValue,
      newValue: request.newValue,
      reason: reviewRemarks || `Correction request reviewed by ${req.user.role}`,
      targetDept: req.user.department || 'General',
      details: `Processed correction request: ${request.targetModel} update was ${status.toLowerCase()}`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) reviewed ${request.targetModel} request: ${status}`, 'Info');
    }

    res.status(200).json({ success: true, message: `Request ${status.toLowerCase()} successfully.`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};
