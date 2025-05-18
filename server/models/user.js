const mongoose = require("mongoose")
const {Schema} = mongoose

const userSchema = new Schema({
    name: String,
    email: {
        type: String,
        unique: true
    },
    scoreFromLastGameSaved: {
        type: Number,
        default: null 
    },
    lastGameSaved: {
        type: Array,
        default: null
    },
    highscore: {
        type: Number,
        default: 0
    },
    password: String,
    resetOtp: {type: String},
    otpExpiry: {type: Date},
    failedAttempts: { type: Number, default: 0 },
    lockoutUntil: Date
}); 

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;