const User = require('../models/user');
const { hashPassword, comparePassword, generateRefreshToken } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const axios = require('axios');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();
const speakeasy = require('speakeasy');
const crypto = require('crypto');

const test = (req, res) => {
   res.json({ message: 'Hello from the server!' });
};

const registerUser = async (req, res) => {
   try {
       const { name, email, password, turnstileToken, lastSession } = req.body;

       const turnstileResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
           secret: process.env.TURNSTILE_SECRET_KEY,
           response: turnstileToken,
       });

       if (!turnstileResponse.data.success) {
           return res.status(400).json({ error: 'Turnstile verification failed' });
       }

       if (!name) return res.status(400).json({ error: 'Name is required' });
       if (!email) return res.status(400).json({ error: 'Email is required' });
       if (!password) return res.status(400).json({ error: 'Password is required' });

       const exist = await User.findOne({ email });
       if (exist) return res.status(400).json({ error: 'Email already exists' });

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
           return res.status(400).json({ error: 'Invalid email format' });
       }

       const passwordRegex = /^.{6,64}$/;
       if (!passwordRegex.test(password)) {
           return res.status(400).json({
               error: 'Password must be 6-64 characters long',
           });
       }

       const hashedPassword = await hashPassword(password);

       const user = await User.create({
           name,
           email,
           password: hashedPassword,
           lastGameSaved: lastSession?.gameState,
           score: lastSession?.tempScore || 0,
           scoreFromLastGameSaved: lastSession?.tempHighscore || 0,
           role: 'user',
       });

       return res.status(201).json({
           id: user._id,
           name: user.name,
           email: user.email,
           highscore: user.highscore || 0,
       });
   } catch (err) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const loginUser = async (req, res) => {
   try {
       const { email, password, turnstileToken } = req.body;

       if (!email || !password || !turnstileToken) {
           return res.status(400).json({ error: 'Email, password, and turnstile token are required' });
       }

       const turnstileResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
           secret: process.env.TURNSTILE_SECRET_KEY,
           response: turnstileToken,
       });

       if (!turnstileResponse.data.success) {
           return res.status(400).json({ error: 'Turnstile verification failed' });
       }

       const user = await User.findOne({ email });
       if (!user) {
           return res.status(401).json({ error: 'Invalid email or password' });
       }

       const match = await comparePassword(password, user.password);
       if (!match) {
           return res.status(401).json({ error: 'Invalid email or password' });
       }

       if (user.role === 'admin') {
           const tempSecret = speakeasy.generateSecret({ length: 20 }).base32;
           user.tempTotpSecret = tempSecret;
           user.totpAttempts = 0;
           await user.save();

           const totp = speakeasy.totp({ secret: tempSecret, encoding: 'base32', step: 300 });

           const transporter = nodemailer.createTransport({
               service: 'gmail',
               auth: {
                   user: process.env.EMAIL_USER,
                   pass: process.env.EMAIL_PASS,
               },
           });

           // send TOTP code via email
            await transporter.verify();
        
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Your Login Verification Code',
                text: `Your verification code is: ${totp}. It expires in 5 minutes.`,
            });

           const tempToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5m' });

           return res.status(200).json({
               message: 'Verification code sent to your email. Please check your email.',
               tempToken,
               requiresTotp: true,
           });
       }

       const accessToken = jwt.sign(
           { email: user.email, id: user._id, name: user.name, role: user.role },
           process.env.JWT_SECRET,
           { expiresIn: '1h' }
       );

       const refreshToken = generateRefreshToken();
       user.refreshToken = refreshToken;
       await user.save();

       res.cookie('accessToken', accessToken, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'strict',
           maxAge: 60 * 60 * 1000,
       });

       res.cookie('refreshToken', refreshToken, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'strict',
           maxAge: 24 * 60 * 60 * 1000,
       });

       return res.status(200).json({
           message: 'Login successful',
           user: { id: user._id, name: user.name, email: user.email, role: user.role },
           requiresTotp: false,
       });
   } catch (error) {
       return res.status(500).json({ error: 'Login failed. Please try again!' });
   }
};

