const express = require('express')
const passport = require('passport')
const router = express.Router()
let User = require('../models/User');

// Routes for authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }))

router.get('/login-failure', (req, res) => {
    res.send('Login Failure')
})

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login-failure' }), (req, res) => {
    res.redirect('/')
})

router.get('/auth/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})

module.exports = router