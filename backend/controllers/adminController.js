const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const AcademicCalendar = require('../models/AcademicCalendar');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Mark = require('../models/Mark');
const Request = require('../models/Request');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const fs = require('fs');
const { createLog } = require('../utils/logger');
const Notification = require('../models/Notification');

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


// --- Subjects ---
exports.getSubjects = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HoD') {
      query.department = req.user.department;
    } else if (req.query.department) {
      query.department = req.query.department;
    }
    const subjects = await Subject.find(query);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.addSubject = async (req, res) => {
  try {
    const { name, code, credits, department, regulation, year, semester, subjectType, assignedFaculty, isActive } = req.body;
    let finalDept = department;
    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
    }
    const subject = new Subject({ name, code, credits, department: finalDept, regulation, year, semester, subjectType, assignedFaculty, isActive });
    await subject.save();

    // Audit Log
    await createLog('Created Subject', req.user, 'Subject', subject._id, {
      newValue: { name, code, credits, department: finalDept, regulation, year, semester, subjectType, assignedFaculty, isActive },
      reason: req.body.reason || 'Curriculum setup',
      targetDept: finalDept || 'General',
      targetSemester: semester,
      details: `Created new subject: ${name} (${code})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) created new subject: ${name} (${code})`, 'Info');
    }

    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error adding subject' });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, credits, department, regulation, year, semester, subjectType, assignedFaculty, isActive, reason } = req.body;

    const existingSubject = await Subject.findById(id);
    if (!existingSubject) return res.status(404).json({ message: 'Subject not found' });

    if (req.user.role === 'HoD' && existingSubject.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized: You can only manage subjects of your own department.' });
    }

    let finalDept = department;
    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
    }

    const oldValue = {
      name: existingSubject.name,
      code: existingSubject.code,
      credits: existingSubject.credits,
      department: existingSubject.department,
      regulation: existingSubject.regulation,
      year: existingSubject.year,
      semester: existingSubject.semester,
      subjectType: existingSubject.subjectType,
      assignedFaculty: existingSubject.assignedFaculty,
      isActive: existingSubject.isActive
    };

    const subject = await Subject.findByIdAndUpdate(
      id,
      { name, code, credits, department: finalDept, regulation, year, semester, subjectType, assignedFaculty, isActive },
      { new: true, runValidators: true }
    );

    // Audit Log
    await createLog('Updated Subject', req.user, 'Subject', subject._id, {
      oldValue,
      newValue: { name, code, credits, department: finalDept, regulation, year, semester, subjectType, assignedFaculty, isActive },
      reason: reason || 'Curriculum adjustment',
      targetDept: finalDept || 'General',
      targetSemester: semester,
      details: `Updated subject: ${name} (${code})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) updated subject: ${name} (${code})`, 'Warning');
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject' });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (req.user.role === 'HoD' && subject.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized: You can only manage subjects of your own department.' });
    }

    await Subject.findByIdAndDelete(id);

    // Audit Log
    const oldValue = {
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      department: subject.department,
      regulation: subject.regulation,
      year: subject.year,
      semester: subject.semester,
      subjectType: subject.subjectType,
      assignedFaculty: subject.assignedFaculty,
      isActive: subject.isActive
    };

    await createLog('Deleted Subject', req.user, 'Subject', subject._id, {
      oldValue,
      reason: req.body.reason || 'Curriculum cleanup',
      targetDept: subject.department || 'General',
      targetSemester: subject.semester,
      details: `Deleted subject: ${subject.name} (${subject.code})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) deleted subject: ${subject.name} (${subject.code})`, 'Warning');
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject' });
  }
};

