const productModel = require('../models/productModel');
const majesticService = require('../services/majesticService');
const { getSGDtoIDR } = require('../services/rateService');

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
                majesticService.getSchedule({
                    departPort: product.depart_port,
                    arrivalPort: product.arrival_port,
                    travelDate: today
                }),
                majesticService.getPriceList()
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
        const tripType = req.query.tripType || 'one-way';
        const returnDate = req.query.returnDate || '';
        const isTwoWay = tripType === 'two-way' && !!returnDate;

        const apiData = await majesticService.getSchedule({
            departPort: product.depart_port,
            arrivalPort: product.arrival_port,
            travelDate: date,
            journeyType: isTwoWay? '2' : '1',
            isReturnOpenTicket: '0',
            returnDepartPort: isTwoWay ? product.arrival_port : '',
            returnArrivalPort: isTwoWay ? product.depart_port : '',
            returnTravelDate: isTwoWay ? returnDate : ''
        });

        const scheduleObj = Array.isArray(apiData) ? apiData[0] : apiData;
        const departTrips = scheduleObj?.DepartTrips || [];
        const returnTrips = scheduleObj?.ReturnTrips || [];
        const rawPrices = scheduleObj?.Price || [];

        const parsePrice = (str) => parseFloat(String(str || '0').replace(/[^0-9.]/g, '') || 0);
        const adultEntry = rawPrices.find(p => p.Category?.toLowerCase() === 'adult');
        const childEntry = rawPrices.find(p => p.Category?.toLowerCase() === 'child');
        
        const rate = await getSGDtoIDR();
        const adultIDR = Math.ceil(parsePrice(adultEntry?.Price || 0) * rate);
        const childIDR = Math.ceil(parsePrice(childEntry?.Price || adultEntry?.Price || 0) * rate);
        
        res.json({ 
            schedule: departTrips,
            returnSchedule: returnTrips,
            pricePerPax: adultIDR,
            childPricePerPax: childIDR
        });
    } catch (error) {
        console.error('Schedule fetch error:', error.message);
        res.json({ schedule: [] });
    }
}

// Ferry checkout
const getFerryCheckout = async (req, res, draftOrder) => {
    const rows = await productModel.getFerryById(draftOrder.productId);
    if (!rows.length) return res.redirect('/');

    const product = rows[0];
    const totalPax = (draftOrder.adults || 0) + (draftOrder.children || 0) + (draftOrder.infants || 0);

    // Check capacity
    try {
        const capacity = await majesticService.getTripCapacity(
            draftOrder.tripCode,
            draftOrder.departureDate,
            totalPax
        );

        if (Array.isArray(capacity) && capacity[0]?.Status === 'Error') {
            console.warn(`[FERRY] Capacity check failed for ${draftOrder.tripCode}:`, capacity[0].Message);
            return res.redirect(`/ferry/${draftOrder.productId}?error=no_seats`);
        }
    } catch (error) {
        console.error('[FERRY] Capacity check error:', error.message);
    }

    // Check Return Trip capacity
    const isTwoWay = !!draftOrder.returnTripCode;

    if(isTwoWay) {
        try {
            const returnCapacity = await majesticService.getTripCapacity(
                draftOrder.returnTripCode,
                draftOrder.returnDate,
                totalPax
            );
            if (Array.isArray(returnCapacity) && returnCapacity[0]?.Status === 'Error') {
                return res.redirect(`/ferry/${draftOrder.productId}?error=no_seats`);
            }
        } catch (err) {
            console.error('[FERRY] Return capacity check error:', err.message);
        }
    }

    // Get Prices
    const rawPrices = await majesticService.getPriceByTripCode(draftOrder.tripCode, isTwoWay ? '2' : '1');
    const priceList = Array.isArray(rawPrices) ? rawPrices : [];

    const parsePrice = (str) => parseFloat(String(str || '0').replace(/[^0-9.]/g, '') || 0);

    // Adult and Child Category price
    const adultPrice = priceList.find(p => p.Category?.toLowerCase() === 'adult');
    const childPrice = priceList.find(p => p.Category?.toLowerCase() === 'child');

    const rate = await getSGDtoIDR();
    const adultIDR = Math.ceil(parsePrice(adultPrice?.Price || 0) * rate);
    const childIDR = Math.ceil(parsePrice(childPrice?.Price || adultPrice?.Price || 0) * rate);

    const basePrice = (adultIDR * draftOrder.adults) + (childIDR * draftOrder.children);
    const taxRate = parseFloat(process.env.TAX_RATE) || 0.11;
    const platformFee = parseInt(process.env.PLATFORM_FEE) || 5000;
    const grandTotal = basePrice + (basePrice * taxRate) + platformFee;

    // Fetch Nationality From API
    const countryList = await majesticService.getCountryList();

    const formattedDepartureDate = new Date(draftOrder.departureDate).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
        })

    return res.render('pages/checkout', {
        draftOrder,
        product,
        totalPax,
        basePrice,
        taxRate,
        taxAmount: basePrice * taxRate,
        platformFee,
        grandTotal,
        formattedDepartureDate,
        countryList
    });
}

module.exports = { getFerryList, getFerryDetail, getScheduleByDate, getFerryCheckout };