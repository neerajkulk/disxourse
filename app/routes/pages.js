const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global');
const mongoose = require('mongoose')


router.get('/', (req, res) => {
    let myData = { user: helpers.hasUsername(req.user) }
    res.render('front', { myData })
})

router.get('/about', (req, res) => {
    let myData = { user: helpers.hasUsername(req.user) }
    res.render('about', { myData })
})

router.get('/init-user', ensureAuth, (req, res) => {
    res.render('init-user', { user: req.user })
})

router.get('/feed/:cat/:filter/:page', async (req, res) => {
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
            user: helpers.hasUsername(req.user),
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
        let query = { arxivID: req.params.arxivid }
        let paper = await Paper.findOne(query)
        let comments = []
        let user = helpers.hasUsername(req.user)
        if (paper) {
            if (user) {
                paper.userVote = await helpers.getUserPreviousVote(paper._id, user._id)
            }
            // handle case if there are zero comments here
            if (paper.commentCount != 0) {
                comments = await Comment.find({ paperID: paper._id })
            }
            let myData = {
                paper: paper,
                user: user,
                comments: helpers.makeCommentsThread(comments)
            }
            res.render('single', { myData })
        } else {
            await fetchPapers.addPaperById(req.params.arxivid)
            res.redirect(req.originalUrl);
        }
    } catch (err) {
        console.error(err)
    }
});

router.get('/search/:query', async (req, res) => {
    let results = []
    let queryString = helpers.arxivQueryString(req.params.query)
    let parsed = await fetchPapers.QueryToJSON(queryString)
    for (let i = 0; i < parsed.length; i++) {
        let paper = fetchPapers.parseEntry(parsed[i])
        let paperExists = await Paper.findOne({ arxivID: paper.arxivID }).lean()
        if (paperExists) {
            results.push(paperExists)
        } else {
            let newPaper = new Paper(paper)
            results.push(newPaper)
            await newPaper.save()
        }
    }
    let paperData = await helpers.getPaperTemplateData(results, req.user)
    let myData = {
        query: req.params.query,
        papers: paperData,
        user: helpers.hasUsername(req.user),
        queryObj: helpers.queryToObject(req.params.query)
    }
    res.render('search', {
        myData: myData
    })
})


router.get('/user/:userID/recent-upvotes', ensureUser, async (req, res) => {
    if (req.params.userID.toString() != req.user._id.toString()) { res.redirect('/') }
    let likedPapers = await Upvote.find({ userID: req.params.userID, vote: 1 }).populate('paperID').sort({ published: -1 }).limit(30).lean()
    let paperData = []
    likedPapers.forEach(paper => {
        if (paper.paperID != null) {
            paperData.push(paper.paperID)
        }
    });
    paperData = await helpers.getPaperTemplateData(paperData, req.user)
    let myData = {
        papers: paperData,
        user: req.user
    }
    res.render('user-upvotes', { myData })
})

router.get('/user/:userID/recent-comments', ensureUser, async (req, res) => {
    if (req.params.userID.toString() != req.user._id.toString()) { res.redirect('/') }
    let userComments = await Comment.find({ userID: req.params.userID }).sort({ date: -1 }).limit(30).populate('paperID').lean()
    commentData = helpers.groupCommentsByPaper(userComments)
    let myData = { user: req.user, commentData: commentData }
    res.render('user-comments', { myData })
})


module.exports = router