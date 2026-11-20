const express = require('express');
const router = express.Router();
const requireAdmin = require('../middlewares/requireAdmin');
const adminController = require('../controllers/adminController');

// All admin routes are protected
router.use(requireAdmin);

router.get('/cancel-requests', adminController.getCancelRequests);

router.post('/cancel-requests/:id/approve', adminController.approveCancelRequest);

router.post('/cancel-requests/:id/reject', adminController.rejectCancelRequest);

router.get('/reschedule-requests', adminController.getRescheduleRequests);

router.post('/reschedule-requests/:id/approve', adminController.approveRescheduleRequest);

router.post('/reschedule-requests/:id/reject', adminController.rejectRescheduleRequest);

router.get('/transactions', adminController.getTransactions);

// Agent request
router.get('/agent-requests', adminController.getAgentRequests);
router.post('/agent-requests/:id/approve', adminController.approveAgentRequest);
router.post('/agent-requests/:id/reject', adminController.rejectAgentRequest);

module.exports = router;