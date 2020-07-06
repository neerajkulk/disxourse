const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global.js');

router.get('/', (req, res) => res.render('front', {
    myData: { user: req.user }
}))

router.get('/:cat/:filter/:page', async (req, res) => {
    try {
        let page = Number(req.params.page)
        let resultsPerPage = global.resultsPerPage
        let papersQuery = await helpers.queryPapers(req.params.cat, req.params.filter, resultsPerPage, page)
        let paperData = await helpers.getPaperTemplateData(papersQuery, req.user)
        let myData = {
            title: helpers.sentencifyArxivCategory(req.params.cat),
            category: req.params.cat,
            filter: helpers.parseFilter(req.params.filter),
            papers: paperData,
            user: req.user,
            pagination: helpers.paginateURLs(req.url)
        }
        res.render('main', {
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