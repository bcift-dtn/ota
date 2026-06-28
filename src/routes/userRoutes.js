const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/personal-info', (req, res) => res.render('pages/dashboard/personal-info'));

router.get('/account-security', (req, res) => res.render('pages/dashboard/account-security'));

router.get('/points', (req, res) => {
    res.render('pages/dashboard/coming-soon', { activeMenu: 'points' });
})

router.get('/orders', (req, res) => {
    res.render('pages/dashboard/coming-soon', { activeMenu: 'orders' });
})

router.get('/status', (req, res) => {
    res.render('pages/dashboard/coming-soon', { activeMenu: 'status' });
})

router.post('/update-profile', userController.updateProfile);

router.post('/change-password', userController.changePassword);

module.exports = router;