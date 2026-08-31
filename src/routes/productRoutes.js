const express = require('express');
const router = express.Router();
const { getCarRentals, getCarRentalDetail, getActivities, getActivitiesDetail, getCheckoutPage, saveDraftOrder, confirmCheckout } = require('../controllers/productController');

router.post('/checkout/draft', saveDraftOrder);

router.post('/checkout/confirm', confirmCheckout);

router.get('/car-rental', getCarRentals);

router.get('/car-rental/:id', getCarRentalDetail);

router.get('/activities', getActivities);

router.get('/activities/:id', getActivitiesDetail);

router.get('/checkout', getCheckoutPage);

module.exports = router;