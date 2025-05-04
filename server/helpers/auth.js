const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');


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
        // 1. Check token
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }
        // 2. Token authentication
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET, {}, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        // 3. Check user role
        const user = await User.findById(decoded.id).select('role');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden - Admin access required' });
        }
        // Save user information in the request for use in subsequent middleware
        req.user = user;

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

module.exports = {
    hashPassword,
    comparePassword,
    requireAuth,
    requireAdmin
}