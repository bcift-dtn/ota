const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const requireAuth = require('../middlewares/requireAuth');
router.use(requireAuth);

router.get('/personal-info', (req, res) => res.render('pages/dashboard/personal-info', { activeMenu: 'personal-info' }));

router.get('/account-security', (req, res) => res.render('pages/dashboard/account-security', { activeMenu: 'account-security' }));

router.get('/points', (req, res) => {
    res.render('pages/dashboard/coming-soon', { activeMenu: 'points' });
})

router.get('/orders', userController.getMyOrders);

router.get('/status', (req, res) => {
    res.render('pages/dashboard/coming-soon', { activeMenu: 'status' });
})

router.get('/orders/:orderId/invoice', userController.downloadInvoice);

router.get('/orders/:orderId/voucher', userController.downloadVoucher);

router.get('/orders/:orderId/cancel', userController.getCancelConfirmPage);

router.post('/orders/:orderId/cancel', userController.submitCancelRequest);

router.get('/orders/:orderId/reschedule', userController.getReschedulePage);

router.post('/orders/:orderId/reschedule', userController.submitRescheduleRequest);

router.post('/update-profile', userController.updateProfile);

router.post('/change-password', userController.changePassword);

// Agent
router.get('/become-agent', userController.getBecomeAgentPage);
router.post('/become-agent', userController.submitAgentApplication);


module.exports = router;