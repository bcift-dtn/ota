const express = require('express');
const router = express.Router();

const { registerUser, loginUser } = require('../controllers/authController');

router.get('/register', (req, res) => {
  res.render('pages/register');
})

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/');
  })
})

module.exports = router;