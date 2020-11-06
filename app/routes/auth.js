const express = require('express')
const passport = require('passport')
const router = express.Router()
const helpers = require('../helpers/helpers')
const userHelper = require('../helpers/userHelpers');

// Routes for authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }))

router.get('/login-failure', (req, res) => {
    res.send('Login Failure')
})

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login-failure' }), (req, res) => {
    if (userHelper.hasUsername(req.user)) {
        res.redirect(req.session.returnTo || '/')
        req.session.returnTo = undefined
    } else {
        res.redirect('/init-user')
    }
})

router.get('/auth/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})

module.exports = router