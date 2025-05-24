const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html')
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
require('dotenv').config();


const test = (req, res) => {
    res.json({
        message: 'Hello from the server!'
    });
};

const registerUser = async (req, res) => {
    try {   
        const { name, email, password, turnstileToken } = req.body;

        // Verify Turnstile token
        const turnstileResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
        });

        if (!turnstileResponse.data.success) {
            return res.status(400).json({
                error: 'Turnstile verification failed'
            });
        }

        //check if name was entered
        if(!name) {
            return res.status(400).json({
                error: 'Name is required.'
            })
        }

        if (!email){
            return res.status(400).json({error: 'Email is required.'});
        }
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        
        //Check email
        const exist = await User.findOne({ email });
        if(exist) {
            return res.status(400).json({
                error: 'Email already existed.'
            })
        }
        // check password presence and strength
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,64}$/;
        
        //check is password is good
        if(!passwordRegex.test(password)){
            return res.status(400).json({
                error: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter and one number.'
            });   
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name, 
            email, 
            password: hashedPassword,
        })

        return res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            highscore: user.highscore || 0
        });
        
    } catch (err){
        return res.status(500).json({error: 'Internal server error'});
    }
}

const updateUser = async (req, res) => {
    try {
        const { email, lastGameSaved, scoreFromLastGameSaved, newHighScore } = req.body;
        const { user } = req; // Lấy từ middleware requireAuth

        // 1. Validate input
        if (!email || !lastGameSaved) {
            return res.status(400).json({ error: 'Email and lastGameSaved are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate scores
        if (typeof scoreFromLastGameSaved !== 'number' || scoreFromLastGameSaved < 0) {
            return res.status(400).json({ error: 'scoreFromLastGameSaved must be a non-negative number' });
        }
        if (typeof newHighScore !== 'number' || newHighScore < 0) {
            return res.status(400).json({ error: 'newHighScore must be a non-negative number' });
        }

        // 2. Check authorization
        const targetUser = await User.findOne({ email });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Allow update if user is updating their own data or is an admin
        if (user.email !== email && user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: You can only update your own data' });
        }

        // 3. Update the user's highscore
        const highscore = Math.max(targetUser.highscore || 0, newHighScore || 0);

        // 4. Update the user
        const updatedUser = await User.findOneAndUpdate(
            { email }, // Match the user by email
            { $set: { lastGameSaved, scoreFromLastGameSaved, highscore } }, // Update fields
            { new: true } // Return the updated document
        ).select('-password'); // Exclude password from response

        return res.json(updatedUser); // Return the updated user
    } catch (err) {
        console.error('Error in updateUser:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const loginUser = async (req, res) => {
    try {
        const { email, password, turnstileToken } = req.body;

        // Verify Turnstile token
        const turnstileResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
        });

        if (!turnstileResponse.data.success) {
            return res.status(400).json({ error: 'Turnstile verification failed' });
        }

        // Validate user credentials
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ error: 'Invalid email or password' });
        }

        const match = await comparePassword(password, user.password);
        if (!match) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // check of user has valid TOTP session in last 1 hour
        if (user.lastTotpVerified && user.lastTotpVerified > Date.now() - 60 * 60 * 1000) {
            // issue jwt 
            const token = jwt.sign(
                { email: user.email, id: user._id, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: '3h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 1000 * 60 * 60 * 3,
            });

            return res.status(200).json({ message: 'Login successfully', user });
        }
        // Generate temporary TOTP secret
        if (!user.tempTotpSecret) {
            const newTempSecret = speakeasy.generateSecret({ length: 20 }).base32;
            user.tempTotpSecret = newTempSecret;
            await user.save();
        }

        const tempSecret = user.tempTotpSecret;  

        const totp = speakeasy.totp({ secret: tempSecret, encoding: 'base32', step: 300 });

        // Send TOTP to email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

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
            tempToken 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed. Please try again!' });
    }
};

// Step 2: Verify TOTP code
const verifyTotp = async (req, res) => {
    try {
        const { tempToken, totpCode } = req.body;

        // Verify temporary JWT token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid or expired temporary token' });
        }

        // Find user and validate temp secret
        const user = await User.findOne({ email: decoded.email });
        if (!user || !user.tempTotpSecret) {
            return res.status(400).json({ error: 'Invalid session or expired code' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.tempTotpSecret,
            encoding: 'base32',
            token: totpCode,
            window: 1,
            step: 300
        });

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Clear temp secret
        user.tempTotpSecret = undefined;
        user.lastTotpVerified = new Date();
        await user.save();

        // Generate final login JWT
        const token = jwt.sign(
            { email: user.email, id: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Set auth cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 3600000,
        });

        return res.status(200).json({ message: 'Login successful', user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfile = async (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ error: 'You are not logged in' });
    }

    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' });
        }

        try {
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(404).json({ error: 'User does not exist' });
            }

            user.name = sanitizeHtml(user.name);            
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};


const logoutUser = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful!' });
};

const getAllUsers = async (req, res) => {
    try {
        const { user } = req; // Lấy từ middleware requireAuth
        // requireAdmin đã kiểm tra role, nhưng giữ để rõ ràng
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { user } = req; // Lấy từ middleware requireAuth
        const { id } = req.params;
        // requireAdmin đã kiểm tra role, nhưng giữ để rõ ràng
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error.' });
    }
};

const resetUserScore = async (req, res) => {
    try {
        const { user } = req; // Lấy từ middleware requireAuth
        const { id } = req.params;
        // requireAdmin đã kiểm tra role, nhưng giữ để rõ ràng
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        const updatedUser = await User.findByIdAndUpdate(id, { highscore: 0 }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'Highscore reset', user: updatedUser });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addUserByAdmin = async (req, res) => {
    try {
        const { user } = req; // Lấy từ middleware requireAuth
        const { name, email, password } = req.body;
        // requireAdmin đã kiểm tra role, nhưng giữ để rõ ràng
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const exist = await User.findOne({ email });
        if (exist) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await hashPassword(password);
        const newUser = await User.create({ name, email, password: hashedPassword, highscore: 0 });
        res.json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
// forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user in DB
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Email not found." });
        }

        // Generate OTP and hash
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Save OTP and reset attempts
        user.resetOtp = hashedOtp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000;
        user.failedAttempts = 0;
        await user.save();

        // SMTP configuration
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        await transporter.verify();

        // Send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`,
        });

        return res.status(200).json({
            message: "OTP sent to your email",
            status: "success",
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const resetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Email not found." });
        }

        // Validate password
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,64}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: 'Password must be 6-64 characters and include at least one uppercase letter, one lowercase letter, and one number.'
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Check OTP expiry
        if (!user.otpExpiry || Date.now() > user.otpExpiry) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isOtpValid) {
            user.failedAttempts += 1;

            await user.save();
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Update password and clear reset data
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        user.failedAttempts = 0;

        await user.save();

        return res.status(200).json({ message: "Password reset successfully!" });

    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
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
    verifyTotp
};