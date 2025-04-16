const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');

const test = (req, res) => {
    res.json({
        message: 'Hello from the server!'
    });
}

const registerUser = async (req, res) => {
    try {   
        const { name, email, password } = req.body;
        //check if name was entered
        if(!name) {
            return res.json({
                error: 'Name is required'
            })
        }
        //check is password is good
        if(!password || password.length < 6) {
            return res.json({
                error: 'Password is required and must be at least 6 characters long'
            })
        }
        //Check email
        const exist = await User.findOne({ email });
        if(exist) {
            return res.json({
                error: 'Email is already taken'
            })
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            name, 
            email, 
            password: hashedPassword,
        })

        return res.json(user)
        
    } catch (err){
        console.log(err);
    }
}

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if (!user) {
            return res.json({
                error: 'No user found'
            })
        }
        const match = await comparePassword(password, user.password)
        if (match) {
            jwt.sign({email: user.email, id: user._id, name: user.name}, process.env.JWT_SECRET, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json(user);
            })
        }
        if (!match) {
            res.json({
                error: 'Invalid password'
            })
        }

    } catch (error) {
        console.log(error);
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
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server error' });
        }
    });
};


const logoutUser = (req, res) => {
    res.clearCookie('token'); 
    res.json({ message: 'Đăng xuất thành công!' });
};


module.exports = {
    test,
    registerUser,
    loginUser,
    getProfile, 
    logoutUser
}