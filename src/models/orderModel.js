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

        let passengersPayload = null;

        if (draftOrder.productType === 'ferry') {
            passengersPayload = JSON.stringify({
                passengers: draftOrder.passengers || [],
                ferrySnapshot: draftOrder.ferrySnapshot || null
            });
        } else if (draftOrder.productType === 'car_rental') {
            passengersPayload = JSON.stringify({
                carSnapshot: {
                    pickupLocation: draftOrder.pickupLocation || null,
                    slotTime: draftOrder.slotTime || null,
                    driverOption: draftOrder.driverNeeds || 'with-driver'
                }
            });
        } else if (draftOrder.productType === 'activities') {
            passengersPayload = JSON.stringify({
                packageId: draftOrder.packageId || null,
                passengers: draftOrder.passengers || [],
                paxBreakdown: draftOrder.paxBreakdown || []
            });
        }

        const orderItemRes = await client.query(
            `
                INSERT INTO ota.order_items
                    (order_id, product_id, quantity, unit_price, start_date, notes, passengers)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `,
            [
                orderId,
                draftOrder.productId,
                draftOrder.totalPax || ((draftOrder.adults || 1) + (draftOrder.children || 0)),
                basePrice,
                draftOrder.departureDate || draftOrder.visitDate || null,
                draftOrder.productType,
                passengersPayload
            ]
        );

        const orderItemId = orderItemRes.rows[0].id;
        // Insert Addons if any were selected
        if (draftOrder.addons && draftOrder.addons.length > 0) {
            for (const addon of draftOrder.addons) {
                const addonPriceRes = await client.query(
                    `SELECT price FROM ota.product_addons WHERE id = $1`,
                    [parseInt(addon.id)]
                );
                const unitPrice = addonPriceRes.rows[0]?.price || 0;
                await client.query(
                    `
                    INSERT INTO ota.order_item_addons
                        (order_item_id, addon_id, quantity, unit_price)
                    VALUES ($1, $2, $3, $4)
                    `,
                    [orderItemId, parseInt(addon.id), parseInt(addon.quantity) || 1, unitPrice]
                );
            }
        }

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
                    WHERE o.status IN ('cancelled', 'cancel_requested') OR o.payment_status = 'failed'
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
        conditions.push(`(o.status IN ('cancelled', 'cancel_requested') OR o.payment_status = 'failed')`);
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
                o.masked_card,
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
                (
                    SELECT pi.image_url
                    FROM ota.product_images pi
                    WHERE pi.product_id = p.id
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC
                    LIMIT 1
                ) AS product_image,
                (
                    SELECT pp.name
                    FROM ota.product_packages pp
                    WHERE pp.product_id = p.id
                    ORDER BY pp.sort_order ASC
                    LIMIT 1
                ) AS package_name,
                (
                    SELECT pp.is_reschedulable
                    FROM ota.product_packages pp
                    WHERE pp.product_id = p.id
                    ORDER BY pp.sort_order ASC
                    LIMIT 1
                ) AS is_reschedulable,
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

const getOrderWithItemById = async (orderId, userId) => {
    const res = await db.query(
        `
            SELECT
                o.id, o.user_id, o.total_amount, o.status, o.payment_status,
                o.transaction_id, o.inquiry_id, o.masked_card,
                oi.id AS order_item_id, oi.start_date, oi.notes AS product_type,
                oi.vendor_booking_code, oi.passengers,
                p.id AS product_id,
                p.title AS product_title, p.type AS product_type,
                pp.is_cancelable, pp.is_reschedulable
            FROM ota.orders o
            JOIN ota.order_items oi ON oi.order_id = o.id
            JOIN ota.products p ON p.id = oi.product_id
            LEFT JOIN ota.product_packages pp ON pp.product_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
            LIMIT 1
        `,
        [orderId, userId]
    );
    return res.rows[0] || null;
};

