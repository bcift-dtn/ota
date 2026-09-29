const db = require('../config/db');

const getSettlementMetrics = async ({ month, year, productType, status, search }) => { 
    const conditions = ["o.payment_status = 'paid'", "o.status NOT IN ('cancelled', 'failed')"];
    const values = [];
    let idx = 1;

    if (productType && productType !== 'all') {
        conditions.push(`p.type = $${idx++}`);
        values.push(productType);
    }

    if (status && status !== 'all') {
        conditions.push(`COALESCE(o.settlement_status, 'pending') = $${idx++}`);
        values.push(status);
    }

    if (month && year) {
        conditions.push(`EXTRACT(MONTH FROM o.created_at) = $${idx++}`);
        values.push(month);
        conditions.push(`EXTRACT(YEAR FROM o.created_at) = $${idx++}`);
        values.push(year);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
        SELECT
            COALESCE(SUM(o.base_price - COALESCE(o.pg_fee, 0)), 0) AS net_settlement,
            COALESCE(SUM(o.platform_fee), 0) AS platform_commission,
            COALESCE(SUM(o.tax_amount), 0) AS tax_withheld,
            COUNT(DISTINCT p.seller_id) AS vendors_count
        FROM ota.orders o
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        WHERE ${whereClause}
    `;

    const res = await db.query(query, values);
    return res.rows[0];
}

const getSettlementOrders = async ({ search = '', month, year, status = 'all', productType = 'all', page = 1, limit = 10 }) => { 
    const conditions = ["o.payment_status = 'paid'", "o.status NOT IN ('cancelled', 'failed')"];
    const values = [];
    let idx = 1;

    if (productType && productType !== 'all') {
        conditions.push(`p.type = $${idx++}`);
        values.push(productType);
    }

    if (status && status !== 'all') {
        conditions.push(`COALESCE(o.settlement_status, 'pending') = $${idx++}`);
        values.push(status);
    }

    if (month && year) {
        conditions.push(`EXTRACT(MONTH FROM o.created_at) = $${idx++}`);
        values.push(month);
        conditions.push(`EXTRACT(YEAR FROM o.created_at) = $${idx++}`);
        values.push(year);
    }

    if (search && search.trim()) {
        const clean = `%${search.trim()}%`;
        conditions.push(`(
            p.title ILIKE $${idx}
            OR COALESCE(sp.company_name, seller_u.full_name) ILIKE $${idx}
            OR CAST(o.id AS TEXT) ILIKE $${idx}
            OR ('INV-' || TO_CHAR(o.created_at, 'YYYY') || '-' || LPAD(o.id::text, 4, '0')) ILIKE $${idx}
        )`);
        values.push(clean);
        idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countRes = await db.query(
        `
        SELECT COUNT(DISTINCT o.id)
        FROM ota.orders o
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        LEFT JOIN ota.users seller_u ON seller_u.id = p.seller_id
        LEFT JOIN ota.seller_profiles sp ON sp.user_id = seller_u.id
        WHERE ${whereClause}
        `,
        values
    );

    const totalOrders = parseInt(countRes.rows[0]?.count || 0);
    const totalPages = limit ? (Math.ceil(totalOrders / limit) || 1) : 1;

    // Build pagination clause (only if limit is provided)
    const dataValues = [...values];
    let paginationClause = '';
    if (limit) {
        const offset = (page - 1) * limit;
        dataValues.push(limit, offset);
        paginationClause = `LIMIT $${idx++} OFFSET $${idx++}`;
    }

    // Fetch Rows
    const dataRes = await db.query(
        `
        SELECT
            o.id AS order_id,
            'INV-' || TO_CHAR(o.created_at, 'YYYY') || '-' || LPAD(o.id::text, 4, '0') AS invoice_code,
            COALESCE(sp.company_name, seller_u.full_name, 'MEGATERRA') AS vendor_name,
            p.title AS product_title,
            p.type AS product_type,
            o.created_at AS order_date,
            o.total_amount AS gross_amount,
            o.tax_amount,
            o.platform_fee,
            COALESCE(o.pg_fee, 0) AS pg_fee,
            (o.base_price - COALESCE(o.pg_fee, 0)) AS net_payable,
            COALESCE(o.settlement_status, 'pending') AS settlement_status
        FROM ota.orders o
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        LEFT JOIN ota.users seller_u ON seller_u.id = p.seller_id
        LEFT JOIN ota.seller_profiles sp ON sp.user_id = seller_u.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        ${paginationClause}
        `,
        dataValues
    );


    return {
        orders: dataRes.rows,
        totalOrders,
        totalPages,
        currentPage: page
    };
};

const getAvailablePeriods = async () => {
    const query = `
        SELECT DISTINCT
            EXTRACT(YEAR FROM o.created_at)::int AS year,
            EXTRACT(MONTH FROM o.created_at)::int AS month
        FROM ota.orders o
        WHERE o.payment_status = 'paid'
          AND o.status NOT IN ('cancelled', 'failed')
        ORDER BY year DESC, month DESC;
    `;
    const res = await db.query(query);
    return res.rows;
};

module.exports = {
    getSettlementMetrics,
    getSettlementOrders,
    getAvailablePeriods
};
