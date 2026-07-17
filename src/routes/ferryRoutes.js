const express = require('express');
const router = express.Router();
const ferryController = require('../controllers/ferryController');

router.get('/', ferryController.getFerryList);
router.get('/:id', ferryController.getFerryDetail);
router.get('/:id/schedules', ferryController.getScheduleByDate);

module.exports = router;