const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const app = express();

//database connection
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("Database Connected"))
.catch((err) => console.log("Database not connected", err))

//middleware
app.use(express.json()); // parses incoming JSON requests into req.body
app.use(cookieParser()); // allow to access cookies via req.cookies
app.use(express.urlencoded({extended: false})) // parses form submission

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use('/', authRoutes);

const port = 8000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
