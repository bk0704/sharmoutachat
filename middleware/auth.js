module.exports.checkUserSession = (req, res, next) => {
    if (!req.session.username) {
        return res.redirect('/users/login');
    }
    next();
};


module.exports.isAdmin = (req, res, next) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("Access denied.");
    }
    next();
};

