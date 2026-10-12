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
            COUNT(DISTINCT p.seller_id) FILTER (WHERE o.settlement_status = 'ready_for_payout') AS vendors_ready_count
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

const updateSettlementStatus = async (orderId, status) => {
    const validStatuses = ['awaiting_redemption', 'ready_for_payout', 'in_review', 'reconciled'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid settlement status');
    }

    const settledAtClause = status === 'reconciled' ? 'NOW()' : 'NULL';

    const query = `
        UPDATE ota.orders
        SET settlement_status = $1,
            settled_at = ${settledAtClause},
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, settlement_status, settled_at;
    `;
    const res = await db.query(query, [status, orderId]);
    return res.rows[0];
};

const updateBatchSettlementStatus = async (orderIds, status) => { 
    const validStatuses = ['ready_for_payout', 'in_review', 'reconciled'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid settlement status');
    }

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return [];
    }

    const settledAtClause = status === 'reconciled' ? 'NOW()' : 'NULL';

    const query = `
        UPDATE ota.orders
        SET settlement_status = $1,
            settled_at = ${settledAtClause},
            updated_at = NOW()
        WHERE id = ANY($2::int[])
          AND settlement_status != 'awaiting_redemption'
        RETURNING id, settlement_status, settled_at;
    `;

    const res = await db.query(query, [status, orderIds]);
    return res.rows;
}

const getRefundRequests = async (status = 'pending') => {
    // status: 'pending' (approved by admin, awaiting payout) or 'refunded' (payout completed)
    const isCompleted = status === 'refunded';
    const query = `
        SELECT
            oc.id AS cancel_id,
            oc.order_id,
            oc.reason,
            oc.refund_amount,
            oc.cancel_fee,
            oc.status AS cancel_status,
            oc.bank_name,
            oc.bank_account_no,
            oc.bank_account_holder,
            oc.created_at AS requested_at,
            oc.reviewed_at AS approved_at,
            oc.refunded_at,
            oc.refund_reference,
            o.total_amount,
            o.payment_status,
            o.transaction_id,
            p.title AS product_title,
            p.type AS product_type,
            u.full_name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone
        FROM ota.order_cancellations oc
        JOIN ota.orders o ON o.id = oc.order_id
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        JOIN ota.users u ON u.id = o.user_id
        WHERE oc.status = ${isCompleted ? "'completed'" : "'approved'"}
          AND o.payment_status = ${isCompleted ? "'refunded'" : "'refund_pending'"}
        ORDER BY oc.reviewed_at DESC
    `;
    const res = await db.query(query);
    return res.rows;
};

const completeManualRefund = async ({ cancelId, orderId, accountingId, refundReference }) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE ota.orders 
             SET payment_status = 'refunded', updated_at = NOW() 
             WHERE id = $1`,
            [orderId]
        );

        await client.query(
            `UPDATE ota.order_cancellations 
             SET status = 'refunded', 
                 refunded_at = NOW(), 
                 refunded_by = $2, 
                 refund_reference = $3 
             WHERE id = $1`,
            [cancelId, accountingId, refundReference || null]
        );

        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    getSettlementMetrics,
    getSettlementOrders,
    getAvailablePeriods,
    updateSettlementStatus,
    updateBatchSettlementStatus,
    getRefundRequests,
    completeManualRefund
};