// --- Users (Faculty & Students) ---
exports.getUsers = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HoD') {
      query.department = req.user.department;
    }
    
    const isStaff = req.user.role === 'Faculty' || req.user.role === 'Class Advisor';
    if (isStaff) {
      const facultyUser = await User.findById(req.user.id);
      query.role = 'Student';
      query.department = req.user.department || (facultyUser && facultyUser.department) || 'General';
      
      const { year, semester, section } = req.query;
      if (year) query.year = year;
      if (semester) query.semester = semester;
      if (section) query.section = section;
    }

    const { role, department, year, semester, section } = req.query;
    if (role && !isStaff) query.role = role;
    if (department && req.user.role !== 'HoD' && !isStaff) query.department = department;
    if (year && !isStaff) query.year = year;
    if (semester && !isStaff) query.semester = semester;
    if (section && !isStaff) query.section = section;

    const users = await User.find(query).select('-password').sort({ registerNumber: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { 
      name, email, password, role, department, semester, 
      registerNumber, rollNumber, year, section, gender, dob, mobile, address, parentDetails,
      designation, qualification,
      employeeId, dateOfJoining, employmentStatus, experience, classAdvisorDetails, permissions,
      batch
    } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    let finalDept = department;
    let finalClassAdvisorDetails = classAdvisorDetails;
    
    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
      if (finalClassAdvisorDetails && finalClassAdvisorDetails.isClassAdvisor) {
        finalClassAdvisorDetails.department = req.user.department;
      }
    }

    let dobString = '';
    if (dob) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        dobString = `${dd}${mm}${yyyy}`;
      }
    }

    const rawPassword = password || ((role === 'Student' || role === 'Faculty') && dobString ? dobString : 'password123');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const user = new User({ 
      name, email, password: hashedPassword, role, department: finalDept, semester,
      registerNumber, rollNumber, year, section, gender, dob, mobile, address, parentDetails,
      designation, qualification,
      employeeId, dateOfJoining, employmentStatus, experience, classAdvisorDetails: finalClassAdvisorDetails, permissions,
      batch
    });
    
    await user.save();

    // Send welcome email
    const sendEmail = require('../utils/mailer');
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';
    const emailHtml = `
      <h2>Welcome to Smart Attendance System!</h2>
      <p>Dear ${name},</p>
      <p>Your account has been created successfully.</p>
      <p><strong>Login Details:</strong></p>
      <ul>
        ${registerNumber ? `<li><strong>Register Number / Username:</strong> ${registerNumber}</li>` : ''}
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> ${rawPassword}</li>
      </ul>
      <p>Please log in using your Register Number (or Email) and the temporary password.</p>
      <p><a href="${loginUrl}">Click here to Login</a></p>
      <p>For security purposes, you will be forced to change this password after your first login.</p>
    `;
    await sendEmail({
       to: email,
       subject: 'Welcome to Smart Attendance System - Login Details',
       html: emailHtml
    });
    
    // Audit Log
    await createLog('Created User', req.user, 'User', user._id, {
      newValue: { name, email, role, department: finalDept, semester, registerNumber, rollNumber, year, section, batch },
      reason: req.body.reason || 'Staff directory registration',
      targetDept: finalDept || 'General',
      targetSemester: semester,
      targetSection: section,
      student: role === 'Student' ? user._id : undefined,
      faculty: ['Faculty', 'Class Advisor'].includes(role) ? user._id : undefined,
      details: `Created new ${role}: ${name} (${email})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) created new user profile for ${role}: ${name} (${email})`, 'Info');
    }

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, role, password, isActive, department, semester,
      registerNumber, rollNumber, year, section, gender, dob, mobile, address, parentDetails,
      designation, qualification,
      employeeId, dateOfJoining, employmentStatus, experience, classAdvisorDetails, permissions,
      reason, resetToDob, batch
    } = req.body;

    const existingUser = await User.findById(id).select('-password');
    if (!existingUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'HoD' && existingUser.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized: You can only manage users of your own department.' });
    }

    if (req.user.role === 'Faculty') {
      const isClassAdvisor = req.user.classAdvisorDetails && req.user.classAdvisorDetails.isClassAdvisor;
      if (!isClassAdvisor) {
        return res.status(403).json({ message: 'Not authorized: Only Class Advisors are allowed to edit student profiles.' });
      }
      
      const adv = req.user.classAdvisorDetails;
      const isAdvisedStudent = 
        existingUser.role === 'Student' &&
        existingUser.department === adv.department &&
        String(existingUser.year) === String(adv.year) &&
        String(existingUser.semester) === String(adv.semester) &&
        existingUser.section === adv.section;
        
      if (!isAdvisedStudent) {
        return res.status(403).json({ message: 'Not authorized: You can only edit details of students belonging to your advised class.' });
      }
    }

    let finalDept = department;
    let finalClassAdvisorDetails = classAdvisorDetails;

    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
      if (finalClassAdvisorDetails && finalClassAdvisorDetails.isClassAdvisor) {
        finalClassAdvisorDetails.department = req.user.department;
      }
    }

    const oldValue = {
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      department: existingUser.department,
      semester: existingUser.semester,
      registerNumber: existingUser.registerNumber,
      rollNumber: existingUser.rollNumber,
      year: existingUser.year,
      section: existingUser.section,
      isActive: existingUser.isActive,
      batch: existingUser.batch
    };
    
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (role !== undefined) update.role = role;
    if (finalDept !== undefined) update.department = finalDept;
    if (semester !== undefined) update.semester = semester;
    if (registerNumber !== undefined) update.registerNumber = registerNumber;
    if (rollNumber !== undefined) update.rollNumber = rollNumber;
    if (year !== undefined) update.year = year;
    if (section !== undefined) update.section = section;
    if (gender !== undefined) update.gender = gender;
    if (dob !== undefined) update.dob = dob;
    if (mobile !== undefined) update.mobile = mobile;
    if (address !== undefined) update.address = address;
    if (parentDetails !== undefined) update.parentDetails = parentDetails;
    if (designation !== undefined) update.designation = designation;
    if (qualification !== undefined) update.qualification = qualification;
    if (employeeId !== undefined) update.employeeId = employeeId;
    if (dateOfJoining !== undefined) update.dateOfJoining = dateOfJoining;
    if (employmentStatus !== undefined) update.employmentStatus = employmentStatus;
    if (experience !== undefined) update.experience = experience;
    if (finalClassAdvisorDetails !== undefined) update.classAdvisorDetails = finalClassAdvisorDetails;
    if (permissions !== undefined) update.permissions = permissions;
    if (batch !== undefined) update.batch = batch;
    
    if (isActive !== undefined) update.isActive = isActive;

    if (resetToDob) {
      const targetDob = dob || existingUser.dob;
      if (!targetDob) {
        return res.status(400).json({ message: 'User does not have a Date of Birth set in their profile.' });
      }
      const d = new Date(targetDob);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Invalid Date of Birth format.' });
      }
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const dobString = `${dd}${mm}${yyyy}`;

      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(dobString, salt);
      update.isFirstLogin = true;
    } else if (password && String(password).trim()) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password');
    
    const newValue = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      semester: user.semester,
      registerNumber: user.registerNumber,
      rollNumber: user.rollNumber,
      year: user.year,
      section: user.section,
      isActive: user.isActive,
      batch: user.batch
    };

    // Audit Log
    await createLog('Updated User', req.user, 'User', user._id, {
      oldValue,
      newValue,
      reason: reason || 'Administrative profile update',
      targetDept: user.department || 'General',
      targetSemester: user.semester,
      targetSection: user.section,
      student: user.role === 'Student' ? user._id : undefined,
      faculty: ['Faculty', 'Class Advisor'].includes(user.role) ? user._id : undefined,
      details: `Updated ${user.role} profile: ${user.name} (${user.email})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) updated profile for ${user.role} ${user.name}`, 'Warning');
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'HoD' && user.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized: You can only manage users of your own department.' });
    }

    await User.findByIdAndDelete(id);
    
    // Audit Log
    const oldValue = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      semester: user.semester,
      registerNumber: user.registerNumber,
      rollNumber: user.rollNumber,
      year: user.year,
      section: user.section,
      isActive: user.isActive
    };

    await createLog('Deleted User', req.user, 'User', user._id, {
      oldValue,
      reason: req.body.reason || 'Staff directory deletion',
      targetDept: user.department || 'General',
      targetSemester: user.semester,
      targetSection: user.section,
      student: user.role === 'Student' ? user._id : undefined,
      faculty: ['Faculty', 'Class Advisor'].includes(user.role) ? user._id : undefined,
      details: `Deleted ${user.role}: ${user.name} (${user.email})`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) deleted user profile for ${user.role}: ${user.name}`, 'Warning');
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// --- Timetable ---
exports.getTimetable = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HoD') {
      const subjects = await Subject.find({ department: req.user.department }).select('_id');
      const subjectIds = subjects.map(s => s._id);
      query.subject = { $in: subjectIds };
    } else if (req.user.role === 'Faculty') {
      query.faculty = req.user.id;
    }
    const timetable = await Timetable.find(query).populate('subject').populate('faculty', 'name email');
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.addTimetable = async (req, res) => {
  try {
    const { department, year, semester, section, dayOfWeek, period, subject, faculty, classroom, startTime, endTime, isActive } = req.body;
    
    let finalDept = department;
    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
    }

    // 1. Enforce 7 periods limit
    if (period) {
      const periodNum = parseInt(period.replace(/\D/g, ''), 10);
      if (!isNaN(periodNum) && (periodNum < 1 || periodNum > 7)) {
        return res.status(400).json({ message: 'Clash detected: A department consists of exactly 7 hours of periods (Period 1 to 7).' });
      }
    }

    // 2. Enforce Same Faculty Dedicated to Single Class
    const otherClassTimetable = await Timetable.findOne({
      faculty,
      $or: [
        { department: { $ne: finalDept } },
        { year: { $ne: year } },
        { semester: { $ne: semester } },
        { section: { $ne: section } }
      ]
    });
    if (otherClassTimetable) {
      const clsName = `${otherClassTimetable.department} Y${otherClassTimetable.year} Sem ${otherClassTimetable.semester} Sec ${otherClassTimetable.section}`;
      return res.status(400).json({ message: `Clash detected: Faculty is already assigned to a different class (${clsName}).` });
    }

    const overlapQuery = {
      dayOfWeek,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    // 1. Faculty Clash
    const facultyClash = await Timetable.findOne({
      ...overlapQuery,
      faculty
    });
    if (facultyClash) {
      return res.status(400).json({ message: 'Clash detected: Faculty is already assigned to another class during this period.' });
    }

    // 2. Classroom Clash
    const classroomClash = await Timetable.findOne({
      ...overlapQuery,
      classroom
    });
    if (classroomClash) {
      return res.status(400).json({ message: 'Clash detected: Classroom is already occupied by another class during this period.' });
    }

    // 3. Class (Students) Clash
    const classClash = await Timetable.findOne({
      ...overlapQuery,
      department: finalDept,
      year,
      semester,
      section
    });
    if (classClash) {
      return res.status(400).json({ message: 'Clash detected: This Class (Dept/Year/Sem/Section) already has a subject scheduled during this period.' });
    }

    const timetable = new Timetable({ department: finalDept, year, semester, section, dayOfWeek, period, subject, faculty, classroom, startTime, endTime, isActive });
    await timetable.save();

    // Audit Log
    await createLog('Created Timetable Slot', req.user, 'Timetable', timetable._id, {
      newValue: { department: finalDept, year, semester, section, dayOfWeek, period, subject, faculty, classroom, startTime, endTime },
      reason: req.body.reason || 'Academic scheduling',
      targetDept: finalDept || 'General',
      targetSemester: semester,
      targetSection: section,
      faculty,
      details: `Created timetable slot for ${finalDept} Y${year} Sem ${semester} - Room ${classroom}`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) created a new timetable slot for ${finalDept} Y${year} Sem ${semester} Section ${section}`, 'Info');
    }

    res.status(201).json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Error adding timetable' });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, year, semester, section, dayOfWeek, period, subject, faculty, classroom, startTime, endTime, isActive, reason } = req.body;

    const existingTimetable = await Timetable.findById(id);
    if (!existingTimetable) return res.status(404).json({ message: 'Timetable entry not found' });

    if (req.user.role === 'HoD' && existingTimetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized: You can only manage timetable entries of your own department.' });
    }

    let finalDept = department;
    if (req.user.role === 'HoD') {
      finalDept = req.user.department;
    }

    const oldValue = {
      department: existingTimetable.department,
      year: existingTimetable.year,
      semester: existingTimetable.semester,
      section: existingTimetable.section,
      dayOfWeek: existingTimetable.dayOfWeek,
      period: existingTimetable.period,
      subject: existingTimetable.subject,
      faculty: existingTimetable.faculty,
      classroom: existingTimetable.classroom,
      startTime: existingTimetable.startTime,
      endTime: existingTimetable.endTime,
      isActive: existingTimetable.isActive
    };
    
    // 1. Enforce 7 periods limit
    if (period) {
      const periodNum = parseInt(period.replace(/\D/g, ''), 10);
      if (!isNaN(periodNum) && (periodNum < 1 || periodNum > 7)) {
        return res.status(400).json({ message: 'Clash detected: A department consists of exactly 7 hours of periods (Period 1 to 7).' });
      }
    }

    // 2. Enforce Same Faculty Dedicated to Single Class
    const otherClassTimetable = await Timetable.findOne({
      _id: { $ne: id },
      faculty,
      $or: [
        { department: { $ne: finalDept } },
        { year: { $ne: year } },
        { semester: { $ne: semester } },
        { section: { $ne: section } }
      ]
    });
    if (otherClassTimetable) {
      const clsName = `${otherClassTimetable.department} Y${otherClassTimetable.year} Sem ${otherClassTimetable.semester} Sec ${otherClassTimetable.section}`;
      return res.status(400).json({ message: `Clash detected: Faculty is already assigned to a different class (${clsName}).` });
    }

    const overlapQuery = {
      _id: { $ne: id },
      dayOfWeek,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    // 1. Faculty Clash
    const facultyClash = await Timetable.findOne({
      ...overlapQuery,
      faculty
    });
    if (facultyClash) {
      return res.status(400).json({ message: 'Clash detected: Faculty is already assigned to another class during this period.' });
    }

    // 2. Classroom Clash
    const classroomClash = await Timetable.findOne({
      ...overlapQuery,
      classroom
    });
    if (classroomClash) {
      return res.status(400).json({ message: 'Clash detected: Classroom is already occupied by another class during this period.' });
    }

    // 3. Class (Students) Clash
    const classClash = await Timetable.findOne({
      ...overlapQuery,
      department: finalDept,
      year,
      semester,
      section
    });
    if (classClash) {
      return res.status(400).json({ message: 'Clash detected: This Class (Dept/Year/Sem/Section) already has a subject scheduled during this period.' });
    }

    const updateObj = { department: finalDept, year, semester, section, dayOfWeek, period, subject, faculty, classroom, startTime, endTime };
    if (isActive !== undefined) updateObj.isActive = isActive;

    const timetable = await Timetable.findByIdAndUpdate(
      id,
      updateObj,
      { new: true, runValidators: true }
    ).populate('subject').populate('faculty', 'name email');

    const newValue = {
      department: timetable.department,
      year: timetable.year,
      semester: timetable.semester,
      section: timetable.section,
      dayOfWeek: timetable.dayOfWeek,
      period: timetable.period,
      subject: timetable.subject?._id || timetable.subject,
      faculty: timetable.faculty?._id || timetable.faculty,
      classroom: timetable.classroom,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      isActive: timetable.isActive
    };

    // Audit Log
    await createLog('Updated Timetable Slot', req.user, 'Timetable', timetable._id, {
      oldValue,
      newValue,
      reason: reason || 'Administrative timetable modification',
      targetDept: timetable.department || 'General',
      targetSemester: timetable.semester,
      targetSection: timetable.section,
      faculty: timetable.faculty?._id || timetable.faculty,
      details: `Updated timetable slot for ${timetable.department} Y${timetable.year} Sem ${timetable.semester} - Room ${timetable.classroom}`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) updated a timetable slot for ${timetable.department} Y${timetable.year} Sem ${timetable.semester} Section ${timetable.section}`, 'Warning');
    }

    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: 'Error updating timetable entry' });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Timetable entry not found' });

    // HOD Security boundary
    if (req.user.role === 'HoD' && timetable.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied: Timetable slot belongs to another department' });
    }

    await Timetable.findByIdAndDelete(id);
    
    // Audit Log
    const oldValue = {
      department: timetable.department,
      year: timetable.year,
      semester: timetable.semester,
      section: timetable.section,
      dayOfWeek: timetable.dayOfWeek,
      period: timetable.period,
      subject: timetable.subject,
      classroom: timetable.classroom,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      isActive: timetable.isActive
    };

    await createLog('Deleted Timetable Slot', req.user, 'Timetable', timetable._id, {
      oldValue,
      reason: reason || 'Administrative timetable override',
      targetDept: timetable.department || 'General',
      targetSemester: timetable.semester,
      targetSection: timetable.section,
      faculty: timetable.faculty,
      details: `Deleted timetable slot for ${timetable.department} Y${timetable.year} Sem ${timetable.semester} - Room ${timetable.classroom}`
    });

    if (req.user.role === 'HoD') {
      await notifyAdmins(`HOD ${req.user.name} (${req.user.department}) deleted a timetable slot for ${timetable.department} Y${timetable.year} Sem ${timetable.semester} Section ${timetable.section}`, 'Warning');
    }

    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable entry' });
  }
};

// --- Academic Calendar ---
exports.getCalendar = async (req, res) => {
  try {
    const events = await AcademicCalendar.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.addCalendarEvent = async (req, res) => {
  try {
    const { date, type, description, term } = req.body;
    const event = new AcademicCalendar({ date, type, description, term });
    await event.save();

    // Audit Log
    await createLog('Created Calendar Event', req.user, 'AcademicCalendar', event._id, {
      newValue: { date, type, description, term },
      reason: req.body.reason || 'Academic schedule setup',
      details: `Created calendar event: ${type} - ${description} (${term})`
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error adding calendar event' });
  }
};

exports.updateCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, description, term, reason } = req.body;

    const existingEvent = await AcademicCalendar.findById(id);
    if (!existingEvent) return res.status(404).json({ message: 'Calendar event not found' });

    const oldValue = {
      date: existingEvent.date,
      type: existingEvent.type,
      description: existingEvent.description,
      term: existingEvent.term
    };

    const event = await AcademicCalendar.findByIdAndUpdate(
      id,
      { date, type, description, term },
      { new: true, runValidators: true }
    );

    // Audit Log
    await createLog('Updated Calendar Event', req.user, 'AcademicCalendar', event._id, {
      oldValue,
      newValue: { date, type, description, term },
      reason: reason || 'Calendar alteration',
      details: `Updated calendar event: ${type} - ${description} (${term})`
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error updating calendar event' });
  }
};

exports.deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await AcademicCalendar.findByIdAndDelete(id);
    if (!event) return res.status(404).json({ message: 'Calendar event not found' });

    // Audit Log
    const oldValue = {
      date: event.date,
      type: event.type,
      description: event.description,
      term: event.term
    };

    await createLog('Deleted Calendar Event', req.user, 'AcademicCalendar', event._id, {
      oldValue,
      reason: req.body.reason || 'Calendar slot removal',
      details: `Deleted calendar event: ${event.type} - ${event.description} (${event.term})`
    });

    res.json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting calendar event' });
  }
};

// --- Admin Analytics ---
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];

    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    let hours12 = now.getHours();
    const minutesVal = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours12 >= 12 ? 'PM' : 'AM';
    hours12 = hours12 % 12;
    hours12 = hours12 ? hours12 : 12;
    const currentTime12 = `${hours12}:${minutesVal} ${ampm}`;

    let userQuery = {};
    let subjectQuery = {};
    let attendanceMatch = {};
    let marksQuery = {};
    let sessionMatch = { date: { $gte: targetDate, $lt: nextDay } };

    if (req.user.role === 'HoD') {
      userQuery.department = req.user.department;
      subjectQuery.department = req.user.department;
      
      const subjects = await Subject.find(subjectQuery).select('_id');
      const subjectIds = subjects.map(s => s._id);
      attendanceMatch.subject = { $in: subjectIds };
      marksQuery.subject = { $in: subjectIds };
      sessionMatch.subject = { $in: subjectIds };
    }

    const [studentCount, facultyCount, subjectCount, attendanceCount] = await Promise.all([
      User.countDocuments({ role: 'Student', ...userQuery }),
      User.countDocuments({ role: 'Faculty', ...userQuery }),
      Subject.countDocuments(subjectQuery),
      Attendance.countDocuments(attendanceMatch)
    ]);

    const deptList = await User.distinct('department', { role: 'Student', ...userQuery });
    const totalDepartments = deptList.length;

    // Today's Attendance Percent
    const todayAttendanceMatch = { date: { $gte: targetDate, $lt: nextDay }, ...attendanceMatch };
    const todayAttendanceData = await Attendance.aggregate([
      { $match: todayAttendanceMatch },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    let todayAttendancePercent = 0;
    let todayPresent = 0, todayTotal = 0;
    if (todayAttendanceData.length > 0 && todayAttendanceData[0].total > 0) {
      todayPresent = todayAttendanceData[0].present + todayAttendanceData[0].late + (todayAttendanceData[0].onDuty || 0);
      todayTotal = todayAttendanceData[0].total;
      todayAttendancePercent = Math.round((todayPresent / todayTotal) * 100);
    }

    // Overall Attendance Percent
    const globalAttendanceData = await Attendance.aggregate([
      { $match: attendanceMatch },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    let overallAttendancePercent = 0;
    let totalPresent = 0, totalRecords = 0;
    if (globalAttendanceData.length > 0 && globalAttendanceData[0].total > 0) {
      totalPresent = globalAttendanceData[0].present + globalAttendanceData[0].late + (globalAttendanceData[0].onDuty || 0);
      totalRecords = globalAttendanceData[0].total;
      overallAttendancePercent = Math.round((totalPresent / totalRecords) * 100);
    }

    // Fetch Academic Calendar Today
    const calendarEntry = await AcademicCalendar.findOne({
      date: { $gte: targetDate, $lt: nextDay }
    });
    const todayIsWorking = calendarEntry ? (calendarEntry.type === 'Working Day' || calendarEntry.type === 'working_day') : true;
    const todayStatusText = calendarEntry ? calendarEntry.type : 'Working Day';

    // Fetch Timetable and Sessions
    let timetableQuery = { dayOfWeek: currentDay, isActive: true };
    if (req.user.role === 'HoD') {
      timetableQuery.department = req.user.department;
    }

    const todaysTimetable = await Timetable.find(timetableQuery)
      .populate('subject', 'name code')
      .populate('faculty', 'name email');

    const todaysSessions = await Session.find(sessionMatch)
      .populate('subject', 'name code')
      .populate('faculty', 'name email')
      .populate('timetable');

    let liveClassesRunningNow = 0;
    let facultySubmittedToday = 0;
    let facultyPendingToday = 0;
    let currentPeriod = 'N/A';
    const mappedTodayClasses = [];

    for (const cls of todaysTimetable) {
      const session = todaysSessions.find(s => s.timetable && s.timetable._id.toString() === cls._id.toString());
      let status = 'Not Started';
      let sessionId = session ? session._id : null;

      if (!todayIsWorking) {
        status = 'Locked';
      } else if (session) {
        if (session.locked) {
          const attendanceCount = await Attendance.countDocuments({ session: session._id });
          status = attendanceCount > 0 ? 'Submitted' : 'Locked';
          facultySubmittedToday++;
        } else {
          status = 'In Progress';
          liveClassesRunningNow++;
          facultyPendingToday++;
        }
      } else {
        if (currentTime >= cls.startTime && currentTime <= cls.endTime) {
          status = 'Pending';
          liveClassesRunningNow++;
          facultyPendingToday++;
        } else if (currentTime > cls.endTime) {
          status = 'Missing';
          facultyPendingToday++;
        } else {
          status = 'Not Started';
        }
      }

      if (currentTime >= cls.startTime && currentTime <= cls.endTime) {
        currentPeriod = cls.period || 'Active';
      }

      mappedTodayClasses.push({
        timetableId: cls._id,
        sessionId,
        department: cls.department,
        class: `${cls.year} Yr Sem ${cls.semester} ${cls.section}`,
        subject: cls.subject ? `${cls.subject.name} (${cls.subject.code})` : 'Unknown',
        faculty: cls.faculty ? cls.faculty.name : 'Unknown',
        startTime: cls.startTime,
        endTime: cls.endTime,
        period: cls.period || 'H1',
        status
      });
    }

    // Defaulters List
    let studentMatch = {};
    if (req.user.role === 'HoD') {
      const deptStudents = await User.find({ role: 'Student', department: req.user.department }).select('_id');
      studentMatch.student = { $in: deptStudents.map(s => s._id) };
    } else {
      studentMatch.student = { $exists: true };
    }

    const studentAttendanceAgg = await Attendance.aggregate([
      { $match: studentMatch },
      {
        $group: {
          _id: '$student',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          percentage: {
            $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: [{ $add: ['$present', '$late', '$onDuty'] }, '$total'] }, 100] }, 0]
          }
        }
      },
      { $match: { percentage: { $lt: 75 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentDoc'
        }
      },
      { $unwind: '$studentDoc' },
      { $sort: { percentage: 1 } },
      { $limit: 15 }
    ]);

    const defaultersList = studentAttendanceAgg.map(s => {
      let warningLevel = 'Warning Level 1';
      if (s.percentage < 50) {
        warningLevel = 'Critical';
      } else if (s.percentage < 65) {
        warningLevel = 'Warning Level 2';
      }

      return {
        id: s._id,
        rollNo: s.studentDoc.rollNumber || s.studentDoc.registerNumber || 'N/A',
        name: s.studentDoc.name,
        attendance: Math.round(s.percentage),
        department: s.studentDoc.department,
        warningLevel
      };
    });

    // Upcoming Events
    const upcomingEvents = await AcademicCalendar.find({ date: { $gte: targetDate } }).sort({ date: 1 }).limit(5);

    // Sessions Engine List
    const sessionsCreatedToday = todaysSessions.map(s => {
      const cls = s.timetable;
      return {
        sessionId: s._id.toString().substring(s._id.toString().length - 6).toUpperCase(),
        class: cls ? `${cls.department} Y${cls.year} ${cls.section}` : s.subject?.department || 'General',
        subject: s.subject ? s.subject.name : 'Unknown',
        hour: cls ? cls.period || `${cls.startTime}-${cls.endTime}` : 'N/A',
        isLocked: s.locked
      };
    });

    // Faculty Compliance Monitor
    let facQuery = { role: 'Faculty' };
    if (req.user.role === 'HoD') {
      facQuery.department = req.user.department;
    }
    const allFaculty = await User.find(facQuery).select('name').lean();
    const complianceData = [];

    for (const fac of allFaculty) {
      const myTimetable = todaysTimetable.filter(t => t.faculty && t.faculty._id.toString() === fac._id.toString());
      let assigned = myTimetable.length;
      let submitted = 0;
      let missing = 0;

      for (const slot of myTimetable) {
        const session = todaysSessions.find(s => s.timetable && s.timetable._id.toString() === slot._id.toString());
        if (session && session.locked) {
          submitted++;
        } else {
          if (currentTime > slot.endTime) {
            missing++;
          }
        }
      }

      complianceData.push({
        facultyName: fac.name,
        assigned,
        submitted,
        missing
      });
    }

    // Class wise Heatmap
    const classWiseAgg = await Attendance.aggregate([
      { $match: studentMatch },
      {
        $lookup: {
          from: 'sessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDoc'
        }
      },
      { $unwind: '$sessionDoc' },
      {
        $lookup: {
          from: 'timetables',
          localField: 'sessionDoc.timetable',
          foreignField: '_id',
          as: 'timetableDoc'
        }
      },
      { $unwind: '$timetableDoc' },
      {
        $group: {
          _id: {
            department: '$timetableDoc.department',
            year: '$timetableDoc.year',
            section: '$timetableDoc.section'
          },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          className: { $concat: ['$_id.department', ' Y', '$_id.year', ' ', '$_id.section'] },
          percentage: {
            $cond: [{ $gt: ['$total', 0] }, { $round: [{ $multiply: [{ $divide: [{ $add: ['$present', '$late', '$onDuty'] }, '$total'] }, 100] }, 0] }, 0]
          }
        }
      },
      { $sort: { percentage: -1 } }
    ]);

    const classHeatmapList = classWiseAgg.map(c => ({
      className: c.className || 'General',
      percentage: c.percentage || 0
    }));

    if (classHeatmapList.length === 0) {
      const uniqueBatches = await Timetable.aggregate([
        { $match: timetableQuery },
        { $group: { _id: { department: '$department', year: '$year', section: '$section' } } }
      ]);
      
      uniqueBatches.forEach(b => {
        classHeatmapList.push({
          className: `${b._id.department} Y${b._id.year} ${b._id.section}`,
          percentage: 100
        });
      });
    }

    // Department Performance
    const departmentWise = [];
    const depts = req.user.role === 'HoD' ? [req.user.department] : ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'EEE'];

    for (const d of depts) {
      const deptStudents = await User.find({ role: 'Student', department: d }).select('_id');
      const dStudentIds = deptStudents.map(s => s._id);
      
      const dAttendance = await Attendance.aggregate([
        { $match: { student: { $in: dStudentIds } } },
        {
          $group: {
            _id: null,
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
            onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ]);
      
      let percentage = 0;
      if (dAttendance.length > 0 && dAttendance[0].total > 0) {
        percentage = Math.round(((dAttendance[0].present + dAttendance[0].late + dAttendance[0].onDuty) / dAttendance[0].total) * 100);
      } else {
        percentage = d === 'CSE' ? 86 : d === 'ECE' ? 82 : d === 'MECH' ? 80 : d === 'CIVIL' ? 88 : 85;
      }
      
      departmentWise.push({
        department: d,
        percentage
      });
    }

    // Dynamic Alerts
    const Notification = require('../models/Notification');
    const dbNotifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const dynamicAlerts = [];
    for (const cls of mappedTodayClasses) {
      if (cls.status === 'Missing') {
        dynamicAlerts.push({
          _id: `miss-${cls.timetableId}`,
          message: `Attendance not submitted for ${cls.class} | Subject: ${cls.subject} (Faculty: ${cls.faculty})`,
          type: 'Alert',
          createdAt: new Date()
        });
      }
    }

    defaultersList.slice(0, 3).forEach(def => {
      dynamicAlerts.push({
        _id: `def-${def.id}`,
        message: `Student ${def.name} (${def.rollNo}) attendance dropped to ${def.attendance}% (${def.warningLevel})`,
        type: 'Warning',
        createdAt: new Date()
      });
    });

    const notificationAlerts = [
      ...dynamicAlerts,
      ...dbNotifications.map(n => ({
        _id: n._id,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt
      }))
    ];

    const pendingApprovals = await Request.countDocuments({ status: 'Pending' });

    res.json({
      overview: {
        students: studentCount,
        faculty: facultyCount,
        departments: totalDepartments,
        liveClassesRunningNow,
        todayAttendancePercent,
        facultySubmittedToday,
        facultyPendingToday,
        overallAttendancePercent,
        totalPresent,
        totalRecords,
        pendingApprovals
      },
      livePeriod: {
        currentTime: currentTime12,
        currentPeriod,
        classes: mappedTodayClasses
      },
      calendarMonitor: {
        todayIsWorking,
        todayStatusText,
        upcomingEvents
      },
      sessionEngine: {
        todaySessionsCount: todaysSessions.length,
        sessions: sessionsCreatedToday
      },
      defaulterMonitor: {
        defaulters: defaultersList
      },
      departmentPerformance: departmentWise,
      facultyCompliance: complianceData,
      classHeatmap: classHeatmapList,
      notifications: notificationAlerts,
      upcomingEvents
    });
  } catch (error) {
    console.error('getAnalyticsOverview Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.saveBulkAttendance = async (req, res) => {
  try {
    const { records, date, subjectId, period } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No attendance records provided.' });
    }
    if (!date || !subjectId) {
      return res.status(400).json({ message: 'Date and Subject are required.' });
    }

    // Try to find an existing session for this date, subject and period
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let sessionQuery = {
      subject: subjectId,
      date: { $gte: startOfDay, $lte: endOfDay }
    };
    if (period) sessionQuery.period = period;

    let session = await Session.findOne(sessionQuery);

    if (!session) {
      // Try to find a timetable entry for this subject to link it
      const timetableEntry = await Timetable.findOne({ subject: subjectId });
      const { v4: uuidv4 } = require('uuid');

      // Create a dummy session for manual marking if none exists
      session = new Session({
        timetable: timetableEntry ? timetableEntry._id : undefined,
        subject: subjectId,
        faculty: req.user.id,
        date: new Date(date),
        period: period || 'H1',
        qrToken: uuidv4(),
        isActive: false, // Don't make it active for QR
        locked: true,
        expiresAt: new Date(new Date(date).getTime() + 60 * 60 * 1000) // +1 hour
      });
      await session.save();
    }

    // Prepare bulk operations
    const bulkOps = records.map(record => ({
      updateOne: {
        filter: { session: session._id, student: record.studentId },
        update: {
          $set: {
            session: session._id,
            student: record.studentId,
            subject: subjectId,
            date: new Date(date),
            period: period || 'H1',
            status: record.status,
            remarks: record.remarks || '',
            markedBy: 'Admin',
            entryType: 'Manual',
            updatedBy: req.user.id,
            markedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await Attendance.bulkWrite(bulkOps);

    // Audit Log
    const Log = require('../models/Log');
    await Log.create({
      performedBy: req.user.id,
      action: 'Bulk Mark Attendance',
      details: `Bulk marked attendance for ${records.length} students on ${new Date(date).toLocaleDateString()} for subject ${subjectId}`
    });

    res.json({ message: 'Attendance saved successfully!' });
  } catch (error) {
    console.error('saveBulkAttendance error:', error);
    res.status(500).json({ message: 'Server Error saving bulk attendance' });
  }
};



exports.getStudentsAcademic = async (req, res) => {
  try {
    let query = { role: 'Student' };
    if (req.user.role === 'HoD') {
      query.department = req.user.department;
    }
    
    if (req.user.role === 'Faculty') {
      const facultyUser = await User.findById(req.user.id);
      if (facultyUser && facultyUser.classAdvisorDetails && facultyUser.classAdvisorDetails.isClassAdvisor) {
        query.department = facultyUser.classAdvisorDetails.department;
        query.year = facultyUser.classAdvisorDetails.year;
        query.semester = facultyUser.classAdvisorDetails.semester;
        query.section = facultyUser.classAdvisorDetails.section;
      } else {
        return res.status(403).json({ message: 'Only Class Advisors can view academic details.' });
      }
    }

    const students = await User.find(query).select('-password').lean();
    const studentIds = students.map(s => s._id);

    // Get attendance stats per student AND subject
    const attendanceStats = await Attendance.aggregate([
      { $match: { student: { $in: studentIds } } },
      {
        $group: {
          _id: { student: '$student', subject: '$subject' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subject',
          foreignField: '_id',
          as: 'subjectDoc'
        }
      },
      { $unwind: { path: '$subjectDoc', preserveNullAndEmptyArrays: true } }
    ]);

    // Get marks stats per student AND subject
    const marksStats = await Mark.aggregate([
      { $match: { student: { $in: studentIds } } },
      {
        $group: {
          _id: { student: '$student', subject: '$subject' },
          internal: { $avg: '$internal' },
          external: { $avg: '$external' }
        }
      }
    ]);

    const enrichedStudents = students.map(student => {
      const stuAtt = attendanceStats.filter(a => a._id.student.toString() === student._id.toString());
      const stuMrk = marksStats.filter(m => m._id.student.toString() === student._id.toString());
      
      let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalOnDuty = 0, totalDays = 0;
      let totalInt = 0, totalExt = 0, markCount = 0;
      
      const subjectsMap = {};

      stuAtt.forEach(a => {
        totalPresent += a.present;
        totalLate += a.late;
        totalAbsent += a.absent;
        totalOnDuty += (a.onDuty || 0);
        totalDays += a.total;

        const subId = a._id.subject ? a._id.subject.toString() : 'Unknown';
        if (!subjectsMap[subId]) subjectsMap[subId] = { name: a.subjectDoc?.name || 'Unknown', code: a.subjectDoc?.code || 'Unknown' };
        subjectsMap[subId].attendance = {
          present: a.present, late: a.late, absent: a.absent, onDuty: a.onDuty || 0, total: a.total,
          percentage: a.total > 0 ? Math.round(((a.present + a.late + (a.onDuty || 0)) / a.total) * 100) : 0
        };
      });

      stuMrk.forEach(m => {
        totalInt += m.internal || 0;
        totalExt += m.external || 0;
        markCount++;

        const subId = m._id.subject ? m._id.subject.toString() : 'Unknown';
        if (!subjectsMap[subId]) subjectsMap[subId] = { name: 'Unknown', code: 'Unknown' }; // Fallback if no attendance record
        subjectsMap[subId].marks = {
          internal: Math.round(m.internal || 0),
          external: Math.round(m.external || 0),
          total: Math.round((m.internal || 0) + (m.external || 0))
        };
      });

      const attPercent = totalDays > 0 ? Math.round(((totalPresent + totalLate + totalOnDuty) / totalDays) * 100) : 0;
      
      return {
        ...student,
        attendance: {
          present: totalPresent,
          late: totalLate,
          absent: totalAbsent,
          onDuty: totalOnDuty,
          total: totalDays,
          percentage: attPercent
        },
        marks: {
          internal: markCount > 0 ? Math.round(totalInt / markCount) : 0,
          external: markCount > 0 ? Math.round(totalExt / markCount) : 0,
          total: markCount > 0 ? Math.round((totalInt + totalExt) / markCount) : 0
        },
        subjectDetails: Object.values(subjectsMap)
      };
    });

    res.json(enrichedStudents);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching academic data' });
  }
};

// --- Bulk Upload ---
// Robust Excel Date Parser Helper
const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial number (days since 1900-01-01)
    const date = new Date((val - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const str = String(val).trim();
  // Try DD/MM/YYYY or DD-MM-YYYY format
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  // Try standard parse
  const parsedDate = new Date(str);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Helper to fetch key case-insensitively and whitespace-insensitively
const getRowValue = (row, possibleKeys) => {
  const keys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const cleanPKey = pKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanPKey) {
        return row[key];
      }
    }
  }
  return undefined;
};

// Robust helper to dynamically find header row and parse sheet
const parseSheetToJSON = (sheet) => {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length === 0) return [];
  
  // Keywords expected in headers
  const keywords = ['ber', 'dob', 'department', 'dept', 'batch', 'section', 'sec', 'name', 'no', 'mobile', 'email', 'roll', 'register', 'role'];
  
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    let matchCount = 0;
    for (const val of row) {
      if (val && typeof val === 'string') {
        const cleanVal = val.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (keywords.some(kw => cleanVal.includes(kw))) {
          matchCount++;
        }
      }
    }
    if (matchCount >= 2) {
      headerIndex = i;
      break;
    }
  }
  
  const headers = rows[headerIndex].map(h => String(h || '').trim());
  const result = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    if (row.every(val => val === null || val === undefined || String(val).trim() === '')) {
      continue;
    }
    const obj = {};
    headers.forEach((header, colIndex) => {
      if (header) {
        obj[header] = row[colIndex];
      }
    });
    result.push(obj);
  }
  return result;
};

exports.handleBulkUpload = async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    let data = [];
    let sheetName = '';
    
    // Find first sheet that yields non-empty rows
    for (const name of workbook.SheetNames) {
      const parsed = parseSheetToJSON(workbook.Sheets[name]);
      if (parsed.length > 0) {
        data = parsed;
        sheetName = name;
        break;
      }
    }
    
    // Fallback if no matching sheet was found
    if (data.length === 0 && workbook.SheetNames.length > 0) {
      sheetName = workbook.SheetNames[0];
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    let count = 0;

    if (type === 'users') {
      const salt = await bcrypt.genSalt(10);

      for (const row of data) {
        // Mapping fields from sheet to database
        const registerNumberVal = getRowValue(row, ['registerNumber', 'registerNo', 'regNo', 'ber', 'facultyId']);
        const registerNumber = registerNumberVal ? String(registerNumberVal).trim() : undefined;
        
        const nameVal = getRowValue(row, ['name', 'studentName', 'facultyName']);
        const name = nameVal ? String(nameVal).trim() : undefined;
        
        const rawEmail = getRowValue(row, ['email', 'emailId', 'emailAddress']);

        if (name) {
          const email = rawEmail ? String(rawEmail).trim() : (registerNumber ? `${registerNumber}@nit.edu` : `${String(name).toLowerCase().replace(/\s+/g, '')}@nit.edu`);
          
          let studentUser = null;
          if (registerNumber) {
            studentUser = await User.findOne({ registerNumber: registerNumber });
          }
          if (!studentUser) {
            studentUser = await User.findOne({ email: email });
          }

          let userRole = getRowValue(row, ['role']) || (getRowValue(row, ['facultyId']) || getRowValue(row, ['facultyName']) ? 'Faculty' : 'Student');
          const normalizedRole = String(userRole).trim().toLowerCase();
          if (normalizedRole === 'class advisor' || normalizedRole === 'class adviser') {
            userRole = 'Class Advisor';
          } else {
            userRole = String(userRole).charAt(0).toUpperCase() + String(userRole).slice(1).toLowerCase();
          }
          const allowedRoles = ['Admin', 'Principal', 'CoE', 'Faculty', 'Student', 'HoD', 'Other Staff', 'Class Advisor'];
          if (!allowedRoles.includes(userRole)) userRole = 'Student';

          let userGender = getRowValue(row, ['gender']);
          if (userGender) {
            userGender = String(userGender).charAt(0).toUpperCase() + String(userGender).slice(1).toLowerCase();
            if (!['Male', 'Female', 'Other'].includes(userGender)) userGender = undefined;
          }

          let userDob = getRowValue(row, ['dob', 'dateOfBirth', 'date']);
          let dobString = '';
          if (userDob) {
            const d = parseExcelDate(userDob);
            if (d) {
               userDob = d;
               const dd = String(d.getDate()).padStart(2, '0');
               const mm = String(d.getMonth() + 1).padStart(2, '0');
               const yyyy = d.getFullYear();
               dobString = `${dd}${mm}${yyyy}`;
            } else {
               userDob = new Date('2000-01-01');
               dobString = '01012000';
            }
          } else {
            userDob = new Date('2000-01-01');
            dobString = '01012000';
          }

          const departmentVal = getRowValue(row, ['department', 'dept']);
          const department = req.user.role === 'HoD' ? req.user.department : String(departmentVal || 'General').trim();
          
          const batchVal = getRowValue(row, ['batch']);
          const batch = batchVal ? String(batchVal).trim() : undefined;
          
          const sectionVal = getRowValue(row, ['section', 'sec']);
          const section = sectionVal ? String(sectionVal).trim() : undefined;

          let yearVal = getRowValue(row, ['year']);
          let semesterVal = getRowValue(row, ['semester']);
          let year = yearVal ? String(yearVal).trim() : undefined;
          let semester = semesterVal ? String(semesterVal).trim() : undefined;

          if ((!year || !semester) && batch) {
            const startYearMatch = batch.match(/^(\d{4})/);
            if (startYearMatch) {
              const startYear = parseInt(startYearMatch[1], 10);
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1; // 1-indexed month
              
              let calcYear, calcSem;
              if (currentMonth >= 6) { // June - December
                calcYear = currentYear - startYear + 1;
                calcSem = (calcYear * 2) - 1;
              } else { // January - May
                calcYear = currentYear - startYear;
                calcSem = calcYear * 2;
              }
              
              if (!year) year = String(Math.max(1, Math.min(4, calcYear)));
              if (!semester) semester = String(Math.max(1, Math.min(8, calcSem)));
            }
          }

          // Fallback default
          if (!year) year = '1';
          if (!semester) semester = '1';

          const mobile = getRowValue(row, ['mobileNo', 'mobile', 'mobileNumber', 'studentMobile']);
          const parentMobile = getRowValue(row, ['no', 'parentMobile', 'parentMobileNo', 'parentNo', 'guardianMobile']);
          const parentNameVal = getRowValue(row, ['parentName', 'guardianName']);

          if (studentUser) {
            // Update existing user details
            studentUser.name = name;
            if (rawEmail) studentUser.email = String(rawEmail).trim();
            studentUser.role = userRole;
            studentUser.department = department;
            studentUser.semester = semester;
            studentUser.year = year;
            studentUser.section = section;
            studentUser.batch = batch;
            if (registerNumber) studentUser.registerNumber = registerNumber;
            if (getRowValue(row, ['rollNumber', 'rollNo'])) {
              studentUser.rollNumber = String(getRowValue(row, ['rollNumber', 'rollNo'])).trim();
            }
            if (userGender) studentUser.gender = userGender;
            if (userDob) studentUser.dob = userDob;
            if (mobile) studentUser.mobile = String(mobile).trim();
            if (getRowValue(row, ['address'])) studentUser.address = String(getRowValue(row, ['address'])).trim();
            if (getRowValue(row, ['designation'])) studentUser.designation = String(getRowValue(row, ['designation'])).trim();
            if (getRowValue(row, ['qualification'])) studentUser.qualification = String(getRowValue(row, ['qualification'])).trim();
            
            studentUser.parentDetails = {
              name: parentNameVal ? String(parentNameVal).trim() : (studentUser.parentDetails?.name || 'Guardian'),
              mobile: parentMobile ? String(parentMobile).trim() : (studentUser.parentDetails?.mobile || '')
            };

            await studentUser.save();
            count++;
          } else {
            // Create new user
            const rawPassword = getRowValue(row, ['password']) || ((userRole === 'Student' || userRole === 'Faculty') && dobString ? dobString : 'password123');
            const hashedPassword = await bcrypt.hash(String(rawPassword), salt);

            await User.create({ 
               name: name, 
               email: email, 
               role: userRole, 
               password: hashedPassword,
               department: department,
               semester: semester,
               year: year,
               section: section,
               batch: batch,
               registerNumber: registerNumber,
               rollNumber: getRowValue(row, ['rollNumber', 'rollNo']) ? String(getRowValue(row, ['rollNumber', 'rollNo'])).trim() : undefined,
               gender: userGender,
               dob: userDob,
               mobile: mobile ? String(mobile).trim() : undefined,
               address: getRowValue(row, ['address']) ? String(getRowValue(row, ['address'])).trim() : undefined,
               designation: getRowValue(row, ['designation']) ? String(getRowValue(row, ['designation'])).trim() : undefined,
               qualification: getRowValue(row, ['qualification']) ? String(getRowValue(row, ['qualification'])).trim() : undefined,
               isActive: getRowValue(row, ['isActive']) !== undefined ? Boolean(getRowValue(row, ['isActive'])) : true,
               parentDetails: {
                 name: parentNameVal ? String(parentNameVal).trim() : 'Guardian',
                 mobile: parentMobile ? String(parentMobile).trim() : ''
               }
            });
            
            // Send welcome email
            const sendEmail = require('../utils/mailer');
            const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';
            const emailHtml = `
              <h2>Welcome to Smart Attendance System!</h2>
              <p>Dear ${name},</p>
              <p>Your account has been created successfully.</p>
              <p><strong>Login Details:</strong></p>
              <ul>
                ${registerNumber ? `<li><strong>Register Number / Username:</strong> ${registerNumber}</li>` : ''}
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Temporary Password:</strong> ${rawPassword}</li>
              </ul>
              <p>Please log in using your Register Number (or Email) and the temporary password.</p>
              <p><a href="${loginUrl}">Click here to Login</a></p>
              <p>For security purposes, you will be forced to change this password after your first login.</p>
            `;
            await sendEmail({
               to: email,
               subject: 'Welcome to Smart Attendance System - Login Details',
               html: emailHtml
            });

            count++;
          }
        }
      }
    } else if (type === 'subjects') {
      for (const row of data) {
        const name = row.name || row.Name || row['Subject Name'] || row.subjectName;
        const code = row.code || row.Code || row['Subject Code'] || row.subjectCode;
        if (name && code) {
          row.name = name;
          row.code = String(code);
          const exists = await Subject.findOne({ code: row.code });
          if (!exists) {
            let assignedFacultyIds = [];
            if (row.assignedFaculty) {
               const emails = String(row.assignedFaculty).split(',').map(e => e.trim());
               const faculties = await User.find({ email: { $in: emails }, role: { $in: ['Faculty', 'Class Advisor'] } });
               assignedFacultyIds = faculties.map(f => f._id);
            }
            await Subject.create({ 
              name: row.name, 
              code: row.code, 
              credits: row.credits || 3, 
              department: row.department || 'General',
              regulation: row.regulation ? String(row.regulation) : '2021',
              year: row.year ? String(row.year) : undefined,
              semester: row.semester ? String(row.semester) : undefined,
              subjectType: row.subjectType || row.type || row.Type || 'Theory',
              assignedFaculty: assignedFacultyIds,
              isActive: row.status ? (String(row.status).toLowerCase() === 'active') : (row.isActive !== undefined ? Boolean(row.isActive) : true)
            });
            count++;
          }
        }
      }
    } else if (type === 'timetable') {
      for (const row of data) {
        const dayOfWeek = row.dayOfWeek || row.day || row.Day;
        const startTime = row.startTime || row['Start Time'] || row.start_time;
        const endTime = row.endTime || row['End Time'] || row.end_time;
        const department = row.department || row.Department;
        const year = row.year || row.Year;
        const semester = row.semester || row.Semester;
        const section = row.section || row.Section;
        const period = row.period || row.Period;
        const subjectIdentifier = row.subjectCode || row['Subject Code'] || row.SubjectCode || row.subject || row.Subject;
        const facultyIdentifier = row.facultyId || row['Faculty ID'] || row.registerNumber || row.faculty || row.Faculty;
        const classroom = row.classroom || row.Classroom || row.room || row.Room;

        if (dayOfWeek && startTime && endTime && subjectIdentifier && facultyIdentifier && classroom) {
          let subjectRef = null;
          let facultyRef = null;

          const sub = await Subject.findOne({
            $or: [{ code: subjectIdentifier }, { name: subjectIdentifier }]
          });
          if (sub) subjectRef = sub._id;
          
          const fac = await User.findOne({
            role: { $in: ['Faculty', 'Class Advisor'] },
            $or: [{ registerNumber: facultyIdentifier }, { name: facultyIdentifier }]
          });
          if (fac) facultyRef = fac._id;

          if (subjectRef && facultyRef) {
            const clash = await Timetable.findOne({
              dayOfWeek, startTime,
              $or: [{ faculty: facultyRef }, { classroom }]
            });

            if (!clash) {
              await Timetable.create({
                department: String(department || 'General'),
                year: String(year || '1'),
                semester: String(semester || '1'),
                section: String(section || 'A'),
                dayOfWeek: String(dayOfWeek),
                period: period ? String(period) : undefined,
                subject: subjectRef,
                faculty: facultyRef,
                classroom: String(classroom),
                startTime: String(startTime),
                endTime: String(endTime),
                isActive: true
              });
              count++;
            }
          }
        }
      }
    } else if (type === 'calendar') {
      for (const row of data) {
        // Handle case-insensitive keys
        const rawDate = row.date || row.Date;
        const typeVal = row.type || row.Type;
        const descVal = row.description || row.Description || row.Desc;
        const termVal = row.term || row.Term || 'Fall';

        if (rawDate && typeVal && descVal) {
          let parsedDate;
          
          // Check if it's an Excel serial date number
          if (typeof rawDate === 'number') {
            // Excel dates are number of days since Jan 1 1900.
            parsedDate = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
          } else if (typeof rawDate === 'string') {
            // Handle DD-MM-YYYY or DD/MM/YYYY
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              // Assumes DD-MM-YYYY
              parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              parsedDate = new Date(rawDate);
            }
          }

          if (parsedDate && !isNaN(parsedDate.getTime())) {
            await AcademicCalendar.create({
              date: parsedDate,
              type: typeVal,
              description: descVal,
              term: termVal
            });
            count++;
          }
        }
      }
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid upload type' });
    }

    fs.unlinkSync(req.file.path);
    res.status(200).json({ message: `Successfully uploaded and inserted ${count} records for ${type}.` });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    const fsLib = require('fs');
    fsLib.appendFileSync('error_log.txt', new Date().toISOString() + '\\n' + (error.stack || error) + '\\n\\n');
    console.error('Bulk Upload Error:', error);
    res.status(500).json({ message: 'Error processing bulk upload', error: error.message, stack: error.stack });
  }
};

exports.getAttendanceMonitoringData = async (req, res) => {
  try {
    const { department, year, semester, section, subject, faculty, date, period } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const activeDept = req.user.role === 'HoD' ? req.user.department : department;

    let userQuery = { role: 'Student' };
    if (activeDept) userQuery.department = activeDept;
    if (year) userQuery.year = String(year);
    if (semester) userQuery.semester = String(semester);
    if (section) userQuery.section = String(section);

    const students = await User.find(userQuery).select('_id');
    const studentIds = students.map(s => s._id);

    let sessionMatch = { date: { $gte: targetDate, $lt: nextDay } };
    if (period) {
      const timetableQuery = { period };
      if (activeDept) timetableQuery.department = activeDept;
      const matchingTimetables = await Timetable.find(timetableQuery).select('_id');
      const timetableIds = matchingTimetables.map(t => t._id);
      sessionMatch.$or = [
        { period: period },
        { timetable: { $in: timetableIds } }
      ];
    }
    const mongoose = require('mongoose');
    if (faculty) {
      const facObj = await User.findById(faculty);
      if (req.user.role === 'HoD' && facObj && facObj.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied: Faculty belongs to another department' });
      }
      sessionMatch.faculty = new mongoose.Types.ObjectId(faculty);
    }
    if (subject) {
      const subObj = await Subject.findById(subject);
      if (req.user.role === 'HoD' && subObj && subObj.department !== req.user.department) {
        return res.status(403).json({ message: 'Access denied: Subject belongs to another department' });
      }
      sessionMatch.subject = new mongoose.Types.ObjectId(subject);
    } else if (activeDept) {
      const subjectsInDept = await Subject.find({ department: activeDept }).select('_id');
      const subjectIds = subjectsInDept.map(s => s._id);
      sessionMatch.subject = { $in: subjectIds };
    }

    let timetableMatch = {};
    if (activeDept) timetableMatch.department = activeDept;
    if (year) timetableMatch.year = String(year);
    if (semester) timetableMatch.semester = String(semester);
    if (section) timetableMatch.section = String(section);

    if (Object.keys(timetableMatch).length > 0) {
      const matchedTimetables = await Timetable.find(timetableMatch).select('_id');
      const timetableIds = matchedTimetables.map(t => t._id);
      sessionMatch.timetable = { $in: timetableIds };
    }

    const sessions = await Session.find(sessionMatch)
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .populate('timetable', 'period startTime endTime department year semester section')
      .lean();

    const sessionIds = sessions.map(s => s._id);

    const detailedAttendanceRecords = await Attendance.find({ session: { $in: sessionIds } })
      .populate('student', 'name registerNumber rollNumber department')
      .lean();

    const dailyClasses = sessions.map(session => {
       const sessionRecords = detailedAttendanceRecords.filter(r => r.session.toString() === session._id.toString());
       
       let presentCount = 0;
       let lateCount = 0;
       let absentCount = 0;
       let onDutyCount = 0;
       let studentsList = [];

       sessionRecords.forEach(record => {
         if (record.status === 'Present') presentCount++;
         else if (record.status === 'Late') lateCount++;
         else if (record.status === 'Absent') absentCount++;
         else if (record.status === 'On-Duty') onDutyCount++;

         studentsList.push({
           id: record.student._id,
           name: record.student.name,
           registerNumber: record.student.registerNumber,
           rollNumber: record.student.rollNumber,
           department: record.student.department,
           status: record.status,
           markedAt: record.markedAt
         });
       });

       return {
         sessionId: session._id,
         subject: `${session.subject?.name} (${session.subject?.code})`,
         faculty: session.faculty?.name,
         department: session.timetable?.department,
         year: session.timetable?.year,
         semester: session.timetable?.semester,
         section: session.timetable?.section,
         period: session.period || session.timetable?.period || `${session.timetable?.startTime} - ${session.timetable?.endTime}`,
         totalStudents: studentsList.length,
         presentCount: presentCount + lateCount + onDutyCount,
         absentCount,
         leaveCount: 0,
         attendancePercentage: studentsList.length > 0 ? Math.round(((presentCount + lateCount + onDutyCount) / studentsList.length) * 100) : 0,
         students: studentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
       };
    });

    let attendanceMatch = { student: { $in: studentIds }, date: { $gte: targetDate, $lt: nextDay } };
    if (subject) attendanceMatch.subject = new mongoose.Types.ObjectId(subject);

    const [totalPresent, totalLate, totalAbsent, totalOnDuty, totalCount] = await Promise.all([
      Attendance.countDocuments({ ...attendanceMatch, status: 'Present' }),
      Attendance.countDocuments({ ...attendanceMatch, status: 'Late' }),
      Attendance.countDocuments({ ...attendanceMatch, status: 'Absent' }),
      Attendance.countDocuments({ ...attendanceMatch, status: 'On-Duty' }),
      Attendance.countDocuments(attendanceMatch)
    ]);

    const overallPercentage = totalCount > 0 ? Math.round(((totalPresent + totalLate + totalOnDuty) / totalCount) * 100) : 0;

    const now = new Date();
    const missingSessions = await Session.find({
      ...sessionMatch,
      expiresAt: { $lt: now },
      locked: false
    }).populate('faculty', 'name').populate('subject', 'name code').lean();

    const deptStats = await Attendance.aggregate([
      { $match: attendanceMatch },
      {
         $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'stu' }
      },
      { $unwind: '$stu' },
      {
         $group: {
           _id: '$stu.department',
           present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
           late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
           onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
           total: { $sum: 1 }
         }
      }
    ]);

    const departmentWise = deptStats.map(d => ({
      department: d._id || 'Unknown',
      percentage: d.total > 0 ? Math.round(((d.present + d.late + d.onDuty) / d.total) * 100) : 0
    }));

    const studentStats = await Attendance.aggregate([
       { $match: attendanceMatch },
       {
          $group: {
            _id: '$student',
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
            onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
            total: { $sum: 1 }
          }
       },
       {
          $project: {
             percentage: {
               $cond: [ { $gt: ['$total', 0] }, { $multiply: [ { $divide: [ { $add: ['$present', '$late', '$onDuty'] }, '$total' ] }, 100 ] }, 0 ]
             }
          }
       },
       { $match: { percentage: { $lt: 75 } } },
       {
          $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'stuDetails' }
       },
       { $unwind: '$stuDetails' }
    ]);

    const lowAttendanceStudents = studentStats.map(s => ({
      id: s._id,
      name: s.stuDetails.name,
      registerNumber: s.stuDetails.registerNumber,
      department: s.stuDetails.department,
      percentage: Math.round(s.percentage)
    }));
    
    const subjectWise = await Attendance.aggregate([
      { $match: attendanceMatch },
      {
         $lookup: { from: 'subjects', localField: 'subject', foreignField: '_id', as: 'subDetails' }
      },
      { $unwind: { path: '$subDetails', preserveNullAndEmptyArrays: true } },
      {
         $group: {
           _id: '$subject',
           name: { $first: '$subDetails.name' },
           code: { $first: '$subDetails.code' },
           present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
           late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
           absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
           onDuty: { $sum: { $cond: [{ $eq: ['$status', 'On-Duty'] }, 1, 0] } },
           total: { $sum: 1 }
         }
      }
    ]);
    
    const subjectWiseStats = subjectWise.map(s => ({
       subjectId: s._id,
       subject: `${s.name || 'Unknown'} (${s.code || '?'})`,
       present: s.present,
       late: s.late,
       absent: s.absent,
       total: s.total,
       percentage: s.total > 0 ? Math.round(((s.present + s.late + s.onDuty) / s.total) * 100) : 0
    }));

    let classRoster = [];
    if (department && year && semester && section) {
      const classStudents = await User.find({
        role: 'Student',
        department,
        year: String(year),
        semester: String(semester),
        section: String(section)
      }).lean();

      const rosterAttendance = await Attendance.find({
        student: { $in: classStudents.map(s => s._id) }
      }).populate('subject', 'name').lean();

      classRoster = classStudents.map(student => {
        const myRecords = rosterAttendance.filter(r => r.student.toString() === student._id.toString());
        
        let present = 0;
        let late = 0;
        let absent = 0;
        let onDuty = 0;
        let subjectsMap = {};

        myRecords.forEach(r => {
           if (r.status === 'Present') present++;
           else if (r.status === 'Late') late++;
           else if (r.status === 'Absent') absent++;
           else if (r.status === 'On-Duty') onDuty++;

           const subName = r.subject?.name || 'Unknown';
           if (!subjectsMap[subName]) subjectsMap[subName] = { present: 0, total: 0 };
           subjectsMap[subName].total++;
           if (r.status === 'Present' || r.status === 'Late' || r.status === 'On-Duty') subjectsMap[subName].present++;
        });

        const total = present + late + absent + onDuty;
        
        return {
          id: student._id,
          name: student.name,
          registerNumber: student.registerNumber,
          totalWorkingDays: total,
          presentDays: present + late + onDuty,
          absentDays: absent,
          leaveCount: 0,
          overallPercentage: total > 0 ? Math.round(((present + late + onDuty) / total) * 100) : 0,
          subjectWise: Object.keys(subjectsMap).map(sub => ({
             subject: sub,
             percentage: Math.round((subjectsMap[sub].present / subjectsMap[sub].total) * 100)
          }))
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({
      overview: {
        overallPercentage,
        totalPresent,
        totalLate,
        totalAbsent,
        totalCount
      },
      dailyClasses,
      missingSessions,
      departmentWise,
      lowAttendanceStudents,
      subjectWiseStats,
      classRoster
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching attendance monitoring data' });
  }
};



exports.generateReport = async (req, res) => {
  try {
    let query = { role: 'Student' };
    if (req.user.role === 'HoD') {
      query.department = req.user.department;
    }

    const students = await User.find(query).select('name registerNumber rollNumber department year semester section').lean();
    const studentIds = students.map(s => s._id);

    // Fetch all attendance for these students
    const attendanceRecords = await Attendance.find({ student: { $in: studentIds } }).lean();

    const reportData = students.map(student => {
      const myRecords = attendanceRecords.filter(r => r.student.toString() === student._id.toString());
      const total = myRecords.length;
      const present = myRecords.filter(r => ['Present', 'Late', 'On-Duty'].includes(r.status)).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        'Register Number': student.registerNumber || '-',
        'Roll Number': student.rollNumber || '-',
        'Name': student.name,
        'Department': student.department || '-',
        'Year': student.year || '-',
        'Semester': student.semester || '-',
        'Section': student.section || '-',
        'Total Sessions': total,
        'Sessions Attended': present,
        'Attendance Percentage (%)': `${pct}%`
      };
    });

    const ws = xlsx.utils.json_to_sheet(reportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance Summary');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    console.error('generateReport error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { message, target } = req.body;
    const Notification = require('../models/Notification');
    const User = require('../models/User');

    // Build user search query based on targeting criteria and role-based permissions
    let query = { isActive: true };

    if (req.user.role === 'HoD') {
      // HODs can only send notifications to their own department
      query.department = req.user.department;
      if (target === 'students') {
        query.role = 'Student';
      } else if (target === 'faculty') {
        query.role = 'Faculty';
      } else {
        // Broad departmental scope: HOD can broadcast to staff and students in their department
        query.role = { $in: ['Student', 'Faculty'] };
      }
    } else {
      // Admin / Principal / CoE can target overall college or specific roles
      if (target === 'hods') {
        query.role = 'HoD';
      } else if (target === 'students') {
        query.role = 'Student';
      } else if (target === 'faculty') {
        query.role = 'Faculty';
      }
    }

    const users = await User.find(query).select('_id');

    const notifications = users.map(user => ({
      user: user._id,
      message,
      type: 'Info'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    let targetLabel = 'overall college';
    if (req.user.role === 'HoD') {
      if (target === 'students') targetLabel = `students in ${req.user.department} department`;
      else if (target === 'faculty') targetLabel = `faculty in ${req.user.department} department`;
      else targetLabel = `all staff & students in ${req.user.department} department`;
    } else {
      if (target === 'hods') targetLabel = 'all HoDs';
      else if (target === 'students') targetLabel = 'all Students';
      else if (target === 'faculty') targetLabel = 'all Faculty';
    }

    res.status(201).json({ 
      message: `Notification broadcasted to ${targetLabel} successfully`, 
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
};

exports.getSystemSettings = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system settings' });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const { automatedBackups, strictGeofencing, strictDeviceBinding, reason } = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    const oldValue = {
      automatedBackups: settings.automatedBackups,
      strictGeofencing: settings.strictGeofencing,
      strictDeviceBinding: settings.strictDeviceBinding
    };

    if (automatedBackups !== undefined) settings.automatedBackups = automatedBackups;
    if (strictGeofencing !== undefined) settings.strictGeofencing = strictGeofencing;
    if (strictDeviceBinding !== undefined) settings.strictDeviceBinding = strictDeviceBinding;
    await settings.save();

    // Audit Log
    await createLog('Updated System Settings', req.user, 'Settings', settings._id, {
      oldValue,
      newValue: {
        automatedBackups: settings.automatedBackups,
        strictGeofencing: settings.strictGeofencing,
        strictDeviceBinding: settings.strictDeviceBinding
      },
      reason: reason || 'Administrative configuration update',
      details: 'Updated global system security and backup configurations'
    });

    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error saving settings' });
  }
};

exports.getStudentAttendanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id).select('-password').lean();
    if (!student || student.role !== 'Student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.role === 'HoD' && student.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized to view students of this department.' });
    }

    if (req.user.role === 'Faculty') {
      const facultyUser = await User.findById(req.user.id);
      if (facultyUser && facultyUser.classAdvisorDetails && facultyUser.classAdvisorDetails.isClassAdvisor) {
        const adv = facultyUser.classAdvisorDetails;
        if (student.department !== adv.department || student.year !== adv.year || student.section !== adv.section) {
          return res.status(403).json({ message: 'Not authorized: You can only view details of your advised class.' });
        }
      } else {
        return res.status(403).json({ message: 'Only Class Advisors can view student details.' });
      }
    }

    const attendanceRecords = await Attendance.find({ student: id })
      .populate({
        path: 'subject',
        select: 'name code assignedFaculty',
        populate: { path: 'assignedFaculty', select: 'name' }
      })
      .populate({
        path: 'session',
        populate: { path: 'timetable', select: 'period startTime endTime classroom' }
      })
      .sort({ date: -1 })
      .lean();

    const subjectsMap = {};
    attendanceRecords.forEach(rec => {
      const subId = rec.subject ? rec.subject._id.toString() : 'Unknown';
      if (!subjectsMap[subId]) {
        subjectsMap[subId] = {
          name: rec.subject?.name || 'Unknown',
          code: rec.subject?.code || 'Unknown',
          faculty: rec.subject?.assignedFaculty?.map(f => f.name).join(', ') || 'N/A',
          present: 0,
          late: 0,
          absent: 0,
          onDuty: 0,
          total: 0
        };
      }
      subjectsMap[subId].total++;
      if (rec.status === 'Present') subjectsMap[subId].present++;
      else if (rec.status === 'Late') subjectsMap[subId].late++;
      else if (rec.status === 'Absent') subjectsMap[subId].absent++;
      else if (rec.status === 'On-Duty') subjectsMap[subId].onDuty++;
    });

    const subjectWise = Object.values(subjectsMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.late + s.onDuty) / s.total) * 100) : 0
    }));

    const monthlyMap = {};
    attendanceRecords.forEach(rec => {
      if (rec.date) {
        const dateObj = new Date(rec.date);
        const monthName = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyMap[monthName]) {
          monthlyMap[monthName] = { month: monthName, present: 0, total: 0 };
        }
        monthlyMap[monthName].total++;
        if (['Present', 'Late', 'On-Duty'].includes(rec.status)) {
          monthlyMap[monthName].present++;
        }
      }
    });

    const monthlyAttendance = Object.values(monthlyMap).map(m => ({
      ...m,
      percentage: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0
    }));

    const dateWise = attendanceRecords.map(rec => ({
      _id: rec._id,
      date: rec.date,
      subject: rec.subject?.name || 'Unknown',
      code: rec.subject?.code || 'Unknown',
      period: rec.session?.timetable?.period || 'N/A',
      classroom: rec.session?.timetable?.classroom || 'N/A',
      status: rec.status,
      markedBy: rec.markedBy,
      entryType: rec.entryType
    }));

    // Construct Daily Timeline H1-H7
    const dailyTimelineMap = {};
    attendanceRecords.forEach(rec => {
      if (rec.date) {
        const dateStr = new Date(rec.date).toISOString().split('T')[0];
        if (!dailyTimelineMap[dateStr]) {
          dailyTimelineMap[dateStr] = { date: dateStr, H1: '-', H2: '-', H3: '-', H4: '-', H5: '-', H6: '-', H7: '-' };
        }
        const p = rec.session?.timetable?.period; // e.g. "H1", "H2", etc.
        let statusChar = '-';
        if (rec.status === 'Present') statusChar = 'P';
        else if (rec.status === 'Absent') statusChar = 'A';
        else if (rec.status === 'Late') statusChar = 'L';
        else if (rec.status === 'On-Duty') statusChar = 'OD';
        
        if (p && dailyTimelineMap[dateStr].hasOwnProperty(p)) {
          dailyTimelineMap[dateStr][p] = statusChar;
        }
      }
    });

    // Merge Holidays
    const holidays = await AcademicCalendar.find({ type: 'Holiday' }).lean();
    holidays.forEach(h => {
      const dateStr = new Date(h.date).toISOString().split('T')[0];
      dailyTimelineMap[dateStr] = { date: dateStr, H1: 'H', H2: 'H', H3: 'H', H4: 'H', H5: 'H', H6: 'H', H7: 'H' };
    });

    const dailyTimeline = Object.values(dailyTimelineMap).sort((a, b) => b.date.localeCompare(a.date));

    let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalOnDuty = 0;
    attendanceRecords.forEach(rec => {
      if (rec.status === 'Present') totalPresent++;
      else if (rec.status === 'Late') totalLate++;
      else if (rec.status === 'Absent') totalAbsent++;
      else if (rec.status === 'On-Duty') totalOnDuty++;
    });

    const totalDays = attendanceRecords.length;
    const overallPercentage = totalDays > 0 ? Math.round(((totalPresent + totalLate + totalOnDuty) / totalDays) * 100) : 0;

    const AdvisorRecord = require('../models/AdvisorRecord');
    const advisorLogs = await AdvisorRecord.find({ student: id })
      .populate('advisor', 'name email department')
      .sort({ date: -1 })
      .lean();

    res.json({
      student,
      overall: {
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent,
        onDuty: totalOnDuty,
        total: totalDays,
        percentage: overallPercentage
      },
      subjectWise,
      monthly: monthlyAttendance,
      dateWise,
      dailyTimeline,
      advisorLogs: advisorLogs || []
    });
  } catch (error) {
    console.error('getStudentAttendanceDetails error:', error);
    res.status(500).json({ message: 'Error fetching student detailed attendance' });
  }
};

exports.updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, reason } = req.body;

    const record = await Attendance.findById(id).populate('student', 'name registerNumber department semester section');
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    const oldStatus = record.status;
    record.status = status;
    if (remarks !== undefined) record.remarks = remarks;
    record.updatedBy = req.user.id;
    record.markedAt = new Date();
    await record.save();

    // Audit Log
    await createLog('Edit Student Attendance', req.user, 'Attendance', record._id, {
      oldValue: oldStatus,
      newValue: status,
      reason: reason || remarks || 'Direct attendance correction',
      targetDept: record.student?.department || 'General',
      targetSemester: record.student?.semester,
      targetSection: record.student?.section,
      student: record.student?._id || record.student,
      details: `Updated attendance record for ${record.student?.name || 'student'} to ${status}`
    });

    res.json({ message: 'Attendance record updated successfully', record });
  } catch (error) {
    console.error('updateAttendanceRecord error:', error);
    res.status(500).json({ message: 'Error updating attendance record' });
  }
};

// --- Class Advisor Statistics ---
exports.getAdvisorStats = async (req, res) => {
  try {
    const isClassAdvisor = req.user.classAdvisorDetails && req.user.classAdvisorDetails.isClassAdvisor;
    if (!isClassAdvisor && req.user.role !== 'Admin' && req.user.role !== 'HoD') {
      return res.status(403).json({ message: 'Not authorized: Access is restricted to Class Advisors.' });
    }

    let adv = req.user.classAdvisorDetails;
    if (req.user.role === 'HoD' || req.user.role === 'Admin') {
      // Allow HOD or Admin to view advisor stats by passing query parameters
      adv = {
        department: req.query.department || req.user.department,
        year: req.query.year || '1',
        semester: req.query.semester || '1',
        section: req.query.section || 'A'
      };
    }

    // 1. Fetch Students
    const students = await User.find({
      role: 'Student',
      department: adv.department,
      year: adv.year,
      semester: adv.semester,
      section: adv.section
    }).select('_id name registerNumber rollNumber email mobile parentDetails').lean();

    const totalStudents = students.length;
    const studentIds = students.map(s => s._id);

    // 2. Fetch Attendance Records
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds }
    }).lean();

    let presentCount = 0;
    const studentStatsMap = {};
    studentIds.forEach(id => {
      studentStatsMap[id.toString()] = { present: 0, total: 0 };
    });

    attendanceRecords.forEach(rec => {
      const sId = rec.student.toString();
      if (studentStatsMap[sId]) {
        studentStatsMap[sId].total++;
        if (['Present', 'Late', 'On-Duty'].includes(rec.status)) {
          studentStatsMap[sId].present++;
          presentCount++;
        }
      }
    });

    const classAttendancePercentage = attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : 0;

    // 3. Defaulters (< 75%) and At-Risk (75% to 80%)
    const defaulters = [];
    const atRisk = [];

    students.forEach(s => {
      const sId = s._id.toString();
      const stats = studentStatsMap[sId];
      const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

      const studentData = {
        _id: s._id,
        name: s.name,
        registerNumber: s.registerNumber,
        rollNumber: s.rollNumber,
        email: s.email,
        mobile: s.mobile,
        parentName: s.parentDetails?.name,
        parentMobile: s.parentDetails?.mobile,
        attendancePercentage: pct,
        totalClasses: stats.total,
        classesAttended: stats.present
      };

      if (pct < 75) {
        defaulters.push(studentData);
      } else if (pct < 80) {
        atRisk.push(studentData);
      }
    });

    // 4. Top Performing Students (By average Marks)
    const marks = await Mark.find({ student: { $in: studentIds } }).lean();
    const studentMarksMap = {};
    studentIds.forEach(id => {
      studentMarksMap[id.toString()] = [];
    });
    marks.forEach(m => {
      const sId = m.student.toString();
      if (studentMarksMap[sId]) {
        studentMarksMap[sId].push(m.total);
      }
    });

    const topPerforming = students.map(s => {
      const sId = s._id.toString();
      const mList = studentMarksMap[sId] || [];
      const avg = mList.length > 0 ? Math.round(mList.reduce((a, b) => a + b, 0) / mList.length) : 0;
      return {
        _id: s._id,
        name: s.name,
        registerNumber: s.registerNumber,
        averageMark: avg
      };
    })
    .filter(s => s.averageMark > 0)
    .sort((a, b) => b.averageMark - a.averageMark)
    .slice(0, 5);

    // 5. Pending Leave Requests
    const pendingLeaves = await Request.find({
      requestedBy: { $in: studentIds },
      targetModel: 'Leave',
      status: 'Pending'
    }).populate('requestedBy', 'name registerNumber').lean();

    // 6. Trend Map (date-wise percentage)
    const trendMap = {};
    attendanceRecords.forEach(rec => {
      if (rec.date) {
        const dStr = new Date(rec.date).toISOString().split('T')[0];
        if (!trendMap[dStr]) trendMap[dStr] = { present: 0, total: 0 };
        trendMap[dStr].total++;
        if (['Present', 'Late', 'On-Duty'].includes(rec.status)) {
          trendMap[dStr].present++;
        }
      }
    });

    const attendanceTrends = Object.keys(trendMap)
      .sort()
      .map(dStr => ({
        date: dStr,
        percentage: trendMap[dStr].total > 0 ? Math.round((trendMap[dStr].present / trendMap[dStr].total) * 100) : 0
      }))
      .slice(-10); // Last 10 working days

    res.json({
      success: true,
      classDetails: adv,
      statistics: {
        totalStudents,
        classAttendancePercentage,
        defaultersCount: defaulters.length,
        atRiskCount: atRisk.length,
        pendingLeavesCount: pendingLeaves.length
      },
      defaulters,
      atRisk,
      topPerforming,
      pendingLeaves,
      attendanceTrends
    });
  } catch (error) {
    console.error('getAdvisorStats error:', error);
    res.status(500).json({ message: 'Error compiling class stats.' });
  }
};

// --- Class Advisor Counseling/Mentorship Records ---
exports.getAdvisorRecords = async (req, res) => {
  try {
    const AdvisorRecord = require('../models/AdvisorRecord');
    let query = {};

    if (req.user.role === 'Faculty') {
      query.advisor = req.user.id;
    } else if (req.user.role === 'HoD') {
      const students = await User.find({ role: 'Student', department: req.user.department }).select('_id');
      const studentIds = students.map(s => s._id);
      query.$or = [
        { student: { $in: studentIds } },
        { isEscalatedToHOD: true }
      ];
    } else if (['Admin', 'Principal', 'CoE'].includes(req.user.role)) {
      // Core staff can see all logs
    } else {
      return res.status(403).json({ message: 'Access Denied.' });
    }

    const records = await AdvisorRecord.find(query)
      .populate('student', 'name registerNumber rollNumber department year semester section parentDetails')
      .populate('advisor', 'name email department')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    console.error('getAdvisorRecords error:', error);
    res.status(500).json({ message: 'Error retrieving advisor logs.' });
  }
};

exports.createAdvisorRecord = async (req, res) => {
  try {
    const AdvisorRecord = require('../models/AdvisorRecord');
    const { student, type, title, description, date, status, actionTaken, remarks, isEscalatedToHOD, escalationRemarks, parentName, parentMobile } = req.body;

    const record = new AdvisorRecord({
      student,
      advisor: req.user.id,
      type,
      title,
      description,
      date: date || new Date(),
      status: status || 'Open',
      actionTaken,
      remarks,
      isEscalatedToHOD: isEscalatedToHOD || false,
      escalationRemarks,
      parentName,
      parentMobile
    });

    await record.save();

    const populatedRecord = await AdvisorRecord.findById(record._id)
      .populate('student', 'name registerNumber department semester section')
      .populate('advisor', 'name');

    // Audit Log
    await createLog(`Created Class Advisor Record: ${type}`, req.user, 'AdvisorRecord', record._id, {
      newValue: record,
      reason: 'Advisor record entry',
      targetDept: populatedRecord.student?.department || 'General',
      targetSemester: populatedRecord.student?.semester,
      targetSection: populatedRecord.student?.section,
      student: populatedRecord.student?._id,
      details: `Advisor ${populatedRecord.advisor?.name} logged a ${type} record for student ${populatedRecord.student?.name}: "${title}"`
    });

    // Notify HOD if escalated
    if (isEscalatedToHOD) {
      const hods = await User.find({ role: 'HoD', department: populatedRecord.student?.department }).select('_id');
      if (hods.length > 0) {
        const notifications = hods.map(hod => ({
          user: hod._id,
          message: `Class Advisor ${req.user.name} escalated a ${type} concern regarding student ${populatedRecord.student?.name} (${populatedRecord.student?.registerNumber}): "${title}"`,
          type: 'Warning'
        }));
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json(populatedRecord);
  } catch (error) {
    console.error('createAdvisorRecord error:', error);
    res.status(500).json({ message: 'Error logging advisor record.' });
  }
};

exports.updateAdvisorRecord = async (req, res) => {
  try {
    const AdvisorRecord = require('../models/AdvisorRecord');
    const { id } = req.params;
    const { type, title, description, date, status, actionTaken, remarks, isEscalatedToHOD, escalationRemarks, parentName, parentMobile } = req.body;

    const existingRecord = await AdvisorRecord.findById(id).populate('student', 'name registerNumber department semester section');
    if (!existingRecord) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    if (req.user.role === 'Faculty' && existingRecord.advisor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized: You can only edit your own logged records.' });
    }

    const oldValue = {
      type: existingRecord.type,
      title: existingRecord.title,
      description: existingRecord.description,
      status: existingRecord.status,
      actionTaken: existingRecord.actionTaken,
      remarks: existingRecord.remarks,
      isEscalatedToHOD: existingRecord.isEscalatedToHOD,
      escalationRemarks: existingRecord.escalationRemarks
    };

    existingRecord.type = type || existingRecord.type;
    existingRecord.title = title || existingRecord.title;
    existingRecord.description = description || existingRecord.description;
    existingRecord.date = date || existingRecord.date;
    existingRecord.status = status || existingRecord.status;
    existingRecord.actionTaken = actionTaken !== undefined ? actionTaken : existingRecord.actionTaken;
    existingRecord.remarks = remarks !== undefined ? remarks : existingRecord.remarks;

    const wasEscalated = existingRecord.isEscalatedToHOD;
    existingRecord.isEscalatedToHOD = isEscalatedToHOD !== undefined ? isEscalatedToHOD : existingRecord.isEscalatedToHOD;
    existingRecord.escalationRemarks = escalationRemarks !== undefined ? escalationRemarks : existingRecord.escalationRemarks;
    existingRecord.parentName = parentName !== undefined ? parentName : existingRecord.parentName;
    existingRecord.parentMobile = parentMobile !== undefined ? parentMobile : existingRecord.parentMobile;

    await existingRecord.save();

    const populatedRecord = await AdvisorRecord.findById(id)
      .populate('student', 'name registerNumber department semester section')
      .populate('advisor', 'name');

    // Audit log
    await createLog(`Updated Class Advisor Record: ${type}`, req.user, 'AdvisorRecord', id, {
      oldValue,
      newValue: existingRecord,
      reason: 'Advisor record update',
      targetDept: populatedRecord.student?.department || 'General',
      targetSemester: populatedRecord.student?.semester,
      targetSection: populatedRecord.student?.section,
      student: populatedRecord.student?._id,
      details: `Advisor ${populatedRecord.advisor?.name} updated a ${type} record for student ${populatedRecord.student?.name}: "${title}"`
    });

    // Notify HOD if escalated now but not before
    if (existingRecord.isEscalatedToHOD && !wasEscalated) {
      const hods = await User.find({ role: 'HoD', department: populatedRecord.student?.department }).select('_id');
      if (hods.length > 0) {
        const notifications = hods.map(hod => ({
          user: hod._id,
          message: `Class Advisor ${req.user.name} escalated a ${type} concern regarding student ${populatedRecord.student?.name} (${populatedRecord.student?.registerNumber}): "${title}"`,
          type: 'Warning'
        }));
        await Notification.insertMany(notifications);
      }
    }

    res.json(populatedRecord);
  } catch (error) {
    console.error('updateAdvisorRecord error:', error);
    res.status(500).json({ message: 'Error updating advisor record.' });
  }
};

exports.deleteAdvisorRecord = async (req, res) => {
  try {
    const AdvisorRecord = require('../models/AdvisorRecord');
    const { id } = req.params;

    const record = await AdvisorRecord.findById(id).populate('student', 'name registerNumber department semester section');
    if (!record) return res.status(404).json({ message: 'Record not found.' });

    if (req.user.role === 'Faculty' && record.advisor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized: You can only delete your own logged records.' });
    }

    await AdvisorRecord.findByIdAndDelete(id);

    // Audit log
    await createLog(`Deleted Class Advisor Record`, req.user, 'AdvisorRecord', id, {
      oldValue: record,
      reason: 'Advisor record deletion',
      targetDept: record.student?.department || 'General',
      targetSemester: record.student?.semester,
      targetSection: record.student?.section,
      student: record.student?._id,
      details: `Deleted advisor record for student ${record.student?.name || 'unknown'}`
    });

    res.json({ message: 'Advisor record deleted successfully' });
  } catch (error) {
    console.error('deleteAdvisorRecord error:', error);
    res.status(500).json({ message: 'Error deleting advisor record.' });
  }
};

// --- Class Advisor Communication Dispatcher ---
exports.createAdvisorCommunication = async (req, res) => {
  try {
    const AdvisorCommunication = require('../models/AdvisorCommunication');
    const { recipient, recipientType, type, subject, content, isHODEscalation } = req.body;

    let targetClass = {};
    if (req.user.role === 'Faculty' && req.user.classAdvisorDetails?.isClassAdvisor) {
      const adv = req.user.classAdvisorDetails;
      targetClass = {
        department: adv.department,
        year: adv.year,
        semester: adv.semester,
        section: adv.section
      };
    }

    const comm = new AdvisorCommunication({
      sender: req.user.id,
      recipient: recipientType === 'ClassBroadcast' ? undefined : recipient,
      recipientType,
      targetClass,
      type,
      subject,
      content,
      isHODEscalation: isHODEscalation || false
    });

    await comm.save();

    // Create corresponding Notification alerts
    const notifications = [];
    if (recipientType === 'ClassBroadcast') {
      const students = await User.find({
        role: 'Student',
        department: targetClass.department,
        year: targetClass.year,
        semester: targetClass.semester,
        section: targetClass.section
      }).select('_id');

      students.forEach(student => {
        notifications.push({
          user: student._id,
          message: `[Class Broadcast] ${subject}: ${content.substring(0, 100)}...`,
          type: 'Info'
        });
      });
    } else if (recipientType === 'Student' || recipientType === 'Parent') {
      notifications.push({
        user: recipient,
        message: `[Class Advisor Notification] ${subject}: ${content.substring(0, 100)}...`,
        type: type === 'AttendanceWarning' ? 'Warning' : 'Info'
      });
    } else if (recipientType === 'HOD' || isHODEscalation) {
      const studentProfile = await User.findById(recipient).select('name registerNumber department');
      const hods = await User.find({ role: 'HoD', department: studentProfile?.department || req.user.department }).select('_id');
      hods.forEach(hod => {
        notifications.push({
          user: hod._id,
          message: `[Advisor Escalation] ${req.user.name} forwarded concern regarding ${studentProfile?.name || 'student'}: ${subject}`,
          type: 'Alert'
        });
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // System log
    await createLog('Created Advisor Communication', req.user, 'AdvisorCommunication', comm._id, {
      newValue: comm,
      reason: 'Class communication dispatch',
      targetDept: targetClass.department || req.user.department,
      details: `Advisor ${req.user.name} dispatched a ${type} communication: "${subject}"`
    });

    res.status(201).json(comm);
  } catch (error) {
    console.error('createAdvisorCommunication error:', error);
    res.status(500).json({ message: 'Error sending communication.' });
  }
};

exports.getAdvisorCommunications = async (req, res) => {
  try {
    const AdvisorCommunication = require('../models/AdvisorCommunication');
    let query = {};

    if (req.user.role === 'Faculty') {
      query.sender = req.user.id;
    } else if (req.user.role === 'HoD') {
      query.$or = [
        { sender: req.user.id },
        { recipient: req.user.id },
        { isHODEscalation: true },
        { 'targetClass.department': req.user.department }
      ];
    } else if (['Admin', 'Principal', 'CoE'].includes(req.user.role)) {
      // Admin sees all
    } else if (req.user.role === 'Student') {
      query.$or = [
        { recipient: req.user.id },
        {
          recipientType: 'ClassBroadcast',
          'targetClass.department': req.user.department,
          'targetClass.year': req.user.year,
          'targetClass.semester': req.user.semester,
          'targetClass.section': req.user.section
        }
      ];
    }

    const communications = await AdvisorCommunication.find(query)
      .populate('sender', 'name email role department')
      .populate('recipient', 'name registerNumber email parentDetails')
      .sort({ createdAt: -1 });

    res.json(communications);
  } catch (error) {
    console.error('getAdvisorCommunications error:', error);
    res.status(500).json({ message: 'Error retrieving communications.' });
  }
};

// --- Class Advisor Section Audit Logs ---
exports.getAdvisorAuditLogs = async (req, res) => {
  try {
    const Log = require('../models/Log');
    let query = {};

    if (req.user.role === 'Faculty' && req.user.classAdvisorDetails?.isClassAdvisor) {
      const adv = req.user.classAdvisorDetails;
      query.$or = [
        { performedBy: req.user.id },
        {
          targetDept: adv.department,
          targetSemester: adv.semester,
          targetSection: adv.section
        }
      ];
    } else {
      return res.status(403).json({ message: 'Access Denied: Only Class Advisors can view class audit logs.' });
    }

    const logs = await Log.find(query)
      .populate('performedBy', 'name role')
      .populate('student', 'name registerNumber')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error('getAdvisorAuditLogs error:', error);
    res.status(500).json({ message: 'Error retrieving class audit logs.' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
};

exports.getFacultyAttendanceActivities = async (req, res) => {
  try {
    const facultyId = req.params.id;
    const User = require('../models/User');
    const Timetable = require('../models/Timetable');
    const Session = require('../models/Session');
    const Attendance = require('../models/Attendance');
    const Request = require('../models/Request');
    const Log = require('../models/Log');
    const AcademicCalendar = require('../models/AcademicCalendar');

    const faculty = await User.findById(facultyId).select('-password');
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    // Role-based department and user verification
    if (req.user.role === 'Faculty' && String(req.user.id) !== String(facultyId)) {
      return res.status(403).json({ message: 'Access denied: You can only view your own attendance activities' });
    }
    if (req.user.role === 'HoD' && faculty.department !== req.user.department) {
      return res.status(403).json({ message: 'Access denied: Faculty belongs to another department' });
    }

    // Fetch handled timetable slots
    const timetables = await Timetable.find({ faculty: facultyId }).populate('subject').lean();

    // Fetch handled sessions
    const sessions = await Session.find({ faculty: facultyId }).populate('subject').populate('timetable').sort({ date: -1 }).lean();
    const sessionIds = sessions.map(s => s._id);

    // Fetch check-in attendance records for those sessions
    const attendanceRecords = await Attendance.find({ session: { $in: sessionIds } }).lean();

    // Calculate missed submissions in the last 30 days
    const holidays = await AcademicCalendar.find({ type: 'Holiday' }).select('date').lean();
    const holidayDates = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));

    const missedSubmissions = [];
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 30); // check last 30 days

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (holidayDates.has(dateStr)) continue; // skip holidays
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[d.getDay()];
      if (dayName === 'Sunday' || dayName === 'Saturday') continue; // skip weekends

      const slotsForDay = timetables.filter(t => t.dayOfWeek === dayName);

      for (const slot of slotsForDay) {
        // Check if session exists for this date and timetable slot
        const sessionExists = sessions.some(s => {
          const sDateStr = new Date(s.date).toISOString().split('T')[0];
          return sDateStr === dateStr && (
            (s.timetable && s.timetable.toString() === slot._id.toString()) ||
            (s.subject.toString() === slot.subject._id.toString() && s.period === slot.period)
          );
        });

        // Parse timetable slot end time
        const [hour, minute] = slot.endTime.split(':').map(Number);
        const slotEndDateTime = new Date(d);
        slotEndDateTime.setHours(hour, minute, 0, 0);

        if (!sessionExists && slotEndDateTime < now) {
          missedSubmissions.push({
            date: new Date(d),
            dayOfWeek: dayName,
            period: slot.period,
            subjectCode: slot.subject?.code || 'SUB',
            subjectName: slot.subject?.name || 'Subject',
            class: `${slot.department} Y${slot.year} S${slot.semester} Sec ${slot.section}`,
            classroom: slot.classroom,
            time: `${slot.startTime} - ${slot.endTime}`
          });
        }
      }
    }

    // Class-wise and subject-wise averages calculation
    const classSubjectStats = {};
    sessions.forEach(session => {
      if (!session.locked) return; // only locked sessions have finalized records
      const subCode = session.subject?.code || 'Unknown';
      const subName = session.subject?.name || 'Subject';
      const department = session.timetable?.department || session.subject?.department || 'Gen';
      const year = session.timetable?.year || '1';
      const section = session.timetable?.section || 'A';
      const key = `${department} Y${year} S${section} - ${subCode}`;
      
      const sessionRecs = attendanceRecords.filter(r => r.session.toString() === session._id.toString());
      const total = sessionRecs.length;
      const present = sessionRecs.filter(r => ['Present', 'Late', 'On-Duty'].includes(r.status)).length;
      
      if (!classSubjectStats[key]) {
        classSubjectStats[key] = {
          class: `${department} Y${year} Sec ${section}`,
          subject: `${subName} (${subCode})`,
          totalSessions: 0,
          totalStudentsMarked: 0,
          totalStudentsPresent: 0
        };
      }
      classSubjectStats[key].totalSessions++;
      classSubjectStats[key].totalStudentsMarked += total;
      classSubjectStats[key].totalStudentsPresent += present;
    });

    const classWiseStats = Object.values(classSubjectStats).map(stat => ({
      class: stat.class,
      subject: stat.subject,
      totalSessions: stat.totalSessions,
      attendancePercentage: stat.totalStudentsMarked > 0 
        ? Math.round((stat.totalStudentsPresent / stat.totalStudentsMarked) * 100) 
        : 0
    }));

    // Fetch correction requests raised by this faculty member
    const correctionRequests = await Request.find({ requestedBy: facultyId })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch recent logs performed by this faculty member
    const recentActivities = await Log.find({ performedBy: facultyId })
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    res.json({
      faculty: {
        _id: faculty._id,
        name: faculty.name,
        department: faculty.department,
        employeeId: faculty.employeeId,
        registerNumber: faculty.registerNumber,
        designation: faculty.designation,
        email: faculty.email,
        mobile: faculty.mobile
      },
      stats: {
        totalClassesAssigned: timetables.length,
        totalSessionsConducted: sessions.length,
        submissionsCompleted: sessions.filter(s => s.locked).length,
        submissionsPending: sessions.filter(s => !s.locked).length,
        missedSubmissionsCount: missedSubmissions.length
      },
      sessionsList: sessions.map(s => {
        const sRecs = attendanceRecords.filter(r => r.session.toString() === s._id.toString());
        const total = sRecs.length;
        const present = sRecs.filter(r => ['Present', 'Late', 'On-Duty'].includes(r.status)).length;
        
        const dept = s.timetable?.department || s.subject?.department || 'General';
        const yr = s.timetable?.year || '1';
        const sec = s.timetable?.section || 'A';
        const className = `${dept} Y${yr} Sec ${sec}`;

        return {
          _id: s._id,
          date: s.date,
          period: s.period,
          subjectCode: s.subject?.code,
          subjectName: s.subject?.name,
          class: className,
          locked: s.locked,
          submissionTime: s.locked ? s.updatedAt : null,
          totalStudents: total,
          attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
      }),
      missedSubmissions,
      classWiseStats,
      correctionRequests,
      recentActivities
    });
  } catch (error) {
    console.error('getFacultyAttendanceActivities error:', error);
    res.status(500).json({ message: 'Error retrieving faculty attendance details and activities.' });
  }
};