const verifyTotp = async (req, res) => {
   try {
       const { tempToken, totpCode } = req.body;

       let decoded;
       try {
           decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
       } catch (error) {
           return res.status(401).json({ error: 'Invalid or expired temporary token' });
       }

       const user = await User.findOne({ email: decoded.email });
       if (!user || !user.tempTotpSecret) {
           return res.status(400).json({ error: 'Invalid session or expired code' });
       }

       // Check for lockout
        if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
            const remainingSeconds = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
            return res.status(429).json({
                error: `Too many TOTP attempts. Try again in ${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} minutes.`
            });
        }

       user.totpAttempts = (user.totpAttempts || 0) + 1;
       if (user.totpAttempts > 3) {
           user.tempTotpSecret = undefined;
           user.lockoutUntil = Date.now() + 5 * 60 * 1000;
           await user.save();
           return res.status(429).json({ error: 'Too many TOTP attempts. Try again in 5 minutes.' });
       }

       const isValid = speakeasy.totp.verify({
           secret: user.tempTotpSecret,
           encoding: 'base32',
           token: totpCode,
           window: 1,
           step: 300,
       });

       if (!isValid) {
           await user.save();
           return res.status(400).json({
               error: `Invalid verification code. Please try it again.`,
           });
       }

       user.tempTotpSecret = undefined;
       user.totpAttempts = 0;
       user.lockoutUntil = undefined;
       await user.save();

       const accessToken = jwt.sign(
           { email: user.email, id: user._id, name: user.name, role: user.role },
           process.env.JWT_SECRET,
           { expiresIn: '1h' }
       );

       const refreshToken = generateRefreshToken();
       user.refreshToken = refreshToken;
       await user.save();

       res.cookie('accessToken', accessToken, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'strict',
           maxAge: 60 * 60 * 1000,
       });

       res.cookie('refreshToken', refreshToken, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'strict',
           maxAge: 24 * 60 * 60 * 1000,
       });

       return res.status(200).json({
           message: 'Login successful',
           user: { id: user._id, name: user.name, email: user.email, role: user.role },
           requiresTotp: false,
       });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const refreshToken = async (req, res) => {
   const refreshToken = req.cookies.refreshToken;

   if (!refreshToken) {
       return res.status(401).json({ error: 'No refresh token provided' });
   }

   try {
       const user = await User.findOne({ refreshToken });
       if (!user) {
           return res.status(403).json({ error: 'Invalid refresh token' });
       }

       const accessToken = jwt.sign(
           { email: user.email, id: user._id, name: user.name, role: user.role },
           process.env.JWT_SECRET,
           { expiresIn: '1h' }
       );

       res.cookie('accessToken', accessToken, {
           httpOnly: true,
           secure: process.env.NODE_ENV === 'production',
           sameSite: 'strict',
           maxAge: 60 * 60 * 1000,
       });

       return res.status(200).json({ message: 'Token refreshed successfully' });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const logoutUser = async (req, res) => {
   const refreshToken = req.cookies.refreshToken;

   if (refreshToken) {
       await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
   }

   res.clearCookie('accessToken', {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       path: '/',
   });
   res.clearCookie('refreshToken', {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       path: '/',
   });
   return res.status(200).json({ message: 'Logout successful!' });
};

const getProfile = async (req, res) => {
   const { accessToken } = req.cookies;

   if (!accessToken) {
       return res.status(401).json({ error: 'You are not logged in' });
   }

   try {
       const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
       const user = await User.findById(decoded.id).select('-password -refreshToken -tempTotpSecret -mfaSecret');
       if (!user) {
           return res.status(404).json({ error: 'User does not exist' });
       }

       user.name = sanitizeHtml(user.name);
       return res.status(200).json(user);
   } catch (error) {
       console.error('Get profile error:', error);
       if (error.name === 'TokenExpiredError') {
           return res.status(401).json({ error: 'Session expired! Please login again!' });
       }
       if (error.name === 'JsonWebTokenError') {
           return res.status(401).json({ error: 'Invalid token' });
       }
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const updateUser = async (req, res) => {
   try {
       const { email, lastGameSaved, scoreFromLastGameSaved, newHighScore } = req.body;
       const { user } = req;

       if (!email || !lastGameSaved) {
           return res.status(400).json({ error: 'Email and lastGameSaved are required' });
       }

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
           return res.status(400).json({ error: 'Invalid email format' });
       }

       if (typeof scoreFromLastGameSaved !== 'number' || scoreFromLastGameSaved < 0) {
           return res.status(400).json({ error: 'scoreFromLastGameSaved must be a non-negative number' });
       }
       if (typeof newHighScore !== 'number' || newHighScore < 0) {
           return res.status(400).json({ error: 'newHighScore must be a non-negative number' });
       }

       const targetUser = await User.findOne({ email });
       if (!targetUser) {
           return res.status(404).json({ error: 'User not found' });
       }

       if (user.email !== email && user.role !== 'admin') {
           return res.status(403).json({ error: 'Forbidden: You can only update your own data' });
       }

       const highscore = Math.max(targetUser.highscore || 0, newHighScore || 0);

       const updatedUser = await User.findOneAndUpdate(
           { email },
           { $set: { lastGameSaved, scoreFromLastGameSaved, highscore } },
           { new: true }
       ).select('-password -refreshToken -tempTotpSecret -mfaSecret');

       return res.status(200).json(updatedUser);
   } catch (err) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const getAllUsers = async (req, res) => {
   try {
       const { user } = req;
       if (user.role !== 'admin') {
           return res.status(403).json({ error: 'Forbidden: Admin access required' });
       }
       const users = await User.find().select('-password -refreshToken -tempTotpSecret -mfaSecret');
       return res.status(200).json(users);
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const deleteUser = async (req, res) => {
   try {
       const { user } = req;
       const { id } = req.params;
       if (user.role !== 'admin') {
           return res.status(403).json({ error: 'Forbidden: Admin access required' });
       }
       const deletedUser = await User.findByIdAndDelete(id);
       if (!deletedUser) {
           return res.status(404).json({ error: 'User not found' });
       }
       return res.status(200).json({ message: 'User deleted successfully' });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const resetUserScore = async (req, res) => {
   try {
       const { user } = req;
       const { id } = req.params;
       if (user.role !== 'admin') {
           return res.status(403).json({ error: 'Forbidden: Admin access required' });
       }
       const updatedUser = await User.findByIdAndUpdate(id, { highscore: 0 }, { new: true }).select('-password -refreshToken -tempTotpSecret -mfaSecret');
       if (!updatedUser) {
           return res.status(404).json({ error: 'User not found' });
       }
       return res.status(200).json({ message: 'Highscore reset', user: updatedUser });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const addUserByAdmin = async (req, res) => {
   try {
       const { user } = req;
       const { name, email, password, role } = req.body;

       if (user.role !== 'admin') {
           return res.status(403).json({ error: 'Forbidden: Admin access required' });
       }

       if (!name || !email || !password || !role) {
           return res.status(400).json({ error: 'All fields are required' });
       }

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
           return res.status(400).json({ error: 'Invalid email format' });
       }

       const passwordRegex = /^.{6,64}$/;
       if (!passwordRegex.test(password)) {
           return res.status(400).json({
               error: 'Password must be 6-64 characters long'
           });
       }

       const exist = await User.findOne({ email });
       if (exist) {
           return res.status(400).json({ error: 'Email already exists' });
       }

       const hashedPassword = await hashPassword(password);

       const newUser = await User.create({
           name,
           email,
           password: hashedPassword,
           role: role === 'admin' ? 'admin' : 'user',
           highscore: 0
       });

       return res.status(201).json({
           message: 'User created successfully',
           user: {
               id: newUser._id,
               name: newUser.name,
               email: newUser.email,
               role: newUser.role
           }
       });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const forgotPassword = async (req, res) => {
   try {
       const { email } = req.body;

       const user = await User.findOne({ email });
       if (!user) {
           return res.status(404).json({ message: 'Email not found' });
       }

       // Check if the user is locked out
       if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
           const remainingSeconds = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
           return res.status(429).json({
               message: `Too many failed attempts.  Please try again in ${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} minutes.`,
           });
       }

       // user not locked out, proceed with OTP generation
       const otp = crypto.randomInt(100000, 999999).toString();
       const hashedOtp = await bcrypt.hash(otp, 10);

       user.resetOtp = hashedOtp;
       user.otpExpiry = Date.now() + 5 * 60 * 1000;
       user.failedAttempts = 0; // reset failed attempts
       user.lockoutUntil = undefined;
       await user.save();

       const transporter = nodemailer.createTransport({
           service: 'gmail',
           auth: {
               user: process.env.EMAIL_USER,
               pass: process.env.EMAIL_PASS,
           },
       });

       // send OTP 
        await transporter.verify();
    
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`,
        });
       
       return res.status(200).json({
           message: 'OTP sent to your email',
           status: 'success',
       });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

const resetPassword = async (req, res) => {
   const { email, otp, newPassword, confirmNewPassword } = req.body;

   try {
       const user = await User.findOne({ email });
       if (!user) {
           return res.status(404).json({ message: 'Email not found' });
       }

       if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
           const remainingSeconds = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
           return res.status(429).json({
               message: `Too many failed attempts.  Please try again in ${Math.floor(remainingSeconds / 60)}:${(remainingSeconds % 60).toString().padStart(2, '0')} minutes.`,
           });
       }

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
           return res.status(400).json({ error: 'Invalid email format' });
       }

       const passwordRegex = /^.{6,64}$/;
       if (!passwordRegex.test(newPassword)) {
           return res.status(400).json({
               message: 'Password must be 6-64 characters long',
           });
       }

       if (newPassword !== confirmNewPassword) {
           return res.status(400).json({ message: 'Passwords do not match' });
       }

       if (!user.otpExpiry || Date.now() > user.otpExpiry) {
           return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
       }

       const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
       if (!isOtpValid) {
           user.failedAttempts = (user.failedAttempts || 0) + 1;
           if (user.failedAttempts >= (process.env.MAX_ATTEMPTS)) {
               user.lockoutUntil = Date.now() + 5 * 60 * 1000;
           }
           await user.save();
           return res.status(400).json({
               message: "Invalid OTP. Please try again.",
           });
       }

       user.password = await bcrypt.hash(newPassword, 10);
       user.resetOtp = undefined;
       user.otpExpiry = undefined;
       user.failedAttempts = 0;
       user.lockoutUntil = undefined;
       await user.save();

       return res.status(200).json({ message: 'Password reset successfully!' });
   } catch (error) {
       return res.status(500).json({ error: 'Internal server error' });
   }
};

module.exports = {
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
};