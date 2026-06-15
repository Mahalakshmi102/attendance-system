const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const AcademicCalendar = require('./models/AcademicCalendar');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');
const Mark = require('./models/Mark');
const Settings = require('./models/Settings');
const Notification = require('./models/Notification');
const Log = require('./models/Log');
const Workload = require('./models/Workload');

const seedDemoData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for Demo Seeding');

    // 1. Clear existing database
    await Promise.all([
      User.deleteMany({}),
      Subject.deleteMany({}),
      Timetable.deleteMany({}),
      AcademicCalendar.deleteMany({}),
      Session.deleteMany({}),
      Attendance.deleteMany({}),
      Mark.deleteMany({}),
      Settings.deleteMany({}),
      Notification.deleteMany({}),
      Log.deleteMany({}),
      Workload.deleteMany({})
    ]);
    console.log('Cleared all previous collections including Workloads');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    // 2. Create System Settings
    await Settings.create({
      automatedBackups: false,
      strictGeofencing: true,
      strictDeviceBinding: false
    });
    console.log('Seeded System Settings');

    // 3. Create Admin / Principal / CoE
    const coreUsers = [
      { name: 'Principal Account', email: 'principal@example.com', password: defaultPassword, role: 'Principal', department: 'General', employeeId: 'EMP_PRIN01', designation: 'Principal', qualification: 'Ph.D', dateOfJoining: new Date(2015, 5, 1), experience: '20 Years', permissions: ['view_analytics', 'view_reports'] },
      { name: 'CoE Account', email: 'coe@example.com', password: defaultPassword, role: 'CoE', department: 'General', employeeId: 'EMP_COE01', designation: 'Controller of Examinations', qualification: 'Ph.D', dateOfJoining: new Date(2018, 2, 15), experience: '15 Years', permissions: ['view_analytics', 'view_reports', 'manage_timetable'] },
      { name: 'Admin Account', email: 'admin@example.com', password: defaultPassword, role: 'Admin', department: 'General', employeeId: 'EMP_ADM01', designation: 'System Administrator', qualification: 'M.Tech', dateOfJoining: new Date(2020, 0, 10), experience: '10 Years', permissions: ['mark_attendance', 'edit_attendance', 'view_analytics', 'view_reports', 'manage_timetable', 'manage_faculty'] }
    ];
    await User.insertMany(coreUsers);
    console.log('Seeded Core Staff (Principal, CoE, Admin)');

    // 4. Create 5 Departments
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'];

    // 5. Create HoDs and Faculty
    const hodsMap = {};
    const facultyMap = {}; // department -> array of faculty users

    for (const dept of departments) {
      // 1 HOD per department
      const hod = await User.create({
        name: `${dept} HOD`,
        email: `hod.${dept.toLowerCase()}@example.com`,
        password: defaultPassword,
        role: 'HoD',
        department: dept,
        designation: 'Professor & Head',
        qualification: 'Ph.D',
        employeeId: `EMP_HOD_${dept}`,
        dateOfJoining: new Date(2019, 6, 1),
        employmentStatus: 'Full-time',
        experience: '12 Years',
        permissions: ['view_analytics', 'manage_faculty', 'generate_reports', 'manage_timetable']
      });
      hodsMap[dept] = hod;

      // 5 Faculty per department
      facultyMap[dept] = [];
      for (let f = 1; f <= 5; f++) {
        const isCSE1 = dept === 'CSE' && f === 1;
        const advisorDetails = isCSE1 ? {
          isClassAdvisor: true,
          department: 'CSE',
          year: '1',
          semester: '1',
          section: 'A'
        } : {
          isClassAdvisor: false
        };

        const fac = await User.create({
          name: `${dept} Faculty ${f}`,
          email: `fac.${dept.toLowerCase()}.${f}@example.com`,
          password: defaultPassword,
          role: 'Faculty',
          department: dept,
          designation: f <= 2 ? 'Associate Professor' : 'Assistant Professor',
          qualification: 'M.E. / M.Tech',
          employeeId: `EMP_FAC_${dept}_${f}`,
          dateOfJoining: new Date(2021 + f % 2, f, 15),
          employmentStatus: f === 4 ? 'Contract' : 'Full-time',
          experience: `${4 + f} Years`,
          classAdvisorDetails: advisorDetails,
          permissions: ['mark_attendance', 'view_analytics', 'view_reports']
        });
        facultyMap[dept].push(fac);
      }
    }
    console.log('Seeded 5 HODs and 25 Faculty Members with Employee Profiles & Advisor Mappings');

    // 6. Create 40 Subjects (2 per class for 5 departments * 4 years)
    const years = ['1', '2', '3', '4'];
    const subjectsMap = {}; // "dept-year" -> array of subject docs

    for (const dept of departments) {
      for (const year of years) {
        const key = `${dept}-${year}`;
        subjectsMap[key] = [];

        let fac1, fac2;
        if (year === '1') {
          fac1 = facultyMap[dept][0]._id; // Faculty 1
          fac2 = facultyMap[dept][4]._id; // Faculty 5
        } else if (year === '2') {
          fac1 = facultyMap[dept][1]._id; // Faculty 2
          fac2 = facultyMap[dept][1]._id; // Faculty 2
        } else if (year === '3') {
          fac1 = facultyMap[dept][2]._id; // Faculty 3
          fac2 = facultyMap[dept][2]._id; // Faculty 3
        } else {
          fac1 = facultyMap[dept][3]._id; // Faculty 4
          fac2 = facultyMap[dept][3]._id; // Faculty 4
        }

        // Subject 1
        const sub1 = await Subject.create({
          name: `${dept} Year ${year} Core 1`,
          code: `${dept}${year}01`,
          credits: 4,
          department: dept,
          regulation: '2021',
          year,
          semester: String(Number(year) * 2 - 1), // e.g. Year 1 -> Semester 1
          subjectType: 'Theory',
          assignedFaculty: [fac1],
          isActive: true
        });

        // Workload for Subject 1
        await Workload.create({
          faculty: fac1,
          subject: sub1._id,
          department: dept,
          year,
          semester: sub1.semester,
          section: 'A',
          assignedHours: 45
        });

        // Subject 2
        const sub2 = await Subject.create({
          name: `${dept} Year ${year} Core 2`,
          code: `${dept}${year}02`,
          credits: 3,
          department: dept,
          regulation: '2021',
          year,
          semester: String(Number(year) * 2 - 1),
          subjectType: 'Theory',
          assignedFaculty: [fac2],
          isActive: true
        });

        // Workload for Subject 2
        await Workload.create({
          faculty: fac2,
          subject: sub2._id,
          department: dept,
          year,
          semester: sub2.semester,
          section: 'A',
          assignedHours: 36
        });

        subjectsMap[key].push(sub1, sub2);
      }
    }
    console.log('Seeded 40 Subjects (2 per year per department)');

    // 7. Create 100 Students (5 students per class for 5 depts * 4 years)
    const studentsMap = {}; // "dept-year" -> array of student docs
    let studentIdCounter = 1;

    for (const dept of departments) {
      for (const year of years) {
        const key = `${dept}-${year}`;
        studentsMap[key] = [];

        for (let s = 1; s <= 5; s++) {
          const regNo = `23${dept}${year}${String(s).padStart(3, '0')}`;
          const rollNo = `${year}${dept}${String(s).padStart(2, '0')}`;
          
          const student = await User.create({
            name: `${dept} Student ${year}-${s}`,
            email: `student.${dept.toLowerCase()}.${year}.${s}@example.com`,
            password: defaultPassword,
            role: 'Student',
            department: dept,
            year,
            semester: String(Number(year) * 2 - 1),
            section: 'A',
            registerNumber: regNo,
            rollNumber: rollNo,
            gender: s % 2 === 0 ? 'Male' : 'Female',
            mobile: `987654${String(studentIdCounter).padStart(4, '0')}`,
            dob: new Date(2004 + Number(year), s, 10),
            parentDetails: {
              name: `Parent of ${dept} Student ${s}`,
              mobile: `912345${String(studentIdCounter).padStart(4, '0')}`
            }
          });
          studentsMap[key].push(student);
          studentIdCounter++;
        }
      }
    }
    console.log('Seeded 100 Students (5 per class)');

    // 8. Create Fake Timetable
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [
      { period: 'H1', startTime: '08:30', endTime: '09:30' },
      { period: 'H2', startTime: '09:30', endTime: '10:30' },
      { period: 'H3', startTime: '10:45', endTime: '11:45' },
      { period: 'H4', startTime: '11:45', endTime: '12:45' },
      { period: 'H5', startTime: '13:45', endTime: '14:45' }
    ];

    const timetableList = [];
    for (const dept of departments) {
      for (const year of years) {
        const key = `${dept}-${year}`;
        const subs = subjectsMap[key];
        const semester = String(Number(year) * 2 - 1);

        for (const day of days) {
          for (let pIdx = 0; pIdx < periods.length; pIdx++) {
            const p = periods[pIdx];
            const sub = subs[pIdx % 2];
            const facultyId = sub.assignedFaculty[0];

            timetableList.push({
              department: dept,
              year,
              semester,
              section: 'A',
              dayOfWeek: day,
              period: p.period,
              startTime: p.startTime,
              endTime: p.endTime,
              subject: sub._id,
              faculty: facultyId,
              classroom: `${dept}-${Number(year) * 100 + pIdx + 1}`,
              isActive: true
            });
          }
        }
      }
    }
    const createdTimetables = await Timetable.insertMany(timetableList);
    console.log(`Seeded ${createdTimetables.length} Timetable Slots`);

    // 9. Create Fake Academic Calendar for 20 Days
    const calendarEvents = [];
    const baseDate = new Date();
    // set base date to 10 days ago so we can have 10 past days and 10 future days
    baseDate.setDate(baseDate.getDate() - 10);
    baseDate.setHours(0, 0, 0, 0);
    
    for (let d = 0; d < 20; d++) {
      const curDate = new Date(baseDate.getTime() + d * 24 * 60 * 60 * 1000);
      const dayOfWeek = curDate.getDay();
      
      let type = 'Working Day';
      let description = 'Regular Working Day';
      
      if (dayOfWeek === 0) {
        type = 'Holiday';
        description = 'Weekly Sunday Holiday';
      } else if (d === 5) {
        type = 'Holiday';
        description = 'Public Holiday';
      } else if (d === 15) {
        type = 'Holiday';
        description = 'College Festival';
      }

      calendarEvents.push({
        date: curDate,
        type,
        description,
        term: 'Spring 2026'
      });
    }
    const createdCalendar = await AcademicCalendar.insertMany(calendarEvents);
    console.log(`Seeded ${createdCalendar.length} Academic Calendar Days`);

    // 10. Seed Historical Attendance & Marks
    const SEED_HISTORICAL_ATTENDANCE = true;
    if (SEED_HISTORICAL_ATTENDANCE) {
      const workingDays = createdCalendar.filter(c => c.type === 'Working Day');
      const pastWorkingDays = workingDays.filter(w => new Date(w.date) < new Date());

      console.log(`Found ${pastWorkingDays.length} past working days to mark historical attendance.`);

      const sessionsToCreate = [];
      
      for (const wDay of pastWorkingDays) {
        const wDate = new Date(wDay.date);
        const dayOfWeekName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wDate.getDay()];
        const dayTimetables = createdTimetables.filter(t => t.dayOfWeek === dayOfWeekName);

        for (const slot of dayTimetables) {
          sessionsToCreate.push({
            timetable: slot._id,
            subject: slot.subject,
            faculty: slot.faculty,
            date: wDate,
            period: slot.period || 'H1',
            qrToken: `mock-qr-${slot._id}-${wDate.getTime()}`,
            expiresAt: new Date(wDate.getTime() + 15 * 60 * 1000),
            isActive: false,
            locked: true
          });
        }
      }

      console.log(`Inserting ${sessionsToCreate.length} sessions in bulk...`);
      const createdSessions = await Session.insertMany(sessionsToCreate);
      console.log(`Successfully inserted ${createdSessions.length} sessions.`);

      // Map sessions by a unique key to easily find them when creating attendance
      const sessionsMapByTimetableAndDate = {};
      createdSessions.forEach(s => {
        const key = `${s.timetable.toString()}-${new Date(s.date).getTime()}`;
        sessionsMapByTimetableAndDate[key] = s._id;
      });

      const attendanceToCreate = [];

      for (const wDay of pastWorkingDays) {
        const wDate = new Date(wDay.date);
        const dayOfWeekName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wDate.getDay()];
        const dayTimetables = createdTimetables.filter(t => t.dayOfWeek === dayOfWeekName);

        for (const slot of dayTimetables) {
          const key = `${slot.department}-${slot.year}`;
          const students = studentsMap[key];
          const sessionKey = `${slot._id.toString()}-${wDate.getTime()}`;
          const sessionId = sessionsMapByTimetableAndDate[sessionKey];

          if (!sessionId) continue;

          for (const student of students) {
            let status = 'Present';
            const isLowAttendanceStudent = 
              (student.name.includes('Student 1-1')) ||
              (student.name.includes('Student 2-1')) ||
              (student.name.includes('Student 3-1')) ||
              (student.name.includes('Student 4-1'));

            const isCriticalStudent = 
              (student.name.includes('Student 1-2')) ||
              (student.name.includes('Student 2-2'));

            if (isCriticalStudent) {
              status = Math.random() < 0.4 ? 'Present' : 'Absent';
            } else if (isLowAttendanceStudent) {
              status = Math.random() < 0.68 ? 'Present' : 'Absent';
            } else {
              status = Math.random() < 0.9 ? 'Present' : (Math.random() < 0.5 ? 'Late' : 'Absent');
            }

            attendanceToCreate.push({
              session: sessionId,
              student: student._id,
              subject: slot.subject,
              date: wDate,
              period: slot.period || 'H1',
              status,
              markedBy: status === 'Absent' ? 'Faculty' : 'Student',
              entryType: status === 'Absent' ? 'Manual' : 'QR',
              remarks: status === 'Absent' ? 'Absent' : '',
              locked: true
            });
          }
        }
      }

      console.log(`Inserting ${attendanceToCreate.length} attendance records in bulk...`);
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < attendanceToCreate.length; i += CHUNK_SIZE) {
        const chunk = attendanceToCreate.slice(i, i + CHUNK_SIZE);
        await Attendance.insertMany(chunk);
      }
      console.log('Seeded Attendance logs successfully in bulk.');
    } else {
      console.log('Skipping default/historical attendance seeding as per clean config flag.');
    }

    // 11. Seed Student Marks
    console.log('Seeding student subject grades...');
    const marksToCreate = [];
    for (const dept of departments) {
      for (const year of years) {
        const key = `${dept}-${year}`;
        const students = studentsMap[key];
        const subs = subjectsMap[key];

        for (const student of students) {
          for (const sub of subs) {
            const internal = Math.floor(Math.random() * 20) + 20; // 20 to 40
            const external = Math.floor(Math.random() * 30) + 30; // 30 to 60
            
            marksToCreate.push({
              student: student._id,
              subject: sub._id,
              internal,
              external,
              total: internal + external,
              locked: true
            });
          }
        }
      }
    }
    await Mark.insertMany(marksToCreate);
    console.log('Seeded Student Marks successfully in bulk.');

    console.log('========================================================================');
    console.log('🎉 Seed Completed Successfully!');
    console.log(`- 5 Departments: CSE, ECE, EEE, MECH, CIVIL`);
    console.log(`- 4 Classes per Dept (Years 1, 2, 3, 4)`);
    console.log(`- 100 Students (5 per class)`);
    console.log(`- 5 HoDs & 25 Faculty Members`);
    console.log(`- 40 Subjects`);
    console.log(`- 600 Timetable slots`);
    console.log(`- 20 Academic Calendar events`);
    console.log(`- Historical attendance marked successfully`);
    console.log(`- Full Internal & External Marks`);
    console.log('========================================================================');
    console.log('Logins (Password: password123):');
    console.log('1. Admin: admin@example.com');
    console.log('2. HOD CSE: hod.cse@example.com');
    console.log('3. Faculty CSE: fac.cse.1@example.com');
    console.log('4. Student CSE Y1: student.cse.1.1@example.com');
    console.log('========================================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during demo seeding:', error);
    process.exit(1);
  }
};

seedDemoData();
