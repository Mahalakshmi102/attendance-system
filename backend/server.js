const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Smart Attendance Automation Engine
require('./services/attendanceEngine');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = ['http://localhost:5173'];
if (FRONTEND_URL) allowedOrigins.push(FRONTEND_URL);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// Basic Route
app.get('/', (req, res) => {
  res.send('Smart Attendance Backend is running!');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'smart-attendance-backend' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Background Jobs
require('./services/attendanceJob');

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});
