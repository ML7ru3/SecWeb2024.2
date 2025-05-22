const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const https = require('https');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const app = express();

// Database connection với timeout
mongoose.connect(process.env.MONGO_URL, {
  connectTimeoutMS: 10000, // 10 giây timeout
  socketTimeoutMS: 30000   // 30 giây timeout
})
.then(() => console.log("Database Connected"))
.catch((err) => console.log("Database connection error", err));

// Secure server configurations
app.use(helmet());
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' })); // Giới hạn kích thước request
app.use(cookieParser());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 50, // 50 requests/IP
  message: 'Too many requests from this IP, please try again later',
  headers: true
});

// Speed Limiter
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (used, req) => (used - req.slowDown.limit) * 1000,
  validate: { delayMs: false } // Tắt cảnh báo
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // 10 yêu cầu
  message: 'Too many login attempts, please try again after 5 minutes'
});


// Áp dụng limiters
app.use('/api/', limiter, speedLimiter);
app.use('/api/login', loginLimiter);

//timeout
const timeout = require('express-timeout-handler');
app.use(
  timeout.handler({
    timeout: 30000, // 30 giây
    onTimeout: (req, res) => {
      res.status(503).json({ message: 'Request timed out, please try again later' });
    }
  })
);

//cookie security
app.use(cookieParser());


// CORS Configuration
const corsOptions = {
  origin: [
    'https://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Routes
app.use('/api', require('./routes/authRoutes'));

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// SSL Certificate
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
  minVersion: 'TLSv1.2' // Chỉ cho phép TLS 1.2+
};

// HTTPS Server
const PORT = process.env.PORT;
const server = https.createServer(sslOptions, app);

// Server timeout
server.keepAliveTimeout = 60000 ;
server.headersTimeout = 60000;

server.listen(PORT, () => {
  console.log(`
  Server running in HTTPS mode
  Port: ${PORT}
  SSL: Enabled (TLS 1.2+)
  Rate Limit: 100 requests/15min per IP
  Allowed Origins: ${corsOptions.origin.join(', ')}
  `);
});

// HTTP to HTTPS redirect
if (PORT === 443 || PORT === 80) {
  const http = require('http');
  const redirectApp = express();
  redirectApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
  http.createServer(redirectApp).listen(PORT === 443 ? 80 : 3000);
}
// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ message: 'Resource not found' });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Process handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});