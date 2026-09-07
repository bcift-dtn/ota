const db = require('../config/db');

// New Order
const createOrder = async ({ userId, draftOrder, basePrice, taxAmount, platformFee, grandTotal }) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const orderRes = await client.query(
            `
                INSERT INTO ota.orders
                    (user_id, total_amount, base_price, tax_amount, platform_fee, status, payment_status, payment_method, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'pending', 'pending', 'online', NOW(), NOW())
                RETURNING id
            `,
            [userId, grandTotal, basePrice, taxAmount, platformFee]
        );

        const orderId = orderRes.rows[0].id;

        await client.query(
            `
                INSERT INTO ota.order_items
                    (order_id, product_id, quantity, unit_price, start_date, notes, passengers)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
                orderId,
                draftOrder.productId,
                (draftOrder.adults || 1) + (draftOrder.children || 0),
                basePrice,
                draftOrder.departureDate || draftOrder.visitDate || null,
                draftOrder.productType,
                draftOrder.passengers ? JSON.stringify({
                    passengers: draftOrder.passengers,
                    ferrySnapshot: draftOrder.ferrySnapshot || null
                }) : null
            ]
        );

        await client.query('COMMIT');
        return orderId;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getOrderById = async (orderId) => {
    const res = await db.query(`SELECT * FROM ota.orders WHERE id = $1`, [orderId]);
    return res.rows[0] || null;
};

const getOrderByInquiryId = async (inquiryId) => {
    const res = await db.query(`SELECT * FROM ota.orders WHERE inquiry_id = $1`, [inquiryId]);
    return res.rows[0] || null;
};

const updateOrderPaymentStatus = async (orderId, { status, paymentStatus, inquiryId, transactionId, authCode, maskedCard }) => {
    await db.query(
        `
            UPDATE ota.orders SET
                status          = COALESCE($2, status),
                payment_status  = COALESCE($3, payment_status),
                inquiry_id      = COALESCE($4, inquiry_id),
                transaction_id  = COALESCE($5, transaction_id),
                auth_code       = COALESCE($6, auth_code),
                masked_card     = COALESCE($7, masked_card),
                paid_at         = CASE WHEN $3 = 'paid' THEN NOW() ELSE paid_at END,
                updated_at      = NOW()
            WHERE id = $1
        `,
        [orderId, status, paymentStatus, inquiryId, transactionId, authCode, maskedCard]
    );
};


// My Order
const getUserOrderCounts = async (userId) => {
    const res = await db.query(
        `
            SELECT
                COUNT (*) AS all_count,
                COUNT (*) FILTER (
                    WHERE o.payment_status = 'paid'
                    AND (oi.start_date >= CURRENT_DATE OR oi.start_date IS NULL)
                    AND o.status NOT IN ('cancelled', 'failed')
                ) AS upcoming_count,
                COUNT(*) FILTER (
                    WHERE o.status = 'completed'
                    OR (o.payment_status = 'paid' AND oi.start_date < CURRENT_DATE AND o.status NOT IN ('cancelled', 'failed'))
                ) AS completed_count,
                COUNT(*) FILTER (
                    WHERE o.status = 'cancelled' OR o.payment_status = 'failed'
                ) AS cancelled_count
            FROM ota.orders o
            JOIN ota.order_items oi ON oi.order_id = o.id
            WHERE o.user_id = $1
        `, [userId]
    );

    const row = res.rows[0] || {};
    return {
        all: parseInt(row.all_count || 0),
        upcoming: parseInt(row.upcoming_count || 0),
        completed: parseInt(row.completed_count || 0),
        cancelled: parseInt(row.cancelled_count || 0)
    };
};

const getUserOrders = async ({ userId, status = 'all', productType = 'all', search = '', page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const conditions = ['o.user_id = $1'];
    const values = [userId];
    let paramIndex = 2;

    // Status filter
    if (status === 'upcoming') {
        conditions.push(`(o.payment_status = 'paid' AND (oi.start_date >= CURRENT_DATE OR oi.start_date IS NULL) AND o.status NOT IN ('cancelled', 'failed'))`);
    } else if (status === 'completed') {
        conditions.push(`(o.status = 'completed' OR (o.payment_status = 'paid' AND oi.start_date < CURRENT_DATE AND o.status NOT in ('cancelled', 'failed')))`);
    } else if (status === 'cancelled') {
        conditions.push(`(o.status = 'cancelled' OR o.payment_status = 'failed')`);
    }

    // Product type filter
    if (productType && productType !== 'all') {
        conditions.push(`p.type = $${paramIndex}`);
        values.push(productType);
        paramIndex++
    }

    // Search Query
    if (search && search.trim()) {
        const cleanSearch = `%${search.trim()}%`;
        conditions.push(`(
            p.title ILIKE $${paramIndex}
            OR CAST(o.id AS TEXT) ILIKE $${paramIndex}
            OR ('MT-' || UPPER(p.type) || '-' || CAST(o.id AS TEXT)) ILIKE $${paramIndex}
        )`);
        values.push(cleanSearch);
        paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Page Count
    const countRes = await db.query(
        `
            SELECT COUNT (*)
            FROM ota.orders o
            JOIN ota.order_items oi ON oi.order_id = o.id
            JOIN ota.products p ON p.id = oi.product_id
            WHERE ${whereClause}
        `, values
    );

    const totalOrders = parseInt(countRes.rows[0]?.count || 0);
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    // Fetch paginated orders
    const dataValues = [...values, limit, offset];
    const ordersRes = await db.query(
        `
            SELECT 
                o.id,
                o.total_amount,
                o.base_price,
                o.status,
                o.payment_status,
                o.payment_method,
                o.created_at,
                oi.id AS order_item_id,
                oi.quantity,
                oi.unit_price,
                oi.start_date,
                oi.notes,
                oi.passengers,
                oi.vendor_booking_code,
                p.id AS product_id,
                p.title AS product_title,
                p.type AS product_type,
                p.image_url AS product_image,
                sc.reference_id,
                sc.secret_code
            FROM ota.orders o
            JOIN ota.order_items oi ON oi.order_id = o.id
            JOIN ota.products p ON p.id = oi.product_id
            LEFT JOIN ota.secret_codes sc ON sc.order_item_id = oi.id
            WHERE ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, dataValues
    );

    return {
        orders: ordersRes.rows,
        totalOrders,
        totalPages,
        currentPage: page
    }
}

module.exports = {
    createOrder,
    getOrderById,
    getOrderByInquiryId,
    updateOrderPaymentStatus,
    getUserOrderCounts,
    getUserOrders
};