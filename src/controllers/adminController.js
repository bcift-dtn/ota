const yokkeService = require('../services/yokkeService');
const orderModel = require('../models/orderModel');

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

        if (cancel.transaction_id) {
            console.log(`[REFUND] Sending full refund (${fullAmount}) to Yokke for order ${orderIdentifier}...`);
            try {
                const refundRes = await yokkeService.refundPayment({
                    orderId: orderIdentifier,
                    transactionId: cancel.transaction_id,
                    partnerRefundNo,
                    amount: fullAmount,
                    reason: cancel.reason || 'Admin Approved Cancellation'
                });

                if (refundRes.responseCode !== '2005800') {
                    console.error('[REFUND] Yokke refund declined:', refundRes);
                    return res.redirect(`/admin/cancel-requests?error=${encodeURIComponent(refundRes.responseMessage || 'Refund failed')}`);
                }
            } catch (apiErr) {
                const resData = apiErr.response?.data;
                const errCode = resData?.responseCode;
                const errMsg = resData?.responseMessage || apiErr.message;
                console.error('[REFUND] Yokke API error:', resData || apiErr.message);

                // If Yokke reports it's already cancelled/refunded, sync local DB
                if (errCode === '4045804') {
                    console.log(`[REFUND] Order ${orderIdentifier} was already cancelled on Yokke. Syncing local DB...`);
                    await orderModel.recordOrderRefund({
                        orderId: cancel.order_id,
                        cancelId: cancel.id,
                        adminId,
                        partnerRefundNo: 'ALREADY_CANCELLED_ON_GATEWAY',
                        refundAmount: cancel.refund_amount || fullAmount
                    });
                    return res.redirect('/admin/cancel-requests?success=Already+refunded+on+gateway');
                }
                
                return res.redirect(`/admin/cancel-requests?error=${encodeURIComponent(errMsg)}`);
            }
        }

         await orderModel.recordOrderRefund({
            orderId: cancel.order_id,
            cancelId: cancel.id,
            adminId,
            partnerRefundNo,
            refundAmount: cancel.refund_amount || fullAmount
        });

        console.log(`[REFUND] Successfully processed refund for order ${orderIdentifier}`);
        return res.redirect('/admin/cancel-requests?success=Refund+processed');
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