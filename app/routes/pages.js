const express = require('express')
const router = express.Router()
const User = require('../models/User');
const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, ensureGuest, ensurePrivate } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const voteHelper = require('../helpers/voteHelpers');
const global = require('../global');
const paperQueryHelper = require('../helpers/paperQueryHelpers');
const userHelper = require('../helpers/userHelpers');
const searchHelper = require('../helpers/searchHelpers');
const commentHelper = require('../helpers/commentHelpers');


router.get('/', async (req, res) => {
    try {
        /* Landing page */
        let myData = {
            user: await userHelper.getUserData(req.user),
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
            user: await userHelper.getUserData(req.user)
        }
        res.render('about', { myData })

    } catch (err) {
        console.error(err)
    }
})

router.get('/feedback', async (req, res) => {
    /* feedback form */
    try {
        let myData = {
            user: await userHelper.getUserData(req.user)
        }
        res.render('feedback', { myData })

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
        const papersQuery = await paperQueryHelper.queryPapers(req.params.cat, req.params.filter, resultsPerPage, page)
        const paperData = await helpers.getPaperTemplateData(papersQuery, req.user)
        const myData = {
            title: helpers.sentencifyArxivCategory(req.params.cat),
            category: req.params.cat,
            filter: helpers.parseFilter(req.params.filter),
            papers: paperData,
            user: await userHelper.getUserData(req.user),
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
                paper.userVote = await voteHelper.getUserPreviousVote(paper._id, req.user._id)
            }
            if (paper.commentCount != 0) {
                comments = await Comment.find({ paperID: paper._id })
            }
            let myData = {
                paper: paper,
                user: await userHelper.getUserData(req.user),
                comments: await commentHelper.makeCommentsThread(comments),
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
        const queryString = searchHelper.arxivQueryString(req.params.query)
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
            user: await userHelper.getUserData(req.user),
            queryObj: searchHelper.queryToObject(req.params.query),
        }
        res.render('search', {
            myData: myData
        })
    } catch (err) {
        console.error(err)
    }
})

router.get('/user-public/:userID', async (req, res) => {
    /* Other users see this public page for any user */
    try {
        const commentCount = await Comment.countDocuments({ userID: req.params.userID })
        const voteCount = await Upvote.countDocuments({ userID: req.params.userID })

        let userComments = await Comment.find({ userID: req.params.userID }).sort({ date: -1 }).limit(30).populate('paperID').lean()
        userComments = await commentHelper.formatComments(userComments)
        const commentData = commentHelper.groupCommentsByPaper(userComments)
        const myData = {
            user: await userHelper.getUserData(req.user), // user who is logged
            pageUser: await User.findById(req.params.userID).lean(), // user who's profile is being served
            commentCount: commentCount,
            voteCount: voteCount,
            commentData: commentData
        }
        res.render('user-public', { myData })
    } catch (err) {
        console.error(err)
    }
})

router.get('/user/:userID/notifications', ensurePrivate, async (req, res) => {
    /* Fetch new notifications for a user */
    try {
        const notifications = await Notification.find({ receiverID: req.user._id }).sort({ date: -1 }).lean()
        const myData = {
            user: await userHelper.getUserData(req.user),
            notify: notifications,
        }
        res.render('user-notifications', { myData })
    } catch (err) {
        console.error(err)
    }

})

router.get('/user/:userID/recent-upvotes', ensurePrivate, async (req, res) => {
    /* Get recently upvoted papers for a user*/
    try {
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
            user: await userHelper.getUserData(req.user)
        }
        res.render('user-upvotes', { myData })
    } catch (err) {
        console.error(err)
    }

})

router.get('/user/:userID/recent-comments', ensurePrivate, async (req, res) => {
    /* Get recent comments for a user*/
    try {
        let userComments = await Comment.find({ userID: req.params.userID }).sort({ date: -1 }).limit(30).populate('paperID').lean()
        userComments = await commentHelper.formatComments(userComments)
        const commentData = commentHelper.groupCommentsByPaper(userComments)
        const myData = {
            user: await userHelper.getUserData(req.user),
            commentData: commentData,
        }
        res.render('user-comments', { myData })
    } catch (err) {
        console.error(err)
    }
})


module.exports = router