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

function calcNetVotes(voteData) {
    let sum = 0
    voteData.forEach(voteObj => {
        sum += voteObj.vote
    });

    return sum
}
// TODO: add ensure auth here
router.post('/api/vote/:paperid', async (req, res) => {

    try {
        if (req.user) {
            const paper = await Paper.findById(req.params.paperid)
            let userVoted = false
            let voteObj = {
                user: req.user._id,
                vote: req.body.vote
            }
            // Update existing vote
            for (let index = 0; index < paper.voteData.length; index++) {
                if (String(paper.voteData[index].user) == String(req.user._id)) {
                    userVoted = true // user has voted previously
                    if (voteObj.vote == 0) {
                        paper.voteData.splice(index, 1);
                    } else {
                        paper.voteData[index] = voteObj
                    }
                    break
                }
            }
            // First time vote
            if (userVoted == false) {
                paper.voteData.push(voteObj)
            }
            paper.netVotes = calcNetVotes(paper.voteData)
            paper.markModified("voteData");
            await paper.save()
            res.status(200).send('vote stored in DB')
        } else {
            console.log('User not logged in')
            res.status(403).send('User Not Logged in')
        }
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