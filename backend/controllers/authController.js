const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'Student'
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    // allow email to contain registerNumber
    const { email, password } = req.body;
    const identifier = email;

    // Check if user exists (by email or registerNumber)
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { registerNumber: identifier }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        department: user.department || 'General'
      }
    };

    // Sign token
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '1d' },
      async (err, token) => {
        if (err) throw err;
        
        user.lastLogin = new Date();
        await user.save();

        res.json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isFirstLogin: user.isFirstLogin,
            permissions: user.permissions || [],
            classAdvisorDetails: user.classAdvisorDetails || { isClassAdvisor: false }
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid old password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false; // Mark that user has changed password
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ 
      $or: [ { email }, { registerNumber: email } ]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const sendEmail = require('../utils/mailer');
    await sendEmail({
      to: user.email,
      subject: 'Password Reset OTP',
      html: `<p>Your password reset OTP is <strong>${otp}</strong>. It will expire in 10 minutes.</p>`
    });

    res.json({ message: 'OTP sent to your email address', email: user.email });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    user.isFirstLogin = false; // also unset first login if reset
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
