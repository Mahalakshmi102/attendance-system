const cron = require('node-cron');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const AcademicCalendar = require('../models/AcademicCalendar');
const Notification = require('../models/Notification');

class AttendanceEngine {
  constructor() {
    this.initCronJobs();
  }

  initCronJobs() {
    // Run every hour during college hours (8 AM to 5 PM) on weekdays/Saturdays
    cron.schedule('0 8-17 * * 1-6', async () => {
      console.log('Running NITify Engine Tasks...');
      await this.processAttendanceUnlock();
      await this.processAttendanceLock();
    });

    // Run daily at 6 PM to calculate warnings
    cron.schedule('0 18 * * 1-6', async () => {
       console.log('Running Attendance Warning Engine...');
       await this.processWarnings();
    });
  }

  async processAttendanceUnlock() {
    try {
      const today = new Date();
      // Check if today is a working day
      const calendarEntry = await AcademicCalendar.findOne({ 
         date: { 
            $gte: new Date(today.setHours(0,0,0,0)), 
            $lt: new Date(today.setHours(23,59,59,999)) 
         } 
      });

      if (calendarEntry && !calendarEntry.isWorkingDay) {
         console.log('Today is not a working day. Skipping attendance unlock.');
         return;
      }

      const currentHour = new Date().getHours();
      const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

      // Find timetables for the current day
      const activeClasses = await Timetable.find({ dayOfWeek: currentDay });

      for (const cls of activeClasses) {
         // Assuming startTime is in format "09:00"
         const classHour = parseInt(cls.startTime.split(':')[0], 10);
         
         // If current hour matches the class start hour
         if (classHour === currentHour) {
            // Check if attendance session already exists
            const existingSession = await Attendance.findOne({
               timetableId: cls._id,
               date: { 
                  $gte: new Date(today.setHours(0,0,0,0)), 
                  $lt: new Date(today.setHours(23,59,59,999)) 
               }
            });

            if (!existingSession) {
               console.log(`Unlocking attendance for class: ${cls.subject} (Faculty: ${cls.faculty})`);
               // In a real scenario, this might create an empty attendance record with status 'Unlocked'
               // or emit a websocket event to the faculty dashboard.
            }
         }
      }
    } catch (error) {
      console.error('Error in processAttendanceUnlock:', error);
    }
  }

  async processAttendanceLock() {
    try {
       // Logic to find 'Unlocked' or 'Open' attendance sessions whose end time has passed
       // and automatically lock them, saving the data.
       console.log('Checking for sessions to auto-lock...');
    } catch (error) {
       console.error('Error in processAttendanceLock:', error);
    }
  }

  async processWarnings() {
     try {
       // Logic to calculate overall attendance for all students
       // If < 75%, create a Notification for the student and the HOD.
       console.log('Calculating student attendance percentages and generating alerts...');
     } catch (error) {
        console.error('Error in processWarnings:', error);
     }
  }
}

// Export a singleton instance
module.exports = new AttendanceEngine();
