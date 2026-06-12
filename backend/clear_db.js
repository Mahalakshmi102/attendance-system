const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const AcademicCalendar = require('./models/AcademicCalendar');
const Attendance = require('./models/Attendance');
const Session = require('./models/Session');
const Mark = require('./models/Mark');
const Request = require('./models/Request');
const Log = require('./models/Log');
const Notification = require('./models/Notification');

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for clearing data');

    // Delete all records from all collections
    await Promise.all([
      User.deleteMany({}),
      Subject.deleteMany({}),
      Timetable.deleteMany({}),
      AcademicCalendar.deleteMany({}),
      Attendance.deleteMany({}),
      Session.deleteMany({}),
      Mark.deleteMany({}),
      Request.deleteMany({}),
      Log.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('✅ Successfully cleared all data from the database (Subjects, Timetables, Attendance, Users, Marks, etc.)');

    // Recreate only the admin roles so the user can log in
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    const users = [
      {
        name: 'Principal Account',
        email: 'principal@example.com',
        password,
        role: 'Principal',
        isFirstLogin: false
      },
      {
        name: 'CoE Account',
        email: 'coe@example.com',
        password,
        role: 'CoE',
        isFirstLogin: false
      }
    ];

    await User.insertMany(users);
    console.log('✅ Re-seeded Principal and CoE accounts for login.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
