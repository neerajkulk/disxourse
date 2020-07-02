const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');

router.get('/', (req, res) => res.render('front', {
    myData: { user: req.user }
}))

router.get('/dashboard', ensureAuth, (req, res) => res.render('dashboard', {
    name: req.user.firstName
}))

// New feed for category
router.get('/new/:cat/:page', async (req, res) => {
    try {
        let page = Number(req.params.page)
        let resultsPerPage = 5
        let papers = await Paper.find({ category: req.params.cat }).sort('-published').skip(resultsPerPage * page).limit(resultsPerPage).lean()

        for (let index = 0; index < papers.length; index++) {
            paper = papers[index]
            paper.authors = helpers.parseAuthors(paper.authors)
            if (req.user) {
                paper.userVote = await helpers.getUserPreviousVote(paper._id, req.user._id)
            }
        }
        let myData = {
            title: sentencifyArxivCategory(req.params.cat),
            category:req.params.cat,
            papers: papers,
            user: req.user,
            page:page,
        }
        res.render('new', {
            myData: myData
        })
    } catch (err) {
        console.error(err)
    }
})

// Page for single paper
router.get('/paper/:arxivid', async (req, res) => {
    let query = { url: `http://arxiv.org/abs/${req.params.arxivid}` }
    let paper = await Paper.findOne(query)
    let comments = await Comment.find({ paperID: paper._id })

    if (paper) {
        if (req.user) {
            paper.userVote = await helpers.getUserPreviousVote(paper._id, req.user._id)
        }
        let myData = {
            paper: paper,
            user: req.user,
            comments: comments
        }
        res.render('single', { myData })
    } else {
        await fetchPapers.addPaperById(req.params.arxivid)
        res.redirect(req.originalUrl); // reload page
    }
});


// Returns JSON of new papers in the field
router.get('/api/new/:cat', (req, res) => {
    Paper.find({ category: req.params.cat }).sort('-published').limit(10).exec(function (err, newPapers) {
        let results = newPapers
        if (results.length == 0) {
            res.send('No results found')
        } else res.json(newPapers)
    });
})

async function updateVoteScore(paperID) {
    try {
        let paper = await Paper.findById(paperID)

        let sum = 0
        let paperVotes = await Upvote.find({ paperID: paperID })
        paperVotes.forEach(voteObj => { sum += voteObj.vote })
        paper.voteScore = sum
        await paper.save()

    } catch (err) {
        console.error(err)
    }
}


router.post('/api/vote/:paperid', async (req, res) => {
    try {
        if (req.user) {
            // Has the user voted on the paper before?
            let previousVote = await Upvote.findOne({ paperID: req.body.paperID, userID: req.user._id })

            if (previousVote) {
                if (req.body.vote == 0) {
                    await previousVote.deleteOne()
                    res.status(200).send('Previous vote deleted')
                } else {
                    previousVote.vote = req.body.vote
                    await previousVote.save()
                    res.status(200).send('previous vote updated')
                }
            } else {
                let newVote = new Upvote({
                    paperID: req.body.paperID,
                    userID: req.user._id,
                    vote: req.body.vote
                })
                await newVote.save()
                res.status(200).end('new vote saved')
            }

            await updateVoteScore(req.body.paperID) // change score in papers collections

        } else {
            res.status(403).send('must be logged in to vote')
            console.log('must be logged in to vote')
        }
    } catch (err) {
        console.error(err)
    }

})

router.post('/api/comment/:paperid', async (req, res) => {
    let comment = new Comment({
        paperID: req.params.paperid,
        userID: req.user._id,
        displayName: req.user.displayName,
        commentBody: req.body.commentBody,
        date: Date.now()
    })
    await comment.save()
    let paper = await Paper.findById(req.params.paperid)
    paper.commentCount++
    await paper.save()
    res.status(200).redirect(req.get('Referrer') + '#comments')
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