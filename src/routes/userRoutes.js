const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/personal-info', (req, res) => res.render('pages/dashboard/personal-info'));

router.get('/account-security', (req, res) => res.render('pages/dashboard/account-security'));

router.post('/update-profile', userController.updateProfile);

module.exports = router;