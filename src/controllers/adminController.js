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
        const adminId = req.session.user.id;
        await orderModel.approveCancellation(cancelId, adminId);
        return res.redirect('/admin/cancel-requests');
    } catch (err) {
        console.error('[ADMIN] Approve cancel error:', err.message);
        return res.redirect('/admin/cancel-requests');
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