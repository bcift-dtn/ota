const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

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

module.exports = {
    updateProfile,
    changePassword
}