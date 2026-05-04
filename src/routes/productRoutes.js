const express = require('express');
const router = express.Router();
const { getCarRentals } = require('../controllers/productController');

router.get('/car-rental', getCarRentals);

module.exports = router;