const pool = require('../config/db');

// im not using paramter at the moment, but shouldnt we use the
// data-form from the home search component?
const getCarRentalListings = async () => {
  const query = `
    SELECT
      p.*,
      cd.transmission, cd.seats, cd.with_driver,
      pi.image_url,
      MIN(pp.normal_price) as starting_price
    FROM ota.products p
    JOIN ota.car_details cd ON p.id = cd.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id AND pi.is_primary = true
    LEFT JOIN ota.product_packages pp ON p.id = pp.product_id AND pp.is_active = true
    WHERE p.type = 'car_rental' AND p.is_active = true
    GROUP BY p.id, cd.transmission, cd.seats, cd.with_driver, pi.image_url
    ORDER BY p.priority DESC, p.created_at DESC
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
      pi.image_url, pi.is_primary, pi.sort_order as image_sort_order,
      pp.id as package_id, pp.name as package_name,
      pp.description as package_description,
      pp.normal_price as package_price,
      pp.agent_price as package_agent_price,
      pp.max_quantity, pp.sort_order as package_sort_order
    FROM ota.products p
    JOIN ota.car_details cd on p.id = cd.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id
    LEFT JOIN ota.product_packages pp ON p.id = pp.product_id AND pp.is_active = true
    WHERE p.id = $1 AND p.type = 'car_rental' AND p.is_active = true
    ORDER BY pi.sort_order ASC, pp.sort_order ASC
  `

  try {
    const res = await pool.query(query, [id]);
    return res.rows;
  } catch (err) {
    throw err;
  }
};

const getPackagesByProductIds = async (productIds) => {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  const query = `
    SELECT *
    FROM ota.product_packages
    WHERE product_id = ANY($1) AND is_active = true
    ORDER BY product_id, sort_order ASC
  `;
  
  try {
    const res = await pool.query(query, [productIds]);
    return res.rows;
  } catch (err) {
    throw err;
  }
}

module.exports = { getCarRentalListings, getCarRentalById, getPackagesByProductIds };