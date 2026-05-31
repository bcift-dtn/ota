const express = require('express');
const router = express.Router();
const { getCarRentals, getCarRentalDetail, getActivities, getActivitiesDetail } = require('../controllers/productController');

router.get('/car-rental', getCarRentals);

router.get('/car-rental/:id', getCarRentalDetail);

router.get('/activities', getActivities);

router.get('/activities/:id', getActivitiesDetail);

router.get('/products/home2', (req, res) => res.render('pages/home2'))

module.exports = router;