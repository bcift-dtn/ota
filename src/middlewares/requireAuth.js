module.exports = (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect('/?login=1');
  }
  next();
};