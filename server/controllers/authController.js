const User = require('../models/user');
const { hashPassword, comparePassword } = require('../helpers/auth');
const jwt = require('jsonwebtoken');

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
            bestScore: 0
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
        if (!match) {
            return res.json({
                error: 'Invalid password'
            })
        }

        jwt.sign(
            {email: user.email, id: user._id, name: user.name},
            process.env.JWT_SECRET,
            { algorithm: 'HS256' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                }).json({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    bestScore: user.bestScore 
                });
            }
        )

    } catch (error) {
        console.log(error);
    }
}
const logout = async (req, res) => {
    try {
        console.log("Clearing cookie...");
        // Clear the cookie
        res.clearCookie(
            "jwt",
            { 
                httpOnly: true, 
                sameSite: "None", 
            }
        );
        console.log("Cookie cleared");
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.json({ message: "User successfully logged out", status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getProfile = async (req, res) => {
    const {token} = req.cookies;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, async (err, user) => {
            if (err) throw err;
            res.json(user)
        })
    } else {
        res.json(null)
    }
}

const getAllUsers = async (req, res) => {
    try {
      const users = await User.find({}, 'name email bestScore')
        .sort({ bestScore: -1 }); 

      console.log("Top ranked users: ", users);
      res.json({ data: users, status: "success" });

    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: err.message });
    }
  };

// save state of game
const loadGame = async (req, res) => {
    try {
        const user = req.user;

        res.json({
            board: user.savedBoard,
            score: user.score,
            bestScore: user.bestScore,
        });
    } catch (err) {
        console.error("Error loading game:", err);
        res.status(500).json({ message: "Error loading game." });
    }
};

const saveGame = async (req, res) => {
    try {
        const user = req.user;
        const { board, score, bestScore } = req.body;

        user.savedBoard = board;
        user.score = score;
        user.bestScore = bestScore;
        await user.save();

        res.json({ message: "Game saved successfully." });
    } catch (err) {
        console.error("Error saving game:", err);
        res.status(500).json({ message: "Error saving game." });
    }
};
module.exports = {
    registerUser,
    loginUser,
    logout,
    getProfile,
    getAllUsers,
    saveGame,
    loadGame
}