const express = require('express');
const router = express.Router();
const requireAdmin = require('../middlewares/requireAdmin');
const adminController = require('../controllers/adminController');

// All admin routes are protected
router.use(requireAdmin);

router.get('/cancel-requests', adminController.getCancelRequests);

module.exports = router;