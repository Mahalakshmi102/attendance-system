const Settings = require('../models/Settings');

/**
 * Calculates attendance percentage given the counts of various statuses.
 * @param {Object} counts - Object containing counts of different statuses, e.g. { Present: 10, Absent: 2, 'On-Duty': 1, 'Medical Leave': 1, 'Casual Leave': 0, Late: 1 }
 * @param {Object} policies - Configurable leave policies, e.g. { medicalLeavePolicy: 'Exclude', casualLeavePolicy: 'Count as Absent' }
 * @returns {Number} - Attendance percentage (0 to 100)
 */
function calculatePercentage(counts, policies = {}) {
  const medicalLeavePolicy = policies.medicalLeavePolicy || 'Exclude';
  const casualLeavePolicy = policies.casualLeavePolicy || 'Count as Absent';

  let attended = 0;
  let conducted = 0;

  // Process standard statuses
  // Present, Late, On-Duty, On Duty
  const presentCount = (counts['Present'] || 0) + (counts['Late'] || 0) + (counts['On-Duty'] || 0) + (counts['On Duty'] || 0);
  const absentCount = counts['Absent'] || 0;

  attended += presentCount;
  conducted += presentCount + absentCount;

  // Process Medical Leave
  const mlCount = (counts['Medical Leave'] || 0) + (counts['ML'] || 0);
  if (medicalLeavePolicy === 'Count as Present') {
    attended += mlCount;
    conducted += mlCount;
  } else if (medicalLeavePolicy === 'Count as Absent') {
    conducted += mlCount;
  } // If 'Exclude', we don't add to conducted or attended

  // Process Casual Leave
  const clCount = (counts['Casual Leave'] || 0) + (counts['CL'] || 0);
  if (casualLeavePolicy === 'Count as Present') {
    attended += clCount;
    conducted += clCount;
  } else if (casualLeavePolicy === 'Count as Absent') {
    conducted += clCount;
  } // If 'Exclude', we don't add to conducted or attended

  if (conducted === 0) return 0;
  return Math.round((attended / conducted) * 100);
}

/**
 * Helper to fetch settings policies
 */
async function getLeavePolicies() {
  const settings = await Settings.findOne().lean();
  return {
    medicalLeavePolicy: settings?.medicalLeavePolicy || 'Exclude',
    casualLeavePolicy: settings?.casualLeavePolicy || 'Count as Absent',
    attendanceThreshold: settings?.attendanceThreshold || 75
  };
}

module.exports = {
  calculatePercentage,
  getLeavePolicies
};
