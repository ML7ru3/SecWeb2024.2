const express = require('express');
const router = express.Router();
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, getAllUsers, deleteUser, resetUserScore, addUserByAdmin } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../helpers/auth');
const cors = require('cors');


// CORS Configuration - Cập nhật origin cho HTTPS
router.use(
  cors({
    credentials: true,
    origin: ['https://localhost:5317', 'https://localhost']
  })
);

// Routes
router.get('/', test);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', requireAuth, getProfile);
router.post('/logout', logoutUser);
router.put('/update', updateUser);

// Admin routes
router.use('/admin', requireAuth, requireAdmin);
router.get('/admin/users', getAllUsers);
router.delete('/admin/users/:id', deleteUser);
router.put('/admin/users/:id/reset-score', resetUserScore);
router.post('/admin/users', addUserByAdmin);

module.exports = router;