const createCancellationRequest = async (orderId, userId, reason, refundAmount, cancelFee) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO ota.order_cancellations
                (order_id, requested_by, reason, refund_amount, cancel_fee, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
            [orderId, userId, reason, refundAmount, cancelFee]
        );
        
        await client.query(
            `UPDATE ota.orders SET status = 'cancel_requested', updated_at = NOW() WHERE id = $1`,
            [orderId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getCancellationByOrderId = async (orderId) => {
    const res = await db.query(
        `SELECT * FROM ota.order_cancellations WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orderId]
    );
    return res.rows[0] || null;
};

const getPendingCancellations = async () => {
    const res = await db.query(
        `
        SELECT
            oc.id AS cancel_id,
            oc.order_id,
            oc.reason,
            oc.refund_amount,
            oc.cancel_fee,
            oc.status AS cancel_status,
            oc.created_at AS requested_at,
            o.total_amount,
            o.payment_status,
            o.transaction_id,
            p.title AS product_title,
            p.type AS product_type,
            u.full_name AS customer_name,
            u.email AS customer_email
        FROM ota.order_cancellations oc
        JOIN ota.orders o ON o.id = oc.order_id
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        JOIN ota.users u ON u.id = o.user_id
        WHERE oc.status = 'pending'
        ORDER BY oc.created_at DESC
        `
    );
    return res.rows;
};

const approveCancellation = async (cancelId, adminId) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Mark cancellation as approved
        const cancelRes = await client.query(
            `UPDATE ota.order_cancellations
             SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $1 AND status = 'pending'
             RETURNING order_id`,
            [cancelId, adminId]
        );

        if (cancelRes.rowCount === 0) {
            throw new Error('Cancellation request not found or already processed.');
        }

        const orderId = cancelRes.rows[0].order_id;

        // Mark order as cancelled
        await client.query(
            `UPDATE ota.orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [orderId]
        );

        await client.query('COMMIT');
        return { orderId };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const rejectCancellation = async (cancelId, adminId) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Mark cancellation as rejected
        const cancelRes = await client.query(
            `UPDATE ota.order_cancellations
             SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $1 AND status = 'pending'
             RETURNING order_id`,
            [cancelId, adminId]
        );

        if (cancelRes.rowCount === 0) {
            throw new Error('Cancellation request not found or already processed.');
        }

        const orderId = cancelRes.rows[0].order_id;

        // Revert order status back to paid (or pending if not yet paid)
        await client.query(
            `UPDATE ota.orders
             SET status = CASE WHEN payment_status IN ('paid', 'SUCCESS', 'SETTLED') THEN 'paid' ELSE 'pending' END,
                 updated_at = NOW()
             WHERE id = $1`,
            [orderId]
        );

        await client.query('COMMIT');
        return { orderId };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getOrderInvoiceData = async (orderId, userId) => { 
    const orderRes = await db.query(
        `
        SELECT
            o.id AS order_id,
            o.user_id,
            o.total_amount,
            o.base_price,
            o.tax_amount,
            o.platform_fee,
            o.status AS order_status,
            o.payment_method,
            o.payment_status,
            o.transaction_id,
            o.paid_at,
            o.created_at AS booking_date,
            u.full_name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            oi.id AS order_item_id,
            oi.quantity,
            oi.unit_price,
            oi.start_date,
            oi.end_date,
            oi.passengers,
            p.id AS product_id,
            p.title AS product_title,
            p.type AS product_type,
            p.location AS product_location,
            pp.name AS package_name,
            pp.duration_hours
        FROM ota.orders o
        JOIN ota.users u ON u.id = o.user_id
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        LEFT JOIN ota.product_packages pp ON (
            (oi.passengers->>'packageId' IS NOT NULL AND pp.id = CAST(oi.passengers->>'packageId' AS INTEGER))
            OR (oi.passengers->>'packageId' IS NULL AND pp.product_id = p.id)
        )
        WHERE o.id = $1 AND o.user_id = $2
        LIMIT 1
        `,
        [orderId, userId]
    );

    if (orderRes.rows.length === 0) return null;

    const invoiceData = orderRes.rows[0];

    // Fetch any purchased addons for this item
    const addonsRes = await db.query(
        `
        SELECT
            oia.quantity,
            oia.unit_price,
            pa.name AS addon_name
        FROM ota.order_item_addons oia
        JOIN ota.product_addons pa ON pa.id = oia.addon_id
        WHERE oia.order_item_id = $1
        `,
        [invoiceData.order_item_id]
    );

    invoiceData.addons = addonsRes.rows;
    return invoiceData;
}

// Reschedule
const createRescheduleRequest = async (orderId, userId, oldDate, newDate, oldSlotTime, newSlotTime, reason) => {
    const client = await db.connect();
    try { 
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO ota.order_reschedules
                (order_id, requested_by, old_date, new_date, old_slot_time, new_slot_time, reason, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())`,
            [orderId, userId, oldDate, newDate, oldSlotTime || null, newSlotTime || null, reason || null]
        );

        await client.query(
            `UPDATE ota.orders SET status = 'reschedule_requested', updated_at = NOW() WHERE id = $1`,
            [orderId]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getPendingReschedules = async () => { 
    const res = await db.query(
        `
        SELECT
            ors.id AS reschedule_id,
            ors.order_id,
            ors.old_date,
            ors.new_date,
            ors.old_slot_time,
            ors.new_slot_time,
            ors.reason,
            ors.status AS reschedule_status,
            ors.created_at AS requested_at,
            o.total_amount,
            o.payment_status,
            p.title AS product_title,
            p.type AS product_type,
            u.full_name AS customer_name,
            u.email AS customer_email
        FROM ota.order_reschedules ors
        JOIN ota.orders o ON o.id = ors.order_id
        JOIN ota.order_items oi ON oi.order_id = o.id
        JOIN ota.products p ON p.id = oi.product_id
        JOIN ota.users u ON u.id = o.user_id
        WHERE ors.status = 'pending'
        ORDER BY ors.created_at DESC
        `
    );
    return res.rows;
}

const approveReschedule = async (rescheduleId, adminId) => { 
    const client = await db.connect();
    try { 
        await client.query('BEGIN');

        // Mark reschedule as approved and get new details
        const reschRes = await client.query(
            `UPDATE ota.order_reschedules
             SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $1 AND status = 'pending'
             RETURNING order_id, new_date, new_slot_time`,
            [rescheduleId, adminId]
        );

        if (reschRes.rowCount === 0) {
            throw new Error('Reschedule request not found or already processed.');
        }

        const { order_id, new_date, new_slot_time } = reschRes.rows[0];

        // Update order_items start_date and new slot time in passengers if provided
        if (new_slot_time) {
            const itemRes = await client.query(`SELECT passengers FROM ota.order_items WHERE order_id = $1`, [order_id]);
            const passengers = itemRes.rows[0]?.passengers || {};
            if (passengers.carSnapshot) {
                passengers.carSnapshot.slotTime = new_slot_time;
            } else {
                passengers.slotTime = new_slot_time;
            }
            await client.query(
                `UPDATE ota.order_items SET start_date = $2, passengers = $3 WHERE order_id = $1`,
                [order_id, new_date, JSON.stringify(passengers)]
            );
        } else {
            await client.query(
                `UPDATE ota.order_items SET start_date = $2 WHERE order_id = $1`,
                [order_id, new_date]
            );
        }

        // Revert order status back to 'paid'
        await client.query(
            `UPDATE ota.orders SET status = 'paid', updated_at = NOW() WHERE id = $1`,
            [order_id]
        );

        await client.query('COMMIT');
        return { orderId: order_id };
    } catch (err) { 
        await client.query('ROLLBACK');
        throw err;
    } finally { 
        client.release();
    }
};

const rejectReschedule = async (rescheduleId, adminId) => { 
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Mark reschedule as rejected
        const reschRes = await client.query(
            `UPDATE ota.order_reschedules
             SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
             WHERE id = $1 AND status = 'pending'
             RETURNING order_id`,
            [rescheduleId, adminId]
        );

        if (reschRes.rowCount === 0) {
            throw new Error('Reschedule request not found or already processed.');
        }

        const orderId = reschRes.rows[0].order_id;

        // Revert order status back to 'paid'
        await client.query(
            `UPDATE ota.orders SET status = 'paid', updated_at = NOW() WHERE id = $1`,
            [orderId]
        );

        await client.query('COMMIT');
        return { orderId };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

const getAvailableTimeSlots = async (productId, packageId) => {
    const res = await db.query(
        `SELECT DISTINCT pts.time_string
         FROM ota.package_time_slots pts
         JOIN ota.product_packages pp ON pp.id = pts.package_id
         WHERE pp.product_id = $1 OR pts.package_id = $2
         ORDER BY pts.time_string ASC`,
        [productId, packageId || 0]
    );
    return res.rows.map(r => r.time_string);
};

module.exports = {
    createOrder,
    getOrderById,
    getOrderByInquiryId,
    updateOrderPaymentStatus,
    getUserOrderCounts,
    getUserOrders,
    getOrderWithItemById,
    createCancellationRequest,
    getCancellationByOrderId,
    getPendingCancellations,
    approveCancellation,
    rejectCancellation,
    getOrderInvoiceData,
    createRescheduleRequest,
    getPendingReschedules,
    approveReschedule,
    rejectReschedule,
    getAvailableTimeSlots
};