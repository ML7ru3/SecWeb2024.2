const express = require('express');
   const router = express.Router();
   const {
       test,
       registerUser,
       loginUser,
       getProfile,
       logoutUser,
       updateUser,
       getAllUsers,
       deleteUser,
       resetUserScore,
       addUserByAdmin,
       forgotPassword,
       resetPassword,
       verifyTotp,
       refreshToken,
       generateMfaSecret,
       verifyMfaSetup,
       disableMfa,
       loginMfaVerify
   } = require('../controllers/authController');
   const {
       requireAuth,
       requireAdmin,
       registerLimiter,
       loginLimiter,
       adminUsersLimiter,
       updateLimiter,
       totpLimiter
   } = require('../helpers/auth');

   // Public routes
   router.get('/', test);
   router.post('/register', registerLimiter, registerUser);
   router.post('/login', loginLimiter, loginUser);
   router.post('/login-mfa', loginLimiter, verifyTotp);
   router.post('/forgot-password', forgotPassword);
   router.post('/reset-password', resetPassword);
   router.post('/refresh-token', totpLimiter, refreshToken); 

   // Protected routes
   router.get('/profile', requireAuth, getProfile);
   router.post('/logout', requireAuth, logoutUser);
   router.put('/update', requireAuth, updateLimiter, updateUser);
   router.post('/mfa/setup', requireAuth, generateMfaSecret);
   router.post('/mfa/verify', requireAuth, verifyMfaSetup);
   router.post('/mfa/disable', requireAuth, disableMfa);
   router.post('/mfa/login-verify', loginLimiter, loginMfaVerify);

   // Admin routes
   router.use('/admin', requireAuth, requireAdmin);
   router.get('/admin/users', adminUsersLimiter, getAllUsers);
   router.delete('/admin/users/:id', deleteUser);
   router.put('/admin/users/:id/reset-score', resetUserScore);
   router.post('/admin/users', adminUsersLimiter, addUserByAdmin);

   module.exports = router;