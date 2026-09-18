module.exports = (req, res, next) => {
    if (!req.session.user?.is_admin) {
        return res.redirect('/');
    }
    next();
};