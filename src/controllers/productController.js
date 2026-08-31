const { getCarRentalListings, getCarRentalById, getPackagesByProductIds, getCarRentalCount, 
  getActivitiesCount, getActivitiesListings, getActivitiesById, getProductAmenities, getPackageAmenities, 
  getPackagePricingTiers, getPackageTimeSlots, getProductAddons } = require('../models/productModel');

const { getFerryCheckout } = require('./ferryController');

const { createOrder } = require('../models/orderModel');
const { createInquiry } = require('../services/yokkeService');

const getCarRentals = async (req, res) => {
  const {
    'driver-needs': driverNeeds,
    carRentalLocation,
    carPickupDate,
    carReturnDate,
  } = req.query;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;



  try {
    const totalItems = await getCarRentalCount();
    const totalPages = Math.ceil(totalItems / limit);

    const carListing = await getCarRentalListings(limit, offset);

    const productIds = carListing.map(p => p.id);
    const allPackages = await getPackagesByProductIds(productIds);
    const amenities = await getProductAmenities(productIds);

    const formattedProducts = carListing.map(p => ({
      ...p,
      amenities: amenities.filter(a => a.product_id === p.id),
      formatted_starting_price: Number(p.starting_price).toLocaleString('id-ID'),
      packages: allPackages
        .filter(pkg => pkg.product_id === p.id)
        .map(pkg => ({
          ...pkg,
          formatted_price: Number(pkg.normal_price).toLocaleString('id-ID')
        }))
    }));

    return res.render('pages/car-rental-list', {
      products: formattedProducts,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Car Rental', url: '/products/car-rental' }
      ],
      searchParams: {
        driverNeeds: driverNeeds || 'with-driver',
        location: carRentalLocation || '',
        pickupDate: carPickupDate || '',
        returnDate: carReturnDate || ''
      },
      currentPage: page,
      totalPages: totalPages,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const getCarRentalDetail = async (req, res) => {
  const carId = parseInt(req.params.id);

  if (isNaN(carId)) return res.status(404).render('pages/404', { message: 'Car not found.' });

  try {
    const rows = await getCarRentalById(carId);

    if (rows.length === 0) return res.status(404).render('pages/404', { message: 'Car not found.' });

    const seenPackageIds = new Set();
    const packages = rows.filter(r => {
      if (r.package_id && !seenPackageIds.has(r.package_id)) {
        seenPackageIds.add(r.package_id);
        return true;
      }
      return false;
    }).map(r => ({
      id: r.package_id,
      name: r.package_name,
      description: r.package_description,
      normal_price: r.package_price,
      agent_price: r.package_agent_price,
      max_quantity: r.max_quantity,
      duration_hours: r.duration_hours,
      important_info: r.package_important_info,
      is_refundable: r.is_refundable,
      is_reschedulable: r.is_reschedulable,
      formatted_price: Number(r.package_price).toLocaleString('id-ID')
    }));

    const productAmenities = await getProductAmenities([carId]);
    const packageIds = packages.map(p => p.id);
    const packageAmenities = await getPackageAmenities(packageIds);
    packages.forEach(pkg => {
      pkg.amenities = packageAmenities.filter(a => a.package_id === pkg.id);
    });

    const startingPrice = packages.length > 0
      ? Math.min(...packages.map(p => Number(p.normal_price)))
      : 0;

    const product = {
      ...rows[0],
      amenities: productAmenities,
      formatted_starting_price: startingPrice.toLocaleString('id-ID'),
      images: [...new Set(rows.map(r => r.image_url).filter(Boolean))],
      packages: packages || []
    }

    const selectedPackageId = parseInt(req.query.packageId) || null;
    const selectedPackage = packages.find(p => p.id === selectedPackageId) || packages[0];
    const searchPickupDate = req.query.pickupDate || '';

    return res.render('pages/car-rental-detail', {
      product,
      selectedPackage,
      searchPickupDate,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Car Rental', url: '/products/car-rental' },
        { label: product.title, url: '#' }
      ]
    })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const getActivities = async (req, res) => {
  const {
    activitiesLocation,
    activitiesCheckInDate
  } = req.query

  const page = parseInt(req.query.page) || 1;
  const limit = 10; 
  const offset = (page - 1) * limit; 

  try {
    const totalItems = await getActivitiesCount();
    const totalPages = Math.ceil(totalItems / limit);

    const activitiesListing = await getActivitiesListings(limit, offset);

    const productIds = activitiesListing.map(a => a.id);
    const allPackages = await getPackagesByProductIds(productIds);

    const amenities = await getProductAmenities(productIds);

    const formattedProducts = activitiesListing.map(p => ({
      ...p,
      amenities: amenities.filter(a => a.product_id === p.id),
      formatted_starting_price: Number(p.starting_price).toLocaleString('id-ID'),
      packages: allPackages
        .filter(pkg => pkg.product_id === p.id)
        .map(pkg => ({
          ...pkg,
          formatted_price: Number(pkg.normal_price).toLocaleString('id-ID')
        }))
    }))

    return res.render('pages/activities-list', {
      products: formattedProducts,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Activities', url: '/products/activities' }
      ],
      searchParams: {
        activitiesLocation: activitiesLocation || '',
        activitiesCheckInDate: activitiesCheckInDate || ''
      },
      currentPage: page,
      totalPages: totalPages
    })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const getActivitiesDetail = async (req, res) => {
  const activityId = parseInt(req.params.id);

  if (isNaN(activityId)) return res.status(404).render('pages/404', { message: 'Activities not found.'});

  try {
    const rows = await getActivitiesById(activityId)

    if (rows.length === 0) return res.status(404).render('pages/404', { message: 'Activities not found.'})

    const seenPackageIds = new Set();
    const packages = rows.filter(r => {
      if (r.package_id && !seenPackageIds.has(r.package_id)) {
        seenPackageIds.add(r.package_id);
        return true;
      }
      return false;
    }).map(r => ({
      id: r.package_id,
      name: r.package_name,
      description: r.package_description,
      normal_price: r.package_price,
      agent_price: r.package_agent_price,
      max_quantity: r.max_quantity,
      max_pax_per_unit: r.max_pax_per_unit,
      duration_hours: r.duration_hours,
      pricing_type: r.pricing_type,
      important_info: r.package_important_info,
      itinerary: r.package_itinerary,
      is_refundable: r.is_refundable,
      is_reschedulable: r.is_reschedulable,
      formatted_price: Number(r.package_price).toLocaleString('id-ID')
    }))

    const packageIds = packages.map(p => p.id);

    const productAmenities = await getProductAmenities([activityId]);
    const packageAmenities = await getPackageAmenities(packageIds);
    const pricingTiers = await getPackagePricingTiers(packageIds);
    const timeSlots = await getPackageTimeSlots(packageIds);
    const addons = await getProductAddons(activityId, packageIds);

    packages.forEach(pkg => {
      pkg.amenities = packageAmenities.filter(a => a.package_id === pkg.id);
      pkg.pricingTiers = pricingTiers.filter(p => p.package_id === pkg.id);
      pkg.timeSlots = timeSlots.filter(t => t.package_id === pkg.id);
      pkg.addons = addons.filter(a => a.package_id === null || a.package_id === pkg.id);
    })
    
    const startingPrice = packages.length > 0 
      ? Math.min(...packages.map(p => Number(p.normal_price)))
      : 0;

    const uniqueImages = [];
    const seenUrls = new Set();

    rows.forEach(r => {
      if (r.image_url && !seenUrls.has(r.image_url)) {
        seenUrls.add(r.image_url);
        uniqueImages.push({
          url: r.image_url,
          package_id: r.image_package_id || null
        });
      }
    });

    const product = {
      ...rows[0],
      amenities: productAmenities,
      formatted_starting_price: startingPrice.toLocaleString('id-ID'),
      images: uniqueImages,
      packages: packages || []
    }

    const selectedPackageId = parseInt(req.query.packageId) || null;
    const selectedPackage = packages.find(p => p.id === selectedPackageId) || packages[0];
    const searchCheckInDate = req.query.activitiesCheckInDate || '';

    return res.render('pages/activities-detail', {
      product,
      selectedPackage,
      searchCheckInDate,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Activities', url: '/products/activities' },
        { label: product.title, url: '#' }
      ]
    })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const getCheckoutPage = async (req, res) => {
  try {
    const draftOrder = req.session.draftOrder;
    if (!draftOrder) return res.redirect('/');

    if (draftOrder.productType === 'ferry') {
      return getFerryCheckout(req, res, draftOrder);
    }

    let rows = [];

    if (draftOrder.productType === 'activities') {
      rows = await getActivitiesById(draftOrder.productId);
    } else if (draftOrder.productType === 'car_rental') {
      rows = await getCarRentalById(draftOrder.productId);
    }
    
    if (rows.length === 0) return res.redirect('/');

    const selectedPackage = rows.find(r => r.package_id === parseInt(draftOrder.packageId));
    
    let filteredBasePrice = 0;

    if (selectedPackage.pricing_type === 'per_unit') {
    
      const safeQuantity = Math.min(
        Math.max(1, parseInt(draftOrder.bookingQuantity || 1)),
        selectedPackage.max_quantity || 99
      );

      filteredBasePrice = Number(selectedPackage.package_price) * safeQuantity;

    } else if (selectedPackage.pricing_type === 'per_pax') {
      const dbTiers = await getPackagePricingTiers([selectedPackage.package_id]);

      if (draftOrder.paxBreakdown) {
          draftOrder.paxBreakdown.forEach(draftTier => {
          const matchingDbTier = dbTiers.find(db => db.tier_title.toLowerCase() === draftTier.tier);
          
          if (matchingDbTier) {
            filteredBasePrice += (Number(matchingDbTier.normal_price) * Number(draftTier.quantity));
          }
        });
      }
    }

    // Calculate Addons Price
    let filteredAddonsPrice = 0;

    if (draftOrder.addons && draftOrder.addons.length > 0) {
      const dbAddons = await getProductAddons(draftOrder.productId,[selectedPackage.package_id]);

      draftOrder.addons.forEach(draftAddon => {
        const matchingDbAddon = dbAddons.find(db => db.id === parseInt(draftAddon.id));

        if (matchingDbAddon) {
          filteredAddonsPrice += Number(matchingDbAddon.price) * Number(draftAddon.quantity);
        }
      });
    }

    filteredBasePrice += filteredAddonsPrice;

    const envFee = parseInt(process.env.PLATFORM_FEE);
    const platformFee = isNaN(envFee) ? 5000 : envFee;
    const taxRate = parseFloat(process.env.TAX_RATE) || 0.11;

    const taxAmount = filteredBasePrice * taxRate;

    const filteredGrandTotal = filteredBasePrice + taxAmount + platformFee;

    const formattedVisitDate = new Date(draftOrder.visitDate).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return res.render('pages/checkout', {
      draftOrder,
      formattedVisitDate,
      product: rows[0],
      selectedPackage,
      platformFee,
      taxRate,
      taxAmount,
      filteredBasePrice,
      filteredGrandTotal
    })
  } catch (err) {
    console.error('Checkout Error:', err);
    return res.redirect('/');
  }
}

const saveDraftOrder = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }

  const {productId, productType, totalAmount } = req.body;

  if (!productId || !productType) {
    return res.status(400).json({success : false, message: 'Invalid order data.'});
  }

  const allowedTypes = ['ferry', 'activities', 'car_rental'];
  if (!allowedTypes.includes(productType)) {
    return res.status(400).json({ success: false, message: 'Invalid product type.' });
  }

  if (totalAmount !== undefined && (isNaN(totalAmount) || Number(totalAmount) < 0)) {
    return res.status(400).json({success: false, message: 'Invalid amount.'});
  }

  try {
    req.session.draftOrder = req.body;
    return res.status(200).json({ success: true, message: 'Draft saved' });
  } catch (err){
    console.error('Draft save error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

const confirmCheckout = async (req, res) => {
  try {
    const draftOrder = req.session.draftOrder;
    const user = req.session.user;

    if (!draftOrder || !user) return res.redirect('/');

    const { grandTotal, basePrice, taxAmount, platformFee, filteredGrandTotal, filteredBasePrice } = draftOrder;
    const finalTotal = Math.round(grandTotal || filteredGrandTotal || 0);
    const finalBase = Math.round(basePrice || filteredBasePrice || 0);
    const finalTax = Math.round(taxAmount || 0);
    const finalFee = Math.round(platformFee || parseInt(process.env.PLATFORM_FEE) || 5000);
    
    const orderId = await createOrder({
      userId: user.id,
      draftOrder,
      basePrice: finalBase,
      taxAmount: finalTax,
      platformFee: finalFee,
      grandTotal: finalTotal 
    });

    const yokkeOrderId = `MT-${draftOrder.productType?.toUpperCase()}-${orderId}`;

    const itemName = draftOrder.productType === 'ferry' 
      ? `Ferry ${draftOrder.fromPort} → ${draftOrder.toPort}`
      : draftOrder.productType === 'activities' 
      ? `Activities Booking #${orderId}`
      : `Car Rental booking #${orderId}`;

    const inquiry = await createInquiry({
      orderId: yokkeOrderId,
      amount: finalTotal,
      itemName,
      quantity: 1,
      customer: {
        name: user.full_name,
        email: user.email
      }
    });

    req.session.pendingPayment = {
      orderId,
      yokkeOrderId,
      inquiryId: inquiry.id,
      checkoutUrl: inquiry.urls?.checkout
    };

    const { updateOrderPaymentStatus } = require('../models/orderModel');
    
    await updateOrderPaymentStatus(orderId, { inquiryId: inquiry.id });

    return res.redirect(inquiry.urls.checkout);
  } catch (err) {
    console.error('[CHECKOUT] Confirm error:', err.message);
    return res.redirect('/products/checkout?error=payment_failed');
  }
}

const getCheckoutResult = async (req, res) => {
  try {
    const rawOrderId = req.query.orderId || req.session?.pendingPayment?.yokkeOrderId;
    if (!rawOrderId) return res.redirect('/');

    const parts = String(rawOrderId).split('-');
    const dbOrderId = parseInt(parts.at(-1)) || null;

    if (!dbOrderId) return res.redirect('/');

    const { getOrderById } = require('../models/orderModel');
    const order = await getOrderById(dbOrderId);

    if (!order) return res.status(404).render('pages/404', { message: 'Order not found. '});

    // fetch order items
    const db = require('../config/db');
    const itemsRes = await db.query(
      `
        SELECT oi.*, p.title as product_title, p.type as product_type
        FROM ota.order_items oi
        JOIN ota.products p ON p.id = oi.product_id
        WHERE oi.order_id = $1 
      `,
      [dbOrderId]
    );

    // fetch secret code
    const secretRes = await db.query(
      `
        SELECT sc.*
        FROM ota.secret_codes sc
        JOIN ota.order_items oi ON oi.id = sc.order_item_id
        WHERE oi.order_id = $1
      `,
      [dbOrderId]
    );

    delete req.session.draftOrder;
    delete req.session.pendingPayment;

    const isPaid = order.payment_status === 'paid' || order.status === 'paid';

    return res.render('pages/checkout-result', {
      order,
      items: itemsRes.rows,
      secretCode: secretRes.rows,
      isPaid,
      rawOrderId
    });
  } catch (err) {
    console.error('[CHECKOUT RESULT] Error:', err.message);
    return res.redirect('/');
  }
};

module.exports = { 
  getCarRentals, 
  getCarRentalDetail, 
  getActivities, 
  getActivitiesDetail, 
  getCheckoutPage, 
  saveDraftOrder, 
  confirmCheckout,
  getCheckoutResult
};