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
    const finalTargetRecord = targetModel === 'Leave' ? (targetRecord || reqUserId) : targetRecord;

    if (targetModel === 'Attendance') {
      record = await Attendance.findById(finalTargetRecord);
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
    if (req.user.role === 'HoD') {
      const deptUsers = await User.find({ department: req.user.department }).select('_id');
      const deptUserIds = deptUsers.map(u => u._id);
      query.requestedBy = { $in: deptUserIds };
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
    if (req.user.role === 'HoD' && request.requestedBy.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Request is outside your department.' });
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
        const startDate = new Date(request.newValue.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(request.newValue.endDate);
        endDate.setHours(23, 59, 59, 999);

        await Attendance.updateMany(
          {
            student: studentId,
            date: { $gte: startDate, $lte: endDate }
          },
          {
            status: 'On-Duty',
            updatedBy: req.user._id || req.user.id,
            remarks: `Leave approved: ${request.newValue.leaveType || 'General'}`
          }
        );
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
