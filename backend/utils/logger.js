const Log = require('../models/Log');
const User = require('../models/User');

const createLog = async (action, performedBy, targetModel, targetId, options = {}) => {
  try {
    let performerId = performedBy;
    let performedByName = 'Unknown';
    let performedByRole = 'Staff';
    let performedByDept = 'General';

    if (performedBy && typeof performedBy === 'object') {
      performerId = performedBy._id || performedBy.id;
      performedByName = performedBy.name || 'Unknown';
      performedByRole = performedBy.role || 'Staff';
      performedByDept = performedBy.department || 'General';
    } else if (performedBy) {
      const user = await User.findById(performedBy).select('name role department');
      if (user) {
        performedByName = user.name;
        performedByRole = user.role;
        performedByDept = user.department || 'General';
      }
    }

    const {
      oldValue,
      newValue,
      reason,
      targetDept,
      targetSemester,
      targetSection,
      student,
      faculty,
      details
    } = options;

    const log = new Log({
      action,
      performedBy: performerId,
      performedByName,
      performedByRole,
      performedByDept,
      targetModel,
      targetId,
      oldValue,
      newValue,
      reason,
      targetDept: targetDept || performedByDept,
      targetSemester,
      targetSection,
      student,
      faculty,
      details
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating log:', error);
  }
};

module.exports = { createLog };
