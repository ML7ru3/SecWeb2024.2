const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html')
const axios = require('axios');

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

        // Check if name was entered
        if (!name) {
            return res.json({
                error: 'Name is required'
            });
        }
        // Check if password is good
        if (!password || password.length < 6) {
            return res.json({
                error: 'Password is required and must be at least 6 characters long'
            });
        }
        // Check email
        const exist = await User.findOne({ email });
        if (exist) {
            return res.json({
                error: 'Email is already taken'
            });
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name, 
            email, 
            password: hashedPassword,
        })

        return res.json(user);
        
    } catch (err) {
        console.log(err);
        return res.json({
            error: 'An error occurred. Please try again!'
        });
    }
};

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
                error: 'No user found'
            });
        }
        const match = await comparePassword(password, user.password)

        if (!match) {
            res.json({error: 'Invalid password'});
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
    addUserByAdmin
};