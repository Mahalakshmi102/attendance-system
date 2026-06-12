const Log = require('../models/Log');

exports.getLogs = async (req, res) => {
  try {
    const query = {};

    // 1. Enforce HOD Security Boundaries
    if (req.user.role === 'HoD') {
      query.$or = [
        { performedByDept: req.user.department },
        { targetDept: req.user.department }
      ];
    } else if (req.query.department) {
      // Admin/Principal/CoE can filter by department
      query.$or = [
        { performedByDept: req.query.department },
        { targetDept: req.query.department }
      ];
    }

    // 2. Map other filters
    if (req.query.role) {
      query.performedByRole = req.query.role;
    }
    if (req.query.targetModel) {
      query.targetModel = req.query.targetModel;
    }
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.semester) {
      query.targetSemester = req.query.semester;
    }
    if (req.query.section) {
      query.targetSection = req.query.section;
    }
    if (req.query.student) {
      query.student = req.query.student;
    }
    if (req.query.faculty) {
      query.faculty = req.query.faculty;
    }

    // Date filters
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Include the entire end day
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    // Global text search regex
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const searchConditions = [
        { action: searchRegex },
        { performedByName: searchRegex },
        { reason: searchRegex }
      ];

      // If it's a string, we can search in details, but handle safely
      searchConditions.push({ details: searchRegex });

      if (query.$or) {
        // If $or is already defined (for department), we combine using $and
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // 3. Sorting & Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      Log.find(query)
        .populate('performedBy', 'name email role department')
        .populate('student', 'name registerNumber department semester section')
        .populate('faculty', 'name email department')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Log.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
