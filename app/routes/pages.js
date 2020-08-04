const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global');
const Notification = require('../models/Notification');


router.get('/', async (req, res) => {
    try {
        /* Landing page */
        let myData = {
            user: await helpers.getUserData(req.user),
        }
        res.render('front', { myData })

    } catch (err) {
        console.error(err)
    }
})

router.get('/about', async (req, res) => {
    /* About page */
    try {
        let myData = {
            user: await helpers.getUserData(req.user)
        }
        res.render('about', { myData })

    } catch (err) {
        console.error(err)
    }
})

router.get('/init-user', ensureAuth, (req, res) => {
    /* first time users register their username here */
    res.render('init-user', { user: req.user })
})

router.get('/feed/:cat/:filter/:page', async (req, res) => {
    /* primary feed of papers based on category,filter*/
    try {
        const page = Number(req.params.page)
        const resultsPerPage = global.resultsPerPage
        const papersQuery = await helpers.queryPapers(req.params.cat, req.params.filter, resultsPerPage, page)
        const paperData = await helpers.getPaperTemplateData(papersQuery, req.user)
        const myData = {
            title: helpers.sentencifyArxivCategory(req.params.cat),
            category: req.params.cat,
            filter: helpers.parseFilter(req.params.filter),
            papers: paperData,
            user: await helpers.getUserData(req.user),
            pagination: helpers.paginateURLs(req.url),
        }
        res.render('main', {
            myData: myData
        })
    } catch (err) {
        console.error(err)
    }
})

router.get('/paper/:arxivid', async (req, res) => {
    /* single paper */
    try {
        const query = { arxivID: req.params.arxivid }
        let paper = await Paper.findOne(query).lean()
        let comments = []
        if (paper) {
            if (req.user) {
                paper.userVote = await helpers.getUserPreviousVote(paper._id, req.user._id)
            }
            if (paper.commentCount != 0) {
                comments = await Comment.find({ paperID: paper._id })
            }
            let myData = {
                paper: paper,
                user: await helpers.getUserData(req.user),
                comments: helpers.makeCommentsThread(comments),
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
    /* Handle paper search. Send search query to arXiv. 
    If paper already exists in DB return it. 
    Otherwise add the paper in DB*/
    try {
        let results = []
        const queryString = helpers.arxivQueryString(req.params.query)
        const parsed = await fetchPapers.QueryToJSON(queryString)
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
        const paperData = await helpers.getPaperTemplateData(results, req.user)
        const myData = {
            query: req.params.query,
            papers: paperData,
            user: await helpers.getUserData(req.user),
            queryObj: helpers.queryToObject(req.params.query),
        }
        res.render('search', {
            myData: myData
        })
    } catch (err) {
        console.error(err)
    }
})

router.get('/user/:userID/notifications', ensureUser, async (req, res) => {
    /* Fetch new notifications for a user */
    // TODO: protect user route(make private)
    try {
        const notifications = await Notification.find({ receiverID: req.user._id }).lean()
        const myData = {
            user: await helpers.getUserData(req.user),
            notify: notifications,
        }
        res.render('user-notifications', { myData })
    } catch (err) {
        console.error(err)
    }

})

router.get('/user/:userID/recent-upvotes', ensureUser, async (req, res) => {
    /* Get recently upvoted papers for a user*/
    try {
        if (req.params.userID.toString() != req.user._id.toString()) { res.redirect('/') }  // TODO: refactor this as middleware
        const likedPapers = await Upvote.find({ userID: req.params.userID, vote: 1 })
            .sort({ date: -1 }).limit(30).populate('paperID').lean()
        let paperData = []
        likedPapers.forEach(paper => {
            if (paper.paperID != null) {
                paperData.push(paper.paperID) // push populated papers from paperID ref
            }
        });
        paperData = await helpers.getPaperTemplateData(paperData, req.user)
        const myData = {
            papers: paperData,
            user: await helpers.getUserData(req.user)
        }
        res.render('user-upvotes', { myData })
    } catch (err) {
        console.error(err)
    }

})

router.get('/user/:userID/recent-comments', ensureUser, async (req, res) => {
    /* Get recent comments for a user*/
    if (req.params.userID.toString() != req.user._id.toString()) { res.redirect('/') } // Again this should be middleware
    try {
        const userComments = await Comment.find({ userID: req.params.userID }).sort({ date: -1 }).limit(30).populate('paperID').lean()
        const commentData = helpers.groupCommentsByPaper(userComments)
        const myData = {
            user: await helpers.getUserData(req.user),
            commentData: commentData,
        }
        res.render('user-comments', { myData })
    } catch (err) {
        console.error(err)
    }
})


module.exports = router