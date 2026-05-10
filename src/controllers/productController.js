const { getCarRentalListings, getCarRentalById, getPackagesByProductIds } = require('../models/productModel');

const getCarRentals = async (req, res) => {
  const {
    'driver-needs': driverNeeds,
    carRentalLocation,
    carPickupDate,
    carReturnDate
  } = req.query;
  
  try {
    const carListing = await getCarRentalListings();

    const productIds = carListing.map(p => p.id);
    const allPackages = await getPackagesByProductIds(productIds);

    const formattedProducts = carListing.map(p => ({
      ...p,
      formatted_starting_price: Number(p.starting_price).toLocaleString('id-ID'),
      packages: allPackages
        .filter(pkg => pkg.product_id === p.id)
        .map(pkg => ({
          ...pkg,
          formatted_price: Number(pkg.normal_price).toLocaleString('id-ID')
        }))
    }));

    return res.render('pages/car-rental-list',  { 
      products: formattedProducts,
      breadcrumbs: [
        { label: 'Home', url:'/'},
        { label: 'Car Rental', url: '/products/car-rental'}
      ],
      searchParams: {
        driverNeeds: driverNeeds || 'with-driver',
        location: carRentalLocation || '',
        pickupDate: carPickupDate || '',
        returnDate: carReturnDate || ''
      }
    });

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const getCarRentalDetail = async (req, res) => {
  const carId = parseInt(req.params.id);

  if (isNaN(carId)) return res.status(404).render('pages/404', { message: 'Car not found.'});

  try {
    const rows = await getCarRentalById(carId);

    if (rows.length === 0) return res.status(404).render('pages/404', { message: 'Car not found.'});

    const seenPackageIds = new Set();
    const packages = rows.filter (r => {
      if (r.package_id && !seenPackageIds.has(r.package_id)) {
        seenPackageIds.add(r.package_id);
        return true;
      } 
      return false;
    }).map (r => ({
      id: r.package_id,
      name: r.package_name,
      description: r.package_description,
      normal_price: r.package_price,
      agent_price: r.package_agent_price,
      max_quantity: r.max_quantity,
      duration_hours: r.duration_hours,
      formatted_price: Number(r.package_price).toLocaleString('id-ID')
    }));

    const startingPrice = packages.length > 0
      ? Math.min(...packages.map(p => Number(p.normal_price)))
      : 0;

    const product = {
      ...rows[0],
      formatted_starting_price: startingPrice.toLocaleString('id-ID'),
      images: [...new Set(rows.map(r => r.image_url).filter(Boolean))],
      packages: packages || []
    }

    const selectedPackageId = parseInt(req.query.packageId) || null;
    const selectedPackage = packages.find(p => p.id === selectedPackageId) || packages[0];


    return res.render('pages/car-rental-detail' , {
      product,
      selectedPackage,
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

module.exports = { getCarRentals, getCarRentalDetail };