const { getCarRentalListings, getCarRentalById } = require('../models/productModel');

const getCarRentals = async (req, res) => {
  const {
    'driver-needs': driverNeeds,
    carRentalLocation,
    carPickupDate,
    carReturnDate
  } = req.query;
  
  try {
    const carListing = await getCarRentalListings();
    const formattedProdutcs = carListing.map(p => ({
      ...p,
      formatted_price: Number(p.normal_price).toLocaleString('id-ID')
    }));

    return res.render('pages/car-rental-list',  { 
      products: formattedProdutcs,
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

  if (isNaN(carId)) return res.status(404).render('/pages/404', { message: 'Car not found.'});

  try {
    const rows = await getCarRentalById(carId);

    if (rows.length === 0) return res.status(404).render('/pages/404', { message: 'Car not found.'});

    const product = {
      ...rows[0],
      formatted_price: Number(rows[0].normal_price).toLocaleString('id-ID'),
      images: rows.map(r => r.image_url).filter(Boolean)
    }

    return res.render('pages/car-rental-detail' , {
      product,
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