const express = require('express');
const router = express.Router();
const { getCarRentals, getCarRentalDetail, getActivities, getActivitiesDetail } = require('../controllers/productController');

router.get('/car-rental', getCarRentals);

router.get('/car-rental/:id', getCarRentalDetail);

router.get('/activities', getActivities);

router.get('/activities/:id', getActivitiesDetail);

module.exports = router;