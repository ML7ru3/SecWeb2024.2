const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(12, (err, salt) => {
            if (err) return reject(err);
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);
            });
        });
    });
};

const comparePassword = (password, hashed) => {
    return bcrypt.compare(password, hashed);
};

const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

const requireAuth = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired! Please login again!' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(401).json({ error: 'Token verification failed' });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: No user data' });
        }

        if (req.user.role !== 'admin') {
            const user = await User.findById(req.user.id).select('role');
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden: Admin access required' });
            }
            req.user.role = user.role;
        }
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const registerLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: 'Too many registration attempts, please try again after 5 minutes',
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again after 5 minutes',
    standardHeaders: true,
});

const adminUsersLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many requests to admin endpoints, please try again later',
});

const updateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'Too many update attempts, please try again after 5 minutes',
});

const totpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: 'Too many TOTP verification attempts, please try again after 5 minutes',
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: 'Too many password reset attempts, please try again after 5 minutes',
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
    totpLimiter,
    forgotPasswordLimiter,
    generateRefreshToken,
};