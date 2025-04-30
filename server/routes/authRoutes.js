const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser } = require('../controllers/authController');
const { requireAuth } = require('../helpers/auth');

router.use(
    cors({
        credentials: true,
        origin: 'http://localhost:5173'
    })
);

router.get('/', test);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', getProfile, requireAuth);
router.post('/logout', logoutUser);
router.put('/update', updateUser);

module.exports = router;