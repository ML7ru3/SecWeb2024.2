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
    const {token} = req.cookies;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, async (err, user) => {
            if (err) throw err;
            res.json(user)
        })
    } else {
        res.json(null)
    }
}

module.exports = {
    test,
    registerUser,
    loginUser,
    getProfile
}