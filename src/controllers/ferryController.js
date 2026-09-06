const productModel = require('../models/productModel');
const majesticService = require('../services/majesticService');
const { getSGDtoIDR } = require('../services/rateService');

const PORT_CODES = {
    'harbourfront': 'HBF',
    'tanah-merah': 'TMF',
    'batam-center-terminal': 'BTC',
    'sekupang': 'SKP',
    'tanjung-pinang': 'TNJ',
    'HBF': 'HBF', 'TMF': 'TMF', 'BTC': 'BTC', 'SKP': 'SKP', 'TNJ': 'TNJ'
}

const PORT_NAMES = {
    'HBF': 'Harbourfront',
    'TMF': 'Tanah Merah',
    'BTC': 'Batam Center Terminal',
    'SKP': 'Sekupang',
    'TNJ': 'Tanjung Pinang'
}

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

        const departPortCode = PORT_CODES[req.query.fromPort] || product.depart_port;
        const arrivalPortCode = PORT_CODES[req.query.toPort] || product.arrival_port;

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
                departPortCode,
                arrivalPortCode,
                PORT_NAMES,
            });
        }

        res.render('pages/ferry-detail', {
            product,
            images: rows,
            schedule: [],
            prices: [],
            isApiDriven: false,
            query: req.query,
            departPortCode,
            arrivalPortCode,
            PORT_NAMES,
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
        const departPort = PORT_CODES[req.query.fromPort] || product.depart_port;
        const arrivalPort = PORT_CODES[req.query.toPort] || product.arrival_port;

        const apiData = await majesticService.getSchedule({
            departPort: departPort,
            arrivalPort: arrivalPort,
            travelDate: date,
            journeyType: isTwoWay? '2' : '1',
            isReturnOpenTicket: '0',
            returnDepartPort: isTwoWay ? (PORT_CODES[req.query.returnFromPort] || arrivalPort) : '',
            returnArrivalPort: isTwoWay ? (PORT_CODES[req.query.returnToPort]  || departPort)  : '',
            returnTravelDate: isTwoWay ? returnDate : ''
        });

        const scheduleObj = Array.isArray(apiData) ? apiData[0] : apiData;
        const departTrips = scheduleObj?.DepartTrips || [];
        const returnTrips = scheduleObj?.ReturnTrips || [];

        const rate = await getSGDtoIDR();
        const rawPrices = scheduleObj?.Price || [];

        const parsePrice = (str) => {
            const val = parseFloat(String(str || '0').replace(/[^0-9.]/g, '') || 0);
            return String(str).includes('SGD') ? Math.ceil(val * rate) : Math.ceil(val);
        };

        let adultIDR = 0, childIDR = 0;

        if (rawPrices.length > 0) {
            const adultEntry = rawPrices.find(p => p.Category?.toLowerCase() === 'adult');
            const childEntry = rawPrices.find(p => p.Category?.toLowerCase() === 'child');
            adultIDR = parsePrice(adultEntry?.Price || '0');
            childIDR = parsePrice(childEntry?.Price || adultEntry?.Price || '0');
        } else if (departTrips.length > 0) {
            const priceData = await majesticService.getPriceByTripCode(departTrips[0].TripCode);
            const priceList = Array.isArray(priceData) ? priceData : [];
            const adultEntry = priceList.find(p => p.Category?.toLowerCase() === 'adult');
            const childEntry = priceList.find(p => p.Category?.toLowerCase() === 'child');
            adultIDR = parsePrice(adultEntry?.Price || '0');
            childIDR = parsePrice(childEntry?.Price || adultEntry?.Price || '0');
        }
        
        // res.json({ 
        //     schedule: departTrips,
        //     returnSchedule: returnTrips,
        //     pricePerPax: adultIDR,
        //     childPricePerPax: childIDR
        // });

        const isTestMode = process.env.NODE_ENV !== 'production';
        res.json({ 
            schedule: departTrips,
            returnSchedule: returnTrips,
            pricePerPax: isTestMode ? 1 : adultIDR,
            childPricePerPax: isTestMode ? 1 : childIDR
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
    const rawPrices = await majesticService.getPriceByTripCode(
        draftOrder.tripCode,
        isTwoWay ? (draftOrder.returnTripCode || '') : '',
        isTwoWay ? '2' : '1'
    );

    const parsePrice = (str) => parseFloat(String(str || '0').replace(/[^0-9.]/g, '') || 0);
    const priceList = Array.isArray(rawPrices) ? rawPrices : [];
    const adultPrice = priceList.find(p => p.Category?.toLowerCase() === 'adult');
    const childPrice = priceList.find(p => p.Category?.toLowerCase() === 'child');
    
    const adultIDR = Math.ceil(parsePrice(adultPrice?.Price || 0));
    const childIDR = Math.ceil(parsePrice(childPrice?.Price || adultPrice?.Price || 0));
    
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

    req.session.draftOrder = {
        ...draftOrder,
        basePrice,
        taxAmount: basePrice * taxRate,
        platformFee,
        grandTotal
    }        

    return res.render('pages/checkout', {
        draftOrder: req.session.draftOrder,
        product,
        isTwoWay,
        PORT_NAMES,
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