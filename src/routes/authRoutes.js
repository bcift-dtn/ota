const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { registerUser, loginUser, logout, verifyEmail } = require('../controllers/authController');
const redirectIfAuthenticated = require('../middlewares/redirectIfAuthenticated');

// Limit attempt
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register');
})

router.post('/register', registerLimiter, registerUser);

router.post('/login', loginLimiter, loginUser);

router.post('/logout', logout);

router.get('/verify-email', verifyEmail)

router.get('/google', 
  (req, res, next) => {
    if (req.query.rememberMe === 'true') {
      req.session.pendingRememberMe = true;
    }
    next();
  },
  passport.authenticate('google', {scope: ['profile', 'email']})
);

router.get('/google/callback', 
  passport.authenticate('google', {
    session: false, // disable google session, instead use own session (express)
    failureRedirect: '/'
  }),
  (req, res) => {
    req.session.user = {
      id: req.user.id,
      fullName: req.user.full_name,
      email: req.user.email,
      isUser: req.user.is_user,
      isAgent: req.user.is_agent,
      isSeller: req.user.is_seller,
      isAdmin: req.user.is_admin,
    };

    if (req.session.pendingRememberMe) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;

      delete req.session.pendingRememberMe;
    } else {
      req.session.cookie.expires = false;
    }

    res.redirect('/');
  }
)

module.exports = router;