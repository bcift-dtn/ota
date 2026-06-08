const express = require('express');
const router = express.Router();
const { getCarRentals, getCarRentalDetail, getActivities, getActivitiesDetail, getCheckoutPage } = require('../controllers/productController');

router.post('/checkout/draft', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({success: false, message: 'Please log in to continue.'})
    }

    try {
        req.session.draftOrder = req.body;

        return res.status(200).json({ success: true, message: "Draft saved"});
    } catch (err) {
        console.error("Draft error:", err);
        return res.status(500).json({ success: false, message: "server error"});
    }
}) 

router.get('/car-rental', getCarRentals);

router.get('/car-rental/:id', getCarRentalDetail);

router.get('/activities', getActivities);

router.get('/activities/:id', getActivitiesDetail);

router.get('/checkout', getCheckoutPage);

module.exports = router;