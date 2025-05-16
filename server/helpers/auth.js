const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const rateLimit = require('express-rate-limit');

const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(12, (err, salt) => {
            if (err) {
                reject(err);
            } 
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash);
                }
            })
        })
    })
}

const comparePassword = (password, hashed) => {
    return bcrypt.compare(password, hashed)
}

const requireAuth = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'No tokens' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' });
        }
        req.user = decoded; // Attach the decoded token to the request object
        next();
    });
};

const requireAdmin = async (req, res, next) => {
    try {
        // req.user đã được gắn bởi requireAuth
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized - No user data' });
        }
        // Kiểm tra role từ req.user (từ token)
        if (req.user.role !== 'admin') {
            // Xác minh thêm từ database để đảm bảo
            const user = await User.findById(req.user.id).select('role');
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden - Admin access required' });
            }
            // Cập nhật req.user.role nếu cần
            req.user.role = user.role;
        }
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expired' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const registerLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 5, // 5 yêu cầu
    message: 'Too many registration attempts, please try again after 5 minutes'
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 10, // 10 yêu cầu
    message: 'Too many login attempts, please try again after 5 minutes'
});

const adminUsersLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 30, // 30 yêu cầu
    message: 'Too many requests to admin endpoints, please try again later'
});

const updateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 phút
    max: 10, // 10 yêu cầu
    message: 'Too many update attempts, please try again after 5 minutes'
});

module.exports = {
    hashPassword,
    comparePassword,
    requireAuth,
    requireAdmin,
    registerLimiter,
    loginLimiter,
    adminUsersLimiter,
    updateLimiter,
}