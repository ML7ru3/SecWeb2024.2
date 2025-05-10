const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html')

const test = (req, res) => {
    res.json({
        message: 'Hello from the server!'
    });
}

const registerUser = async (req, res) => {
    try {   
        const { name, email, password, lastSession } = req.body;
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
            lastGameSaved: lastSession.gameState,
            score: lastSession.tempScore,
            scoreFromLastGameSaved: lastSession.tempHighscore
        })

        return res.json(user)
        
    } catch (err){
        console.log(err);
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
        console.error('Error in updateUser:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

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


const logoutUser = (req, res) => {
    res.clearCookie('token'); 
    res.json({ message: 'Đăng xuất thành công!' });
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

const resetUserScore = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndUpdate(id, { highscore: 0 }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Highscore reset', user });
    } catch (error) {
        console.error('Error resetting highscore:', error);
        res.status(500).json({ error: 'Failed to reset highscore' });
    }
};

const addUserByAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const exist = await User.findOne({ email });
        if (exist) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await hashPassword(password);
        const user = await User.create({ name, email, password: hashedPassword, highscore: 0 });

        res.json({ message: 'User created successfully', user });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ error: 'Failed to add user' });
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
}