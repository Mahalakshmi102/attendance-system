const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.split(' ')[1]; // Bearer token

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded = jwt.verify(token, jwtSecret);

    req.user = decoded.user;

    // Fetch fresh user details from DB to make sure role, department, permissions, and classAdvisorDetails are up-to-date and populated
    const User = require('../models/User');
    User.findById(req.user.id).select('role department permissions classAdvisorDetails').then(user => {
      if (user) {
        req.user.role = user.role;
        req.user.department = user.department || 'General';
        req.user.classAdvisorDetails = user.classAdvisorDetails || { isClassAdvisor: false };
        req.user.permissions = user.permissions || [];
      }
      next();
    }).catch((err) => {
      console.error('authMiddleware error loading user:', err);
      next();
    });
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'User not authenticated' });
    }
    
    const userRole = req.user.role;
    const isAuthorized = roles.includes(userRole) || 
      (userRole === 'Class Advisor' && roles.includes('Faculty'));

    if (!isAuthorized) {
      return res.status(403).json({ message: `User role ${userRole} is not authorized to access this route` });
    }
    next();
  };
};
