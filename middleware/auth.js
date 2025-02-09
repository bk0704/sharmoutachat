module.exports.checkUserSession = (req, res, next) => {
    if (!req.session.username) {
        return res.redirect('/users/login');
    }
    next();
};

