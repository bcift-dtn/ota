const productModel = require('../models/productModel');
const majesticService = require('../services/majesticService');

const getFerryList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const offset = (page - 1) * limit;

        const [listings, total] = await Promise.all([
            productModel.getFerryListings(limit, offset),
            productModel.getFerryCount()
        ]);

        res.render('pages/ferry-list', {
            listings,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            query: req.query,
        });
    } catch (error) {
        console.error('Ferry list error:', error);
        res.status(500).render('pages/404', { message: 'Something went wrong.' });
    }
};

const getFerryDetail = async (req, res) => {
    try {
        const rows = await productModel.getFerryById(req.params.id);
        if (!rows.length) return res.status(404).render('pages/404', { message: 'Ferry not found.' });

        const product = rows[0];

        if (product.vendor_api_name === 'MAJESTIC') {
            const today = new Date().toISOString().split('T')[0];
            let schedule = [];
            let prices = [];
            try {
                [schedule, prices] = await Promise.all([
                majesticService.getSchedule(product.vendor_journey_code, today),
                majesticService.getPriceList(product.vendor_journey_code)
            ]);
            } catch (apiErr) {
                console.error('Majestic API error:', apiErr.message);
            }

            return res.render('pages/ferry-detail', {
                product,
                images: rows,
                schedule,
                prices,
                isApiDriven: true,
                query: req.query,
            });
        }

        res.render('pages/ferry-detail', {
            product,
            images: rows,
            schedule: [],
            prices: [],
            isApiDriven: false,
            query: req.query,
        })
    } catch (error) {
        console.error('Ferry detail error:', error);
        res.status(500).render('pages/404', { message: 'Something went wrong.' });
    }
}

const getScheduleByDate = async (req, res) => {
    try {
        const rows = await productModel.getFerryById(req.params.id);
        if (!rows.length) return res.status(404).json({ error: 'Ferry not found'});

        const product = rows[0];
        const date = req.query.date || new Date().toISOString().split('T')[0]; 

        const schedule = await majesticService.getSchedule(product.vendor_journey_code, date);
        
        res.json({ schedule });
    } catch (error) {
        console.error('Schedule fetch error:', error.message);
        res.json({ schedule: [] });
    }
}

module.exports = { getFerryList, getFerryDetail, getScheduleByDate };