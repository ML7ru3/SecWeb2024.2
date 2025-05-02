const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile, logoutUser, updateUser, getAllUsers, deleteUser, resetUserScore, addUserByAdmin } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../helpers/auth');

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

router.use('/admin', requireAuth, requireAdmin); 
router.get('/admin/users', getAllUsers);                     
router.delete('/admin/users/:id', deleteUser);               
router.put('/admin/users/:id/reset-score', resetUserScore); 
router.post('/admin/users', addUserByAdmin);                 



module.exports = router;