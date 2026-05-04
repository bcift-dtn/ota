const { getCarRentalListings } = require('../models/productModel');

const getCarRentals = async (req, res) => {
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
      ]
    });

  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

module.exports = { getCarRentals };