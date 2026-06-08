// .ENV
require('dotenv').config();

// Dependencies
const express = require('express');
const path = require('path');
const exSession = require('express-session');
const helmet = require("helmet")

// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');

// Variable
const app = express();
app.use(helmet());
const PORT = process.env.PORT || 3000;

// Passport for google login
const passport = require('passport');
require('./src/config/passport');

app.use(passport.initialize());

// EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// JSON and URL-encoded middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(exSession({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }
}));

// Consistent Data
const setLocals = require('./src/middlewares/setLocals');
app.use(setLocals);

// Static Page
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.render('pages/home');
})

app.use('/auth', authRoutes);
app.use('/products', productRoutes);

// Listen to PORT
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});