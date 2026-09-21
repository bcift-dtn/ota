const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const orderModel = require('../models/orderModel');
const invoiceService = require('../services/invoiceService');

const CANCEL_FEE_RATE = 0.20;

const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, email, address } = req.body;

        const userId = req.session.user.id;

        const updatedUser = await userModel.updateUserProfile(userId, fullName, phone, email, address);

        req.session.user = {
            ...req.session.user,
            fullName: updatedUser.full_name,
            phone: updatedUser.phone,
            email: updatedUser.email,
            address: updatedUser.address
        };

        return res.status(200).json({ message: 'Profile updated successfully!' });
    } catch (error) {
        console.error('Profile update error: ', error);

        return res.status(500).json({ error: 'Failed to update profile. Please try again. '})
    }
};

const changePassword = async (req, res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.user.id;

    if (newPassword.length < 8) return res.status(400).json({error: 'Password must be at least 8 characters long' });

    if (newPassword !== confirmNewPassword) return res.status(400).json({ error: 'Password do not match' });

    try {
        const user = await userModel.findUserById(userId);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await userModel.updatePassword(userId, hashedPassword);

        return res.status(200).json({ message: 'Password updated sucessfully! '});
    } catch (err) {
        console.error('Change password error:', err);

        return res.status(500).json({ error: 'Server error, please try again. '});
    }
};

const getMyOrders = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/');

        const { status = 'all', type = 'all', search = '', page = 1, cancelled = '' } = req.query;
        const currentPage = Math.max(1, parseInt(page) || 1);

        const [counts, ordersData] = await Promise.all([
            orderModel.getUserOrderCounts(userId),
            orderModel.getUserOrders({
                userId,
                status,
                productType: type,
                search,
                page: currentPage,
                limit: 10
            })
        ]);

        return res.render('pages/dashboard/orders', {
            activeMenu: 'orders',
            orders: ordersData.orders,
            totalOrders: ordersData.totalOrders,
            totalPages: ordersData.totalPages,
            currentPage: ordersData.currentPage,
            counts,
            currentStatus: status,
            currentType: type,
            searchQuery: search,
            cancelled: cancelled === '1'
        });
    } catch (err) {
        console.error('[DASHBOARD] Get orders error:', err.message);
        return res.status(500).render('pages/404', { message: 'failed to load orders.' });
    }
};

const getCancelConfirmPage = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/');

        const orderId = parseInt(req.params.orderId);
        const order = await orderModel.getOrderWithItemById(orderId, userId);

        // If no order found
        if (!order) return res.status(404).render('pages/404', { message: 'Order not found.' });

        // If already cancelled or on request
        if (['cancelled', 'cancel_requested'].includes(order.status)) {
            return res.redirect('/dashboard/orders');
        }

        // cancellable validation
        if (order.is_cancelable === false) {
            return res.redirect('/dashboard/orders');
        }

        const isPaid = order.payment_status === 'paid';
        const cancelFee = isPaid ? Math.round(order.total_amount * CANCEL_FEE_RATE) : 0;
        const refundAmount = order.total_amount - cancelFee;

        return res.render('pages/dashboard/cancel-confirm', {
            activeMenu: 'orders',
            order,
            isPaid,
            cancelFee,
            refundAmount
        });
    } catch (err) {
        console.error('[CANCEL] Get cancel page error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
}

const submitCancelRequest = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/');

        const orderId = parseInt(req.params.orderId);
        const { reason } = req.body;

        const order = await orderModel.getOrderWithItemById(orderId, userId);

        if (!order) return res.status(404).render('pages/404', { message: 'Order not found.' });

        if (['cancelled', 'cancel_requested', 'failed'].includes(order.status)) {
            return res.redirect('/dashboard/orders');
        }

        if (order.is_cancelable === false) {
            return res.redirect('/dashboard/orders');
        }

        const isPaid = order.payment_status === 'paid';
        const cancelFee = isPaid ? Math.round(order.total_amount * CANCEL_FEE_RATE) : 0;
        const refundAmount = order.total_amount - cancelFee;

        await orderModel.createCancellationRequest(orderId, userId, reason || null, refundAmount, cancelFee);

        return res.redirect('/dashboard/orders?cancelled=1');
    } catch (err) {
        console.error('[CANCEL] Submit cancel request error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
}

const downloadInvoice = async (req, res) => { 
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user.id;

        const order = await orderModel.getOrderInvoiceData(orderId, userId);
        if (!order) {
            return res.status(404).render('pages/404', { message: 'Order not found.' });
        }

        const invoiceFilename = `Invoice-MT-${(order.product_type || 'ORDER').toUpperCase()}-${order.order_id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        // 'inline' lets the browser preview it immediately with a download button
        res.setHeader('Content-Disposition', `inline; filename="${invoiceFilename}"`);

        invoiceService.generateInvoicePDF(order, res);
    } catch (error) {
        console.error('[INVOICE] Generate invoice error:', error);
        return res.status(500).render('pages/404', { message: 'Failed to generate invoice.' });
    }
}

const getReschedulePage = async (req, res) => {
    try { 
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/');

        const orderId = parseInt(req.params.orderId);
        const order = await orderModel.getOrderWithItemById(orderId, userId);

        if (!order) return res.status(404).render('pages/404', { message: 'Order not found.' });

        // Only paid orders with 'paid' status can be rescheduled
        if (order.status !== 'paid' || order.payment_status !== 'paid') {
            return res.redirect('/dashboard/orders');
        }

        // Ferry tickets & non-reschedulable items cannot be rescheduled
        if (order.is_reschedulable === false || order.product_type === 'ferry') {
            return res.redirect('/dashboard/orders');
        }
        
        const currentSlotTime = order.passengers?.carSnapshot?.slotTime || order.passengers?.slotTime || null;

        let availableSlots = [];
        if (order.product_type === 'activities') {
            const packageId = order.passengers?.packageId;
            availableSlots = await orderModel.getAvailableTimeSlots(order.product_id, packageId);
        }
        
        return res.render('pages/dashboard/reschedule-confirm', {
            activeMenu: 'orders',
            order,
            currentSlotTime,
            availableSlots
        });
    } catch (err) {
        console.error('[RESCHEDULE] Get reschedule page error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
}

const submitRescheduleRequest = async (req, res) => { 
    try {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/');

        const orderId = parseInt(req.params.orderId);
        const { newDate, newSlotTime, reason } = req.body;

        if (!newDate) {
            return res.redirect(`/dashboard/orders/${orderId}/reschedule?error=date_required`);
        }

        const order = await orderModel.getOrderWithItemById(orderId, userId);

        if (!order) return res.status(404).render('pages/404', { message: 'Order not found.' });

        if (order.status !== 'paid' || order.payment_status !== 'paid') {
            return res.redirect('/dashboard/orders');
        }

        if (order.is_reschedulable === false || order.product_type === 'ferry') {
            return res.redirect('/dashboard/orders');
        }

        const oldDate = order.start_date;
        const oldSlotTime = order.passengers?.carSnapshot?.slotTime || order.passengers?.slotTime || null;

        await orderModel.createRescheduleRequest(
            orderId,
            userId,
            oldDate,
            newDate,
            oldSlotTime,
            newSlotTime || null,
            reason || null
        );

        return res.redirect('/dashboard/orders?rescheduled=1');
    } catch (err) {
        console.error('[RESCHEDULE] Submit reschedule request error:', err.message);
        return res.status(500).render('pages/404', { message: 'Server error.' });
    }
}

module.exports = {
    updateProfile,
    changePassword,
    getMyOrders,
    getCancelConfirmPage,
    submitCancelRequest,
    downloadInvoice,
    getReschedulePage,
    submitRescheduleRequest
};