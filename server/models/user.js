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
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}); 

module.exports = mongoose.model('User', userSchema);
