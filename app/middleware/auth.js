const helpers = require('../helpers/helpers');
const userHelper = require('../helpers/userHelpers');

module.exports = {
    ensureAuth: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        } else {
            res.redirect('/')
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
            res.redirect('/')
        }
    },
    ensurePrivate: function (req, res, next) {
        /* Check if userID in URL request matches user.
            Use this middleware for anything private to a user
         */
        if (req.params.userID.toString() == req.user._id.toString()) {
            return next()
        } else {
            res.redirect('/')
        }
    }
}