const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, forgotPassword, resetPassword } = require('../controllers/authController');
const { requireAuth } = require('../helpers/auth');
const rateLimit = require('express-rate-limit'); 

router.use(
    cors({
        credentials: true,
        origin: 'http://localhost:5173'
    })
);

// rate limiting middleware to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many login attempts , please try again after 15 minutes.',
    standardHeaders: true, 
    legacyHeaders: false,
});

router.get('/', test);
router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/profile', getProfile, requireAuth);
router.post('/logout', logoutUser);
router.put('/update', updateUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;