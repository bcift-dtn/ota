const express = require('express');
const router = express.Router();
const requireAccounting = require('../middlewares/requireAccounting');
const accountingController = require('../controllers/accountingController');

// Protect all accounting routes
router.use(requireAccounting);

router.get('/', accountingController.getSettlementDashboard);
router.get('/export', accountingController.exportSettlementCSV);

module.exports = router;