const express = require('express')
const passport = require('passport')
const router = express.Router()
let User = require('../models/User');

// Routes for authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }))

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard')
})


module.exports = router