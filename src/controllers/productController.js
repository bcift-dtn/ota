const { getCarRentalListings, getCarRentalById, getPackagesByProductIds, getCarRentalCount, 
  getActivitiesCount, getActivitiesListings, getActivitiesById, getProductAmenities, getPackageAmenities, 
  getPackagePricingTiers, getPackageTimeSlots, getProductAddons } = require('../models/productModel');

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
      duration_hours: r.duration_hours,
      pricing_type: r.pricing_type,
      important_info: r.package_important_info,
      itinerary: r.package_itinerary,
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

    return res.render('pages/activities-detail', {
      product,
      selectedPackage,
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

module.exports = { getCarRentals, getCarRentalDetail, getActivities, getActivitiesDetail };