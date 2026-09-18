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

module.exports = {
    getCancelRequests
};