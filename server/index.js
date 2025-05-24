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

   // Database connection with timeout
   mongoose.connect(process.env.MONGO_URL, {
       connectTimeoutMS: 10000,
       socketTimeoutMS: 30000
   })
   .then(() => console.log("Database Connected"))
   .catch((err) => console.log("Database connection error", err));

   // Secure server configurations
   app.use(helmet({
       contentSecurityPolicy: {
           directives: {
               defaultSrc: ["'self'"],
               scriptSrc: ["'self'", "'unsafe-inline'"],
               styleSrc: ["'self'", "'unsafe-inline'"],
               imgSrc: ["'self'", "data:"],
               connectSrc: ["'self'", "https://challenges.cloudflare.com"],
           }
       }
   }));
   app.disable('x-powered-by');
   app.use(express.json({ limit: '10kb' }));
   app.use(cookieParser());
   app.use(express.urlencoded({ extended: false, limit: '10kb' }));

   // Rate Limiting
   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutes
       max: 50,
       message: 'Too many requests from this IP, please try again later',
       standardHeaders: true
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
       message: 'Too many login attempts, please try again after 5 minutes',
       standardHeaders: true
   });

   // Apply limiters
   app.use('/api/', limiter, speedLimiter);
   app.use('/api/login', loginLimiter);

   // Timeout
   const timeout = require('express-timeout-handler');
   app.use(
       timeout.handler({
           timeout: 30000,
           onTimeout: (req, res) => {
               res.status(503).json({ message: 'Request timed out, please try again later' });
           }
       })
   );

   // CORS Configuration
   const corsOptions = {
       origin: [
           'https://localhost:5317',
           'https://localhost:5173'
           // Thêm domain thực tế khi deploy, ví dụ: 'https://yourdomain.com'
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
       minVersion: 'TLSv1.2'
   };

   // HTTPS Server
   const PORT = process.env.PORT || 443;
   const server = https.createServer(sslOptions, app);

   // Server timeout
   server.keepAliveTimeout = 60000;
   server.headersTimeout = 60000;

   server.listen(PORT, () => {
       console.log(`
       Server running in HTTPS mode
       Port: ${PORT}
       SSL: Enabled (TLS 1.2+)
       Rate Limit: 50 requests/15min per IP
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