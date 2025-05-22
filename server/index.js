const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const timeout = require('express-timeout-handler');
const app = express();

// CORS Configuration (put this at the very top!)
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://secweb2024-2.web.app', // your deployed frontend
    // add any other allowed origins here
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Database connection với timeout
mongoose.connect(process.env.MONGO_URL, {
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000
})
.then(() => console.log("Database Connected"))
.catch((err) => console.log("Database connection error", err));

// Secure server configurations
app.use(helmet());
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests from this IP, please try again later',
  headers: true
});

// Speed Limiter
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (used, req) => (used - req.slowDown.limit) * 1000,
  validate: { delayMs: false }
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 5 minutes'
});

// Apply limiters
app.use('/api/', limiter, speedLimiter);
app.use('/api/login', loginLimiter);

// Timeout
app.use(
  timeout.handler({
    timeout: 30000,
    onTimeout: (req, res) => {
      res.status(503).json({ message: 'Request timed out, please try again later' });
    }
  })
);

// Routes
app.use('/api', require('./routes/authRoutes'));

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ message: 'Resource not found' });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start server (no HTTPS, no redirect)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  Server running
  Port: ${PORT}
  Rate Limit: 100 requests/15min per IP
  Allowed Origins: ${corsOptions.origin.join(', ')}
  `);
});

// Process handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});