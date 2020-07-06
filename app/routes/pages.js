const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global.js');
const { use } = require('./api');

router.get('/', (req, res) => res.render('front', {
    myData: { user: req.user }
}))

// New feed for category
router.get('/new/:cat/:page', async (req, res) => {
    try {
        let page = Number(req.params.page)
        let resultsPerPage = global.resultsPerPage
        let papersQuery = await Paper.find({ category: req.params.cat }).sort('-published').skip(resultsPerPage * page).limit(resultsPerPage).lean()
        let paperData = await helpers.getPaperTemplateData(papersQuery, req.user)

        let myData = {
            title: helpers.sentencifyArxivCategory(req.params.cat),
            category: req.params.cat,
            papers: paperData,
            user: req.user,
            pagination: helpers.paginateURLs(req.url)
        }
        res.render('new', {
            myData: myData
        })
    } catch (err) {
        console.error(err)
    }
})


// Top posts for a category
router.get('/top/:cat/:page', async (req, res) => {
    try {
        let page = Number(req.params.page)
        let resultsPerPage = global.resultsPerPage
        let d = new Date();
        d.setDate(d.getDate() - 7);
        let papersQuery = await Paper.find({ "published": { "$gte": d } }).sort('-voteScore').skip(resultsPerPage * page).limit(resultsPerPage).lean()
        let paperData = await helpers.getPaperTemplateData(papersQuery, req.user)

        let myData = {
            title: helpers.sentencifyArxivCategory(req.params.cat),
            category: req.params.cat,
            papers: paperData,
            user: req.user,
            pagination: helpers.paginateURLs(req.url)
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
    try {
        let query = { url: `http://arxiv.org/abs/${req.params.arxivid}` }
        let paper = await Paper.findOne(query)
        let comments = []
        if (paper) {
            if (req.user) {
                paper.userVote = await helpers.getUserPreviousVote(paper._id, req.user._id)
            }
            if (paper.commentCount > 0) {
                comments = await Comment.find({ paperID: paper._id })
            }
            let myData = {
                paper: paper,
                user: req.user,
                comments: comments
            }
            res.render('single', { myData })
        } else {
            await fetchPapers.addPaperById(req.params.arxivid)
            res.redirect(req.originalUrl); // TODO: reload here is multiple times. Do some async await stuff here
        }
    } catch (err) {
        console.error(err)
    }
});


module.exports = router