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

module.exports = {
    getCancelRequests,
    approveCancelRequest,
    rejectCancelRequest
};