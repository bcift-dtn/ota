const express = require('express');
const router = express.Router();
const { getCarRentals, getCarRentalDetail } = require('../controllers/productController');

router.get('/car-rental', getCarRentals);

router.get('/car-rental/:id', getCarRentalDetail);

module.exports = router;