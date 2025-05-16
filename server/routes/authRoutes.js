const express = require('express');
const router = express.Router();
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, getAllUsers, deleteUser, resetUserScore, addUserByAdmin } = require('../controllers/authController');
const { requireAuth, requireAdmin, registerLimiter, loginLimiter, adminUsersLimiter, updateLimiter } = require('../helpers/auth');
const cors = require('cors');
const Recaptcha = require('express-recaptcha').RecaptchaV3;

// Cấu hình reCAPTCHA v3
const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY, {
  callback: 'verifyCallback'
});

// Routes
router.get('/', test);
router.post('/register', registerLimiter, registerUser);
router.post('/login',  loginLimiter, loginUser);
router.get('/profile', requireAuth, getProfile);
router.post('/logout', requireAuth, logoutUser);
router.put('/update',  requireAuth, updateLimiter, updateUser);

// Admin routes
router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/users', adminUsersLimiter, getAllUsers);
router.delete('/admin/users/:id', deleteUser);
router.put('/admin/users/:id/reset-score', resetUserScore);
router.post('/admin/users', adminUsersLimiter, addUserByAdmin);

module.exports = router;