const express = require('express');
const router = express.Router();
const cors = require('cors');
const { registerUser, loginUser, logout, getProfile, getAllUsers, saveGame, loadGame } = require('../controllers/authController');
const {authenticateUser} = require('../helpers/auth.js');

router.use(
    cors({
        credentials: true, // allow sending cookies
        origin: 'http://localhost:5173' // allow only this origin(protocol, domain, port) -> server allow origin of client send requests
    })
);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.get('/rank', getAllUsers);
router.get('/dashboard', authenticateUser, loadGame).post('/dashboard', authenticateUser, saveGame);

module.exports = router;