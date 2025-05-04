const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();

// Database connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Database not connected", err));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// CORS Configuration
app.use(cors({
  origin: [
    'https://localhost:5317', // Frontend port
    'https://localhost:5173'  // Vite default port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
app.use('/api', require('./routes/authRoutes')); // Thêm tiền tố /api cho các endpoint

// Serve static files (nếu cần)
app.use(express.static(path.join(__dirname, '../client/dist')));

// SSL Certificate
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

// Create HTTPS server
const PORT = process.env.PORT || 8000;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`
  Server running in HTTPS mode
  Backend API: https://localhost:${PORT}/api
  `);
});

// Optional: Redirect HTTP to HTTPS (nếu chạy trên port 80/443)
if (PORT === 443 || PORT === 80) {
  const http = require('http');
  http.createServer((req, res) => {
    res.writeHead(301, { 
      "Location": `https://${req.headers['host']}${req.url}` 
    });
    res.end();
  }).listen(PORT === 443 ? 80 : 3000);
}