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
                    (order_id, product_id, quantity, unit_price, start_date, notes)
                VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                orderId,
                draftOrder.productId,
                (draftOrder.adults || 1) + (draftOrder.children || 0),
                basePrice,
                draftOrder.departureDate || draftOrder.visitDate || null,
                draftOrder.productType
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

module.exports = {
    createOrder,
    getOrderById,
    getOrderByInquiryId,
    updateOrderPaymentStatus
};