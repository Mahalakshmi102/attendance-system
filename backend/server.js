const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

// Rate Limiting Config
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// Database Connection
const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || 100);
const mongooseOptions = {
  maxPoolSize,
  minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 10),
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log(`✅ MongoDB connected successfully (Pool Size: ${maxPoolSize})`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// Basic Route
app.get('/', (req, res) => {
  res.send('NITify Backend is running!');
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

const cluster = require('cluster');
const os = require('os');

// Background Jobs (only running on master process or if CLUSTER_MODE is disabled, controlled by RUN_CRON_JOBS env)
const runCronJobs = process.env.RUN_CRON_JOBS === 'true';
const clusterMode = process.env.CLUSTER_MODE === 'true';

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Worker ${process.pid} is running on port: ${PORT}`);
  });
};

if (clusterMode && cluster.isMaster) {
  console.log(`👑 Master process ${process.pid} is running.`);
  
  // Start background jobs only on Master to prevent duplicate execution across workers
  if (runCronJobs) {
    console.log('⏰ Starting background cron jobs on Master process...');
    require('./services/attendanceEngine');
    require('./services/attendanceJob');
  }

  const numCPUs = os.cpus().length;
  console.log(`Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking a replacement...`);
    cluster.fork();
  });
} else {
  // If CLUSTER_MODE is disabled, we still run background jobs on this single process if RUN_CRON_JOBS is true
  if (!clusterMode && runCronJobs) {
    console.log('⏰ Starting background cron jobs on single-threaded server...');
    require('./services/attendanceEngine');
    require('./services/attendanceJob');
  }
  startServer();
}
