module.exports = (req, res, next) => {
  if (!req.session.user?.isAgent) {
    return res.redirect('/');
  }
  next();
};