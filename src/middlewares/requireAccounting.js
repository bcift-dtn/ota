module.exports = (req, res, next) => {
    if (!req.session.user?.isAccounting && !req.session.user?.isAdmin) {
        return res.redirect('/');
    }
    next();
};