const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();

const test = (req, res) => {
    res.json({
        error: 'Hello from the server!'
    });
}

const registerUser = async (req, res) => {
    try {   
        const { name, email, password } = req.body;
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

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if (!user) {
            return res.json({
                error: 'Invalid email or password'
            })
        }
        const match = await comparePassword(password, user.password)
        if (!match) {
            return res.json({
                error: 'Invalid email or password'
            })
        }
        
        jwt.sign({email: user.email, id: user._id, name: user.name}, process.env.JWT_SECRET, {}, (err, token) => {
            if (err) throw err;
            res.status(200).cookie('token', token).json({
                id: user._id,
                name: user.name,
                email: user.email,
                highscore: user.highscore || 0
            });
        })
    } catch (error) {
        return res.status(500).json({error: 'Internal server error'})
    }
}

const updateUser = async (req, res) => {
    try {
        const { email, lastGameSaved, scoreFromLastGameSaved, newHighScore } = req.body;

        // Validate input
        if (!email || !lastGameSaved) {
            return res.status(400).json({ error: 'Email and lastGameSaved are required' });
        }

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update the user's highscore
        const highscore = Math.max(user.highscore || 0, newHighScore || 0);

        // Update the user
        const updatedUser = await User.findOneAndUpdate(
            { email }, // Match the user by email
            { $set: { lastGameSaved, scoreFromLastGameSaved, highscore } }, // Update fields
            { new: true } // Return the updated document
        );

        return res.json(updatedUser); // Return the updated user
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};


const getProfile = async (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ error: 'You are not logged in' });
    }

    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(404).json({ error : 'User does not exist' });
            }
            res.json(user);
        } catch (error) {
            res.status(500).json({ error : 'Internal server error' });
        }
    });
};


const logoutUser = (req, res) => {
    res.clearCookie('token'); 
    res.json({ error : 'Logout successfully!' });
};

// forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Tìm user trong DB
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "Email not found."});
        }

        // Tạo OTP ngẫu nhiên và hash
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Lưu OTP hash + thời gian hết hạn
        user.resetOtp = hashedOtp;
        user.otpExpiry = Date.now() + 15 * 60 * 1000;
        user.failedAttempts = 0; 
        await user.save();

        // Cấu hình SMTP: user send email -> SMTP client -> Gmail SMTP server via Internet -> send to users via POP/IMP protocol
        const transporter = nodemailer.createTransport({
            service: "gmail", // email will be sent using Gmail SMTP server
            auth: {
                user: process.env.EMAIL_USER, // the email address of the our app
                pass: process.env.EMAIL_PASS, // developer setup an email password for the app
            }
        });

        // Kiểm tra SMTP trước khi gửi email
        await transporter.verify();

        // Gửi email
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
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// reset password
const resetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    try {
        // Tìm user trong DB
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "Email not  found." });
        }
        // check password presence and strength
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,64}$/;
        
        //check is password is good
        if(!passwordRegex.test(newPassword)){
            return res.json({
                message: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number.'
            });
        }

        // Kiểm tra mật khẩu nhập lại có trùng không
        if (newPassword !== confirmNewPassword) {
            return res.json({ message: "Passwords do not match"});
        }

        // Kiểm tra số lần nhập OTP sai
        if (user.failedAttempts >= 5) {
            return res.json({ message: "Too many failed attempts, try again later" });
        }

        // Kiểm tra OTP hết hạn
        if (!user.otpExpiry || Date.now() > user.otpExpiry) {
            return res.json({ message: "Invalid or expired OTP" });
        }

        // Kiểm tra OTP có đúng không
        const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isOtpValid) {
            user.failedAttempts += 1; // Tăng số lần nhập sai
            await user.save();
            return res.json({ message: "Invalid or expired OTP" });
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Lưu mật khẩu mới và xóa OTP
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        user.failedAttempts = 0; // Reset bộ đếm nhập sai
        await user.save();

        return res.status(200).json({ message : "Password reset successfully!"});

    } catch (error) {
        res.status(500).json({ message : "Internal Server Error" });
    }
}; 

const getAllUsers = async (req, res) =>{
    try{
        const users = await User.find();
        console.log("All users: ", users);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({data: users, status: "success"});
    }catch(error){
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = {
    test,
    registerUser,
    loginUser,
    getProfile, 
    logoutUser,
    updateUser,
    forgotPassword,
    resetPassword,
    getAllUsers
}