require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const { hashPassword } = require('./helpers/auth');

async function createAdmin() {
    await mongoose.connect(process.env.MONGO_URL);

    const email = 'Ha.PT225571@sis.hust.edu.vn';
    const name = 'admin';
    const plainPassword = 'Ha2004';

    const exist = await User.findOne({ email });
    if (exist) {
        console.log('Admin already exists');
        process.exit();
    }

    const hashed = await hashPassword(plainPassword);

    const user = await User.create({
        name,
        email,
        password: hashed,
        role: 'admin'
    });

    console.log('Admin created:', {
        email: user.email,
        password: plainPassword // chỉ in ra để test, không log thật
    });

    mongoose.disconnect();
}

createAdmin();
