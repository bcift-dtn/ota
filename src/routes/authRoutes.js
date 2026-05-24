const express = require('express');
const router = express.Router();
const passport = require('passport');

const { registerUser, loginUser, logout, verifyEmail } = require('../controllers/authController');
const redirectIfAuthenticated = require('../middlewares/redirectIfAuthenticated');

router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register');
})

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/logout', logout);

router.get('/verify-email', verifyEmail)

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));

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

    res.redirect('/');
  }
)

module.exports = router;