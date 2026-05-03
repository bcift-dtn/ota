const express = require('express');
const router = express.Router();

const { registerUser, loginUser, logout, verifyEmail } = require('../controllers/authController');
const redirectIfAuthenticated = require('../middlewares/redirectIfAuthenticated');

router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register');
})

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/logout', logout);

router.get('/verify-email', verifyEmail)

module.exports = router;