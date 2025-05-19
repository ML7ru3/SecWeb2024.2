const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html')
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
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
            return res.json({
                error: 'Turnstile verification failed'
            });
        }

        //check if name was entered
        if(!name) {
            return res.json({
                error: 'Name is required.'
            })
        }

        if (!email){
            return res.json({error: 'Email is required.'});
        }
        if (!password) {
            return res.json({ error: 'Password is required' });
        }
        
        //Check email
        const exist = await User.findOne({ email });
        if(exist) {
            return res.json({
                error: 'Email already existed.'
            })
        }
        // check password presence and strength
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,64}$/;
        
        //check is password is good
        if(!passwordRegex.test(password)){
            return res.json({
                error: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter and one number.'
            });   
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name, 
            email, 
            password: hashedPassword,
        })

        return res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            highscore: user.highscore || 0
        });
        
    } catch (err){
        return res.json({error: 'Internal server error'});
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
        return res.status(500).json({ error: 'Server error' });
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
            return res.json({
                error: 'Turnstile verification failed'
            });
        }

        // Proceed with user login
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                error: 'Invalid email or password'
            });
        }
        const match = await comparePassword(password, user.password)

        if (!match) {
            res.json({error: 'Invalid email or password'});
            return;
        }

        const token = jwt.sign(
            {email: user.email, id: user._id, name:user.name}, 
            process.env.JWT_SECRET, 
            {expiresIn: '1h'}
        )
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
        });

        res.json({message: 'Login successfully', user});

    } catch (error) {
        console.log(error);
        res.json({
            error: 'Login failed. Please try again!'
        });
    }

}


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
            res.status(500).json({ error: 'Server error' });
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
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
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
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
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
        console.error('Error resetting highscore:', err);
        return res.status(500).json({ error: 'Failed to reset highscore' });
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
        console.error('Error adding user:', error);
        return res.status(500).json({ error: 'Failed to add user' });
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

        // Check if user is locked out
        if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockoutUntil - Date.now()) / 1000 / 60);
            return res.status(429).json({ 
                message: `Too many attempts. Please try again in ${remainingTime} minutes.` 
            });
        }

        // Generate OTP and hash
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Save OTP and reset attempts
        user.resetOtp = hashedOtp;
        user.otpExpiry = Date.now() + 15 * 60 * 1000;
        user.failedAttempts = 0;
        user.lockoutUntil = undefined;
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
            text: `Your OTP for password reset is: ${otp}. This OTP is valid for 15 minutes.`,
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

        // Check lockout
        if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockoutUntil - Date.now()) / 1000 / 60);
            return res.status(429).json({ 
                message: `Too many attempts. Please try again in ${remainingTime} minutes.` 
            });
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
            return res.status(400).json({ message: "OTP expired. Please request a new one." });
        }

        // Verify OTP
        const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isOtpValid) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;
            
            // Set lockout if max attempts reached
            if (user.failedAttempts >= process.env.MAX_ATTEMPTS) {
                user.lockoutUntil = Date.now() + process.env.LOCKOUT_DURATION;
            }
            
            await user.save();
            return res.status(400).json({ 
                message: `Invalid OTP. ${process.env.MAX_ATTEMPTS - user.failedAttempts} attempts remaining.` 
            });
        }

        // Update password and clear reset data
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        user.failedAttempts = 0;
        user.lockoutUntil = undefined;
        await user.save();

        return res.status(200).json({ message: "Password reset successfully!" });

    } catch (error) {
        console.error('Reset password error:', error);
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
    resetPassword
};