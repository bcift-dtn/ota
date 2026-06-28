const userModel = require('../models/userModel');

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

        res.redirect('/dashboard/personal-info')
    } catch (error) {
        console.error('Profile update error: ', error);

        res.redirect('/dashboard/personal-info')
    }
};

module.exports = {
    updateProfile
}