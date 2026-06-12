const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const Timetable = require('../models/Timetable');
const AcademicCalendar = require('../models/AcademicCalendar');
const Session = require('../models/Session');

// Helper to get current day name
const getCurrentDay = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

// Helper to check if today is a working day
const isWorkingDay = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const event = await AcademicCalendar.findOne({ 
    date: { 
      $gte: today, 
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
    } 
  });

  if (event && event.type === 'Holiday') return false;
  return true;
};

// Run every minute to check if a class is starting
// "0 * * * * *" runs at second 0 of every minute
cron.schedule('* * * * *', async () => {
  try {
    if (!(await isWorkingDay())) {
      console.log('Today is a holiday. No sessions created.');
      return;
    }

    const now = new Date();
    const currentDay = getCurrentDay();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Find all timetable entries that start AT THIS EXACT MINUTE
    const activeClasses = await Timetable.find({
      dayOfWeek: currentDay,
      startTime: currentTime
    });

    for (const cls of activeClasses) {
      // Check if session already exists to prevent duplicates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSession = await Session.findOne({
        timetable: cls._id,
        date: { $gte: today }
      });

      if (!existingSession) {
        // Create new session
        const qrToken = uuidv4(); // Unique secure token
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // QR valid for 15 minutes by default

        const session = new Session({
          timetable: cls._id,
          subject: cls.subject,
          faculty: cls.faculty,
          date: now,
          period: cls.period,
          qrToken,
          expiresAt
        });

        await session.save();
        console.log(`✅ Created attendance session for ${cls.batch} in room ${cls.room}`);
      }
    }

    // Find all timetable entries that end AT THIS EXACT MINUTE
    const endingClasses = await Timetable.find({
      dayOfWeek: currentDay,
      endTime: currentTime
    });

    for (const cls of endingClasses) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSession = await Session.findOne({
        timetable: cls._id,
        date: { $gte: today },
        locked: false
      });

      if (existingSession) {
        existingSession.locked = true;
        existingSession.isActive = false;
        await existingSession.save();
        console.log(`🔒 Locked attendance session for ${cls.subject} by faculty ${cls.faculty}`);

        const Notification = require('../models/Notification');
        const Attendance = require('../models/Attendance');
        const User = require('../models/User');

        const attendanceCount = await Attendance.countDocuments({ session: existingSession._id });
        if (attendanceCount === 0) {
           const adminUsers = await User.find({ role: 'Admin' });
           const notifications = adminUsers.map(admin => ({
             user: admin._id,
             message: `Alert: Faculty did not mark attendance for subject ${cls.subject} (Time: ${cls.startTime} - ${cls.endTime})`,
             type: 'Alert'
           }));
           notifications.push({
             user: cls.faculty,
             message: `Warning: You failed to mark attendance for subject ${cls.subject} (Time: ${cls.startTime} - ${cls.endTime}). The session is now locked.`,
             type: 'Warning'
           });
           await Notification.insertMany(notifications);
        }
      }
    }

  } catch (err) {
    console.error('Error in attendance cron job:', err);
  }
});
