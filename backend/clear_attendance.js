const mongoose = require('mongoose');
require('dotenv').config();

const Attendance = require('./models/Attendance');
const Session = require('./models/Session');

const clearAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for clearing attendance');

    await Promise.all([
      Attendance.deleteMany({}),
      Session.deleteMany({})
    ]);

    console.log('✅ Successfully cleared all Attendance and Session records!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing attendance:', error);
    process.exit(1);
  }
};

clearAttendance();
