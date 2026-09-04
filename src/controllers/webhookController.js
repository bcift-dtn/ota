const crypto = require('crypto');
const db = require('../config/db');
const { getOrderById, updateOrderPaymentStatus } = require('../models/orderModel');

const SECRET_KEY = process.env.YOKKE_SECRET_KEY;

const computeValidateSignature = (signatureHeader) => {
    const [signature, timestamp] = (signatureHeader || '').split(';');
    return crypto
        .createHash('md5')
        .update(SECRET_KEY + signature + timestamp)
        .digest('hex');
}

// Secret Code
const generateCode = (prefix) => {
    return prefix + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Get DB orderId
const parseDbOrderId = (yokkeOrderId = '') => {
    const parts = yokkeOrderId.split('-');
    return parseInt(parts.at(-1)) || null;
};

const handleWebhook = async (req, res) => {
    const signatureHeader = req.headers['signature'] || '';
    const validateSignature = computeValidateSignature(signatureHeader);
    const body = req.body;
    const type = body?.type;

    console.log('[WEBHOOK HEADERS]', JSON.stringify(req.headers));
    console.log(`[WEBHOOK] Incoming ${type}:`, JSON.stringify(body));

    // Validate payment
    if (type === 'payment.validate') {
        const dbOrderId = parseDbOrderId(body?.inquiry?.order?.id);

        if (!dbOrderId) {
            console.warn('[WEBHOOK] payment.validate rejected: invalid order ID');
            return res.json({ status: 'nok', validateSignature, inquiry: {} });
        }

        const order = await getOrderById(dbOrderId);
        if (!order) {
            console.warn(`[WEBHOOK] payment.validate rejected: order #${dbOrderId} not found`);
            return res.json({ status: 'nok', validateSignature, inquiry: {} });
        }

        console.log(`[WEBHOOK] payment.validate approved for order #${dbOrderId}`);
        return res.json({ status: 'ok', validateSignature, inquiry: {} })
    }

    // Payment received
    if (type === 'payment.received') {
        const dbOrderId = parseDbOrderId(body?.inquiry?.order?.id);
        const txStatus = body?.transaction?.status;
        const inquiryStatus = body?.inquiry?.status;

        if (dbOrderId && txStatus === 'captured' && inquiryStatus === 'paid') {
            try {
                await updateOrderPaymentStatus(dbOrderId, {
                    status: 'paid',
                    paymentStatus: 'paid',
                    transactionId: body?.transaction?.id,
                    authCode: body?.transaction?.authorizationCode,
                    maskedCard: body?.transaction?.paymentSourceData?.cardNumber
                });

                // Generate Secret Code
                const order = await getOrderById(dbOrderId);
                const isFerry = order?.notes === 'ferry';

                if (!isFerry) {
                    const itemRes = await db.query(
                        `SELECT id FROM ota.order_items WHERE order_id = $1 LIMIT 1`,
                        [dbOrderId]
                    );

                    const orderItemId = itemRes.rows[0]?.id;

                    if (orderItemId) {
                        const referenceId = generateCode('REF-');
                        const secretCode = generateCode('SC-');
                        await db.query(
                            `
                                INSERT INTO ota.secret_codes(order_item_id, reference_id, secret_code, is_used)
                                VALUES ($1, $2, $3, false);
                            `,
                            [orderItemId, referenceId, secretCode]
                        );
                    }
                }

                // Call majestic service here later to generate ticket
            } catch (err) {
                console.error('[WEBHOOK] payment.received error:', err.message);
            }
        } else if (txStatus === 'declined' || txStatus === 'failed') {
            if (dbOrderId) {
                await updateOrderPaymentStatus(dbOrderId, {
                    status: 'failed',
                    paymentStatus: 'failed'
                });
            }
        }

        return res.json({ status: 'ok', validateSignature });
    }

    // Unkown event, and reply ok to prevent any retries
    return res.json({ status: 'ok', validateSignature });
}

module.exports = { handleWebhook };