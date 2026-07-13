const express = require('express');
const router = express.Router();
const ferryController = require('../controllers/ferryController');

router.get('/', ferryController.getFerryList);
router.get('/:id', ferryController.getFerryDetail);

module.exports = router;