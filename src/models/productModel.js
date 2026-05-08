const pool = require('../config/db');

// im not using paramter at the moment, but shouldnt we use the
// data-form from the home search component?
const getCarRentalListings = async () => {
  const query = `
    SELECT 
      p.*,
      cd.transmission, cd.seats, cd.with_driver,
      pi.image_url
    FROM ota.products p
    JOIN ota.car_details cd ON p.id = cd.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id and pi.is_primary = true
    WHERE p.type = 'car_rental' AND p.is_active = true
    ORDER BY p.priority DESC, p.created_at DESC;
  `

  try {
    const res = await pool.query(query);
    return res.rows;
  } catch (err) {
    throw err;
  }
}

const getCarRentalById = async (id) => {
  const query = `
    SELECT
      p.*,
      cd.brand, cd.model, cd.year, cd.transmission,
      cd.seats, cd.with_driver, cd.pickup_location, cd.operating_hours,
      pi.image_url, pi.is_primary, pi.sort_order
    FROM ota.products p
    JOIN ota.car_details cd ON p.id = cd.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id
    WHERE p.id = $1 AND p.type = 'car_rental' AND p.is_active = true
    ORDER by pi.sort_order ASC
  `

  try {
    const res = await pool.query(query, [id]);
    return res.rows;
  } catch (err) {
    throw err;
  }
};

module.exports = { getCarRentalListings, getCarRentalById };