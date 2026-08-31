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
const userRoutes = require('./src/routes/userRoutes');
const contactController = require('./src/controllers/contactController');
const ferryRoutes = require('./src/routes/ferryRoutes');
const webhookController = require('./src/controllers/webhookController');

// Variable
const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc:    ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net"],
      frameSrc:    ["'self'", "https://www.google.com", "https://checkout.yokke.co.id", "https://tst.yokke.co.id:7778"],
      connectSrc:  ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://tst.yokke.co.id:7778", "https://api.yokke.co.id:7778"],
      upgradeInsecureRequests: null,
    }
  }
}));
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
app.use('/dashboard', userRoutes);
app.use('/ferry', ferryRoutes);
app.get('/about', (req, res) => res.render('pages/about'));
app.get('/contact', contactController.renderContactPage);
app.post('/contact/send', contactController.sendMessage);
app.post('/api/webhook/yokke', webhookController.handleWebhook);
app.use((req, res) => {
  res.status(404).render('pages/404', { message: 'Page not found.' });
});

// Listen to PORT
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});