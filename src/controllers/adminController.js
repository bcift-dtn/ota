const yokkeService = require('../services/yokkeService');
const orderModel = require('../models/orderModel');
const { cancelBooking } = require('../services/majesticService');

const getCancelRequests = async (req, res) => {
    try {
        const requests = await orderModel.getPendingCancellations();
        return res.render('pages/admin-dashboard/cancel-requests', {
            activeMenu: 'cancel-requests',
            requests
        });
    } catch (err) {
        console.error('[ADMIN] Get cancel requests error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
};

const approveCancelRequest = async (req, res) => {
    try {
        const cancelId = req.params.id;
        const adminId = req.session?.user?.id;
        const cancel = await orderModel.getCancellationById(cancelId);
        
        if (!cancel) {
            return res.redirect('/admin/cancel-requests?error=Request+not+found');
        }

        const orderIdentifier = `MT-${(cancel.product_type || 'ORDER').toUpperCase()}-${cancel.order_id}`;
        const fullAmount = parseFloat(cancel.total_amount);
        const partnerRefundNo = `REF-${orderIdentifier}-${Date.now()}`;

        if (cancel.product_type === 'ferry' && cancel.vendor_booking_code) {
            try {
                const storedPassengers = typeof cancel.passengers === 'string' 
                    ? JSON.parse(cancel.passengers) 
                    : (cancel.passengers || {});
                const firstPassport = storedPassengers?.passengers?.[0]?.passportNo || '';

                if (firstPassport) {
                    console.log(`[MFF] Cancelling booking ${cancel.vendor_booking_code} on Majestic Fast Ferry...`);
                    const mffCancelRes = await cancelBooking({
                        bookingCode: cancel.vendor_booking_code,
                        passportNo: firstPassport
                    });

                    const cancelStatus = Array.isArray(mffCancelRes) ? mffCancelRes[0]?.BookingStatus : mffCancelRes?.BookingStatus;
                    console.log(`[MFF] Majestic cancel response status: ${cancelStatus}`);
                    if (cancel.order_item_id) {
                        const db = require('../config/db');
                        await db.query(
                            `UPDATE ota.order_items SET vendor_status = $1 WHERE id = $2`,
                            [cancelStatus || 'C', cancel.order_item_id]
                        );
                    }
                }
            } catch (mffErr) {
                console.error('[MFF] Failed to cancel booking on Majestic:', mffErr.message);
            }
        }

        const db = require('../config/db');
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE ota.orders 
                 SET status = 'cancelled', 
                     payment_status = 'refund_pending', 
                     updated_at = NOW() 
                 WHERE id = $1`,
                [cancel.order_id]
            );

            await client.query(
                `UPDATE ota.order_cancellations 
                 SET status = 'approved', 
                     reviewed_by = $2, 
                     reviewed_at = NOW() 
                 WHERE id = $1`,
                [cancel.id, adminId]
            );

            await client.query('COMMIT');
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

        console.log(`[CANCEL] Order #${cancel.order_id} approved by admin #${adminId}. Handed over to Accounting.`);
        return res.redirect('/admin/cancel-requests?success=Cancellation+approved.+Handed+over+to+Accounting+for+payout.');
    } catch (err) {
        console.error('[ADMIN] Approve cancel error:', err.message);
        return res.redirect('/admin/cancel-requests?error=Server+error');
    } 
};

const rejectCancelRequest = async (req, res) => {
    try {
        const cancelId = req.params.id;
        const adminId = req.session.user.id;
        await orderModel.rejectCancellation(cancelId, adminId);
        return res.redirect('/admin/cancel-requests');
    } catch (err) {
        console.error('[ADMIN] Reject cancel error:', err.message);
        return res.redirect('/admin/cancel-requests');
    }
};

// Reschedule
const getRescheduleRequests = async (req, res) => {
    try {
        const requests = await orderModel.getPendingReschedules();
        return res.render('pages/admin-dashboard/reschedule-requests', {
            activeMenu: 'reschedule-requests',
            requests
        });
    } catch (err) {
        console.error('[ADMIN] Get reschedule requests error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
};

const approveRescheduleRequest = async (req, res) => {
    try {
        const rescheduleId = req.params.id;
        const adminId = req.session.user.id;
        await orderModel.approveReschedule(rescheduleId, adminId);
        return res.redirect('/admin/reschedule-requests');
    } catch (err) {
        console.error('[ADMIN] Approve reschedule error:', err.message);
        return res.redirect('/admin/reschedule-requests');
    }
};

const rejectRescheduleRequest = async (req, res) => {
    try {
        const rescheduleId = req.params.id;
        const adminId = req.session.user.id;
        await orderModel.rejectReschedule(rescheduleId, adminId);
        return res.redirect('/admin/reschedule-requests');
    } catch (err) {
        console.error('[ADMIN] Reject reschedule error:', err.message);
        return res.redirect('/admin/reschedule-requests');
    }
};

const getTransactions = async (req, res) => {
    try { 
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        const data = await orderModel.getAdminTransactions({
            search,
            status,
            startDate,
            endDate,
            page,
            limit
        });

        return res.render('pages/admin-dashboard/transactions', {
            activeMenu: 'transactions',
            transactions: data.transactions,
            pagination: {
                totalCount: data.totalCount,
                totalPages: data.totalPages,
                currentPage: data.currentPage,
                limit: data.limit
            },
            filters: {
                search,
                status,
                startDate,
                endDate
            }
        });
    } catch (err) {
        console.error('[ADMIN] Get transactions error:', err.message);
        return res.status(500).render('pages/404', { message: 'Failed to load transactions.' });
    }
}

module.exports = {
    getCancelRequests,
    approveCancelRequest,
    rejectCancelRequest,
    getRescheduleRequests,
    approveRescheduleRequest,
    rejectRescheduleRequest,
    getTransactions
};