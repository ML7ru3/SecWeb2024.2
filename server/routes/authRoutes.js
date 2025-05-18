const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, getAllUsers, deleteUser, resetUserScore, addUserByAdmin, forgotPassword, resetPassword } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../helpers/auth');
const rateLimit = require('express-rate-limit'); 

router.use(
    cors({
        credentials: true,
        origin: 'http://localhost:5173'
    })
);
// rate limiting middleware to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Limit each IP to 5 login requests per windowMs
    handler: (req, res, next, options) => {
        res.json({
            message: 'Too many login attempts, please try again after 15 minutes.',
            retryAfter: Math.ceil(options.windowMs / 1000), // Seconds until reset
            remaining: 0, // No attempts left
        });
    },
    standardHeaders: true, 
    legacyHeaders: false,
});


router.get('/', test);
router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/profile', requireAuth, getProfile);
router.post('/logout', logoutUser);
router.put('/update', requireAuth, updateUser);

router.use('/admin', requireAuth, requireAdmin); 

router.get('/admin/users', getAllUsers);                     
router.delete('/admin/users/:id', deleteUser);               
router.put('/admin/users/:id/reset-score', resetUserScore); 
router.post('/admin/users', addUserByAdmin);  
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);               



module.exports = router;