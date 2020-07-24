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
            if (paper.commentCount > 0) {
                comments = await Comment.find({ paperID: paper._id })
            }
            let myData = {
                paper: paper,
                user: user,
                comments: comments
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


function insertComment(comments, comment) {
    // Comments is an array, comment is an object
    comments.forEach(child => {
        if (child._id.toString() == comment.parentID.toString()) {
            child.comments.push(comment)
        } else {
            insertComment(child.comments, comment)
        }
    })

}

router.get('/comments-test/', async (req, res) => {
    let commentsDB = await Comment.find({ paperID: mongoose.Types.ObjectId("5f172b73bbbdb30d977b7831") }).sort({ date: 1 }).lean()
    let comments = [] // store threads here
    for (let i = 0; i < commentsDB.length; i++) {
        comment = commentsDB[i]
        comment.comments = []
        if (comment.parentID == null) {
            comments.push(comment)
        } else {
            insertComment(comments, comment)
        }
    }

    const tree = [
        {
            name: "item 1",
            link: "#link-1",
            children: [
                {
                    name: "item 1.1",
                    link: "#link-11",
                    children: [
                        {
                            name: "item 1.1.1",
                            link: "#link-111",
                            children: []
                        }
                    ]
                },
                {
                    name: "item 1.2",
                    link: "#link-12",
                    children: []
                }
            ]
        },
        {
            name: "item 2",
            children: []
        }
    ];

    res.render('threaded-comments', { comments })

})

module.exports = router