const mongoose = require("mongoose")
const {Schema} = mongoose

const userSchema = new Schema({
    name: String,
    email: {
        type: String,
        unique: true
    },
    password: String,
    bestScore: { type: Number, default: 0},
    savedBoard: { type: Array, default: [] }, 
    score: { type: Number, default: 0 },
});

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;