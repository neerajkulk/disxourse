const helpers = require('../helpers/helpers');
const userHelper = require('../helpers/userHelpers');

module.exports = {
    storeReq: function (req, res, next) {
        /* store url of request to use as callback for OAuth. */
        req.session.returnTo = req.originalUrl
        return next()
    },
    ensureAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        } else {
            res.redirect('/auth/google')
        }
    },
    ensureGuest: function (req, res, next) {
        if (req.isAuthenticated()) {
            res.redirect('/')
        } else {
            return next()
        }
    },
    ensureUser: function (req, res, next) {
        if (userHelper.hasUsername(req.user)) {
            return next()
        } else {
            res.redirect('/auth/google');
        }
    },
    ensurePrivate: function (req, res, next) {
        /* Check if userID in URL request matches user.
            Use this middleware for anything private to a user
         */
        if (req.isAuthenticated() && req.params.userID.toString() == req.user._id.toString()) {
            return next()
        } else {
            res.redirect('/')
        }
    }
}