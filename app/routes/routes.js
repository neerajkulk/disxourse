const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')


router.get('/', (req, res) => res.render('front', {
    user: req.user
}))

router.get('/dashboard', ensureAuth, (req, res) => res.render('dashboard', {
    name: req.user.firstName
}))

// New feed for category
router.get('/new/:cat', (req, res) => {

    let myData = {
        title: sentencifyArxivCategory(req.params.cat),
        fetchURL: '/api' + req.url
    }
    res.render('new', {
        user: req.user,
        myData: myData
    })
})

// Page for single paper
router.get('/paper/:arxivid', (req, res) => {
    let query = { url: `http://arxiv.org/abs/${req.params.arxivid}` }
    Paper.findOne(query, (err, paper) => {
        if (paper) {
            res.render('single', {
                paper: paper,
                user: req.user
            })
        } else {
            fetchPapers.addPaperById(req.params.arxivid)
            res.redirect('back'); // reload page
        }
    })
});


router.get('/api/new/:cat', (req, res) => {
    Paper.find({ category: req.params.cat }).sort('-published').limit(10).exec(function (err, newPapers) {
        let results = newPapers
        if (results.length == 0) {
            res.send('No results found')
        } else res.json(newPapers)
    });
})

router.post('/api/:vote/:paperid', async (req, res) => {
    try {
        let paper = await Paper.findById(req.params.paperid)
        paper.upvotes = Number(req.params.vote)
        await paper.save()
        res.status(200)
        console.log('vote request recieved')
    } catch (err) {
        console.error(err)
    }

})


function sentencifyArxivCategory(cat) {
    switch (cat) {
        case 'astro-ph.CO':
            return 'Cosmology and Nongalactic Astrophysics'
        case 'astro-ph.EP':
            return 'Earth and Planetary Astrophysics'
        case 'astro-ph.GA':
            return 'Astrophysics of Galaxies'
        case 'astro-ph.HE':
            return 'High Energy Astrophysical Phenomena'
        case 'astro-ph.IM':
            return 'Instrumentation and Methods for Astrophysics'
        case 'astro-ph.SR':
            return 'Solar and Stellar Astrophysics'
        default:
            return 'Not valid'
    }
}


module.exports = router