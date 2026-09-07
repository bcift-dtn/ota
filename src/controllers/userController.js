const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const orderModel = require('../models/orderModel');

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

        const { status = 'all', type = 'all', search = '', page = 1 } = req.query;
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
            searchQuery: search
        });
    } catch (err) {
        console.error('[DASHBOARD] Get orders error:', err.message);
        return res.status(500).render('pages/404', { message: 'failed to load orders.' });
    }
};

module.exports = {
    updateProfile,
    changePassword,
    getMyOrders
};