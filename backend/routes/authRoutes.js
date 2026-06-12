const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

router.post('/change-password', authMiddleware.protect, require('../controllers/authController').changePassword);
router.post('/forgot-password', require('../controllers/authController').forgotPassword);
router.post('/reset-password', require('../controllers/authController').resetPassword);

module.exports = router;
