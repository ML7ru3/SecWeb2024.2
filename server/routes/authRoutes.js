const express = require('express');
const router = express.Router();
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, getAllUsers, deleteUser, resetUserScore, addUserByAdmin, forgotPassword, resetPassword} = require('../controllers/authController');
const { requireAuth, requireAdmin, registerLimiter, loginLimiter, adminUsersLimiter, updateLimiter } = require('../helpers/auth');


// Routes
router.get('/', test);
router.post('/register', registerLimiter, registerUser);
router.post('/login',  loginLimiter, loginUser);
router.get('/profile', requireAuth, getProfile);
router.post('/logout', requireAuth, logoutUser);
router.put('/update',  requireAuth, updateLimiter, updateUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin routes
router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/users', adminUsersLimiter, getAllUsers);
router.delete('/admin/users/:id', deleteUser);
router.put('/admin/users/:id/reset-score', resetUserScore);
router.post('/admin/users', adminUsersLimiter, addUserByAdmin);

module.exports = router;