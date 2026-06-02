const pool = require('../config/db');

// im not using paramter at the moment, but shouldnt we use the
// data-form from the home search component?
const getCarRentalListings = async (limit, offset) => {
  const query = `
    SELECT
      p.*,
      cd.transmission, cd.seats, cd.with_driver,
      MAX(pi.image_url) as image_url,
      MIN(pp.normal_price) as starting_price
    FROM ota.products p
    JOIN ota.car_details cd ON p.id = cd.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id AND pi.is_primary = true
    LEFT JOIN ota.product_packages pp ON p.id = pp.product_id AND pp.is_active = true
    WHERE p.type = 'car_rental' AND p.is_active = true
    GROUP BY p.id, cd.transmission, cd.seats, cd.with_driver
    ORDER BY p.priority DESC, p.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  try {
    const res = await pool.query(query, [limit, offset]);
    return res.rows;
  } catch (err) {
    throw err;
  }
}

const getCarRentalCount = async () => {
  const query = `
    SELECT COUNT(p.id) as total
    from ota.products p 
    where p.type = 'car_rental' AND p.is_active = true
  `;

  try {
    const res = await pool.query(query);
    return parseInt(res.rows[0].total);
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
      pp.important_info as package_important_info,
      pp.agent_price as package_agent_price,
      pp.max_quantity, pp.max_pax_per_unit, pp.sort_order as package_sort_order, pp.duration_hours
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

const getActivitiesListings = async (limit, offset) => {
  const query = `
    SELECT
      p.*,
      ad.duration_hours, ad.max_pax, ad.with_driver,
      MAX(pi.image_url) as image_url,
      MIN(pp.normal_price) as starting_price
    FROM ota.products p
    JOIN ota.activity_details ad on p.id = ad.product_id
    LEFT JOIN ota.product_images pi on p.id = pi.product_id and pi.is_primary = true
    LEFT JOIN ota.product_packages pp on p.id = pp.product_id and pp.is_active = true
    WHERE p.type = 'activities' and p.is_active = true
    GROUP BY p.id, ad.duration_hours, ad.max_pax, ad.with_driver
    ORDER BY p.priority DESC, p.created_at DESC
    LIMIT $1 OFFSET $2 
  `

  try {
    const res = await pool.query(query, [limit, offset]);
    return res.rows;
  } catch (err) {
    throw err;
  }
}


const getActivitiesCount = async () => {
  const query = `
    SELECT COUNT(p.id) as total
    FROM ota.products p
    WHERE p.type = 'activities' AND p.is_active = true
  `

  try {
    const res = await pool.query(query)
    return parseInt(res.rows[0].total)
  } catch (err) {
    throw err
  }
}

const getActivitiesById = async (id) => {
  const query = `
    SELECT
      p.*,
      ad.duration_hours, ad.max_pax, ad.with_driver,
      pi.image_url, pi.is_primary, pi.sort_order as image_sort_order, pi.package_id as image_package_id,
      pp.id as package_id, pp.name as package_name,
      pp.important_info as package_important_info,
      pp.description as package_description,
      pp.normal_price as package_price,
      pp.agent_price as package_agent_price,
      pp.max_quantity, pp.max_pax_per_unit, pp.sort_order as package_sort_order, pp.duration_hours, pp.pricing_type,
      pp.itinerary as package_itinerary
    FROM ota.products p
    JOIN ota.activity_details ad ON p.id = ad.product_id
    LEFT JOIN ota.product_images pi ON p.id = pi.product_id
    LEFT JOIN ota.product_packages pp ON p.id = pp.product_id AND pp.is_active = true
    WHERE p.id = $1 AND p.type = 'activities' AND p.is_active = true
    ORDER BY pi.sort_order ASC, pp.sort_order ASC
  `

  try {
    const res = await pool.query(query, [id])
    return res.rows
  } catch (err) {
    throw err
  }
}

const getProductAmenities = async (productIds) => {
  if (!productIds || productIds.length === 0) return [];

  const query = `
    SELECT 
      pa.product_id, a.name, a.icon_lucide
    FROM ota.product_amenities pa
    JOIN ota.amenities a ON pa.amenity_id = a.id
    WHERE pa.product_id = ANY($1)
  `;

  try {
    const res = await pool.query(query, [productIds])
    return res.rows
  } catch (err) {
    throw err
  }
}

const getPackageAmenities = async (packageIds) => {
  if (!packageIds || packageIds.length === 0) return [];
  
  const query = `
    SELECT 
      pa.package_id, a.name, a.icon_lucide
    FROM ota.package_amenities pa
    JOIN ota.amenities a ON pa.amenity_id = a.id
    WHERE pa.package_id = ANY($1)
  `;

  try {
    const res = await pool.query(query, [packageIds])
    return res.rows
  } catch (err) {
    throw err
  }
}

const getPackagePricingTiers = async (packageIds) => {
  if (!packageIds || packageIds.length === 0) return [];

  const query = `
    SELECT * FROM ota.package_pricing_tiers
    WHERE package_id = ANY($1)
    ORDER BY id ASC
  `;

  try {
    const res = await pool.query(query, [packageIds]);
    return res.rows;
  } catch (err) {
    throw err;
  }
}

const getPackageTimeSlots = async (packageIds) => {
  if (!packageIds || packageIds.length === 0) return [];

  const query = `
    SELECT * FROM ota.package_time_slots
    WHERE package_id = ANY($1)
  `;

  try {
    const res = await pool.query(query, [packageIds]);
    return res.rows;
  } catch (err) {
    throw err;
  }
} 

const getProductAddons = async (productId, packageIds) => {
  if (!productId) return [];

  const query = `
    SELECT * FROM ota.product_addons
    WHERE product_id = $1
    AND is_active = true
    AND (package_id IS NULL OR package_id = ANY($2))
    ORDER BY id ASC
  `;

  try {
    const res = await pool.query(query, [productId, packageIds || []]);
    return res.rows;
  } catch (err) {
    throw err;
  }
}

module.exports = { getCarRentalListings, getCarRentalById, getPackagesByProductIds, getCarRentalCount, 
  getActivitiesCount, getActivitiesListings, getActivitiesById, getProductAmenities, getPackageAmenities, getPackagePricingTiers, getPackageTimeSlots, getProductAddons };