const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let User = require('../models/User');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global');

router.post('/api/init-user', ensureAuth, async (req, res) => {
    let newUser = await User.findByIdAndUpdate({ _id: req.user._id })
    let userExists = await helpers.usernameTaken(req.body.username)
    if (userExists) {
        res.render('init-user', {
            user: req.user,
            userExists: userExists
        })
    }
    else {
        newUser.username = req.body.username
        if (req.body.email) { newUser.email = req.body.email }
        await newUser.save()
        res.redirect('/')
    }
})

router.post('/api/comment/:paperid', ensureUser, async (req, res) => {
    try {
        let comment = new Comment({
            paperID: req.params.paperid,
            userID: req.user._id,
            username: req.user.username,
            commentBody: req.body.commentBody,
            date: Date.now()
        })
        await comment.save()
        let paper = await Paper.findById(req.params.paperid)
        paper.commentCount++
        await paper.save()
        res.status(200).redirect(req.get('Referrer') + '#comment-form')
    } catch (err) {
        console.error(err)
    }
})



router.post('/api/vote/:paperid', ensureUser, async (req, res) => {
    try {
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
        await helpers.sumPaperVotes(req.body.paperID)
    } catch (err) {
        console.error(err)
    }
})

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

router.post('/advanced-search', (req, res) => {
    const queryString = helpers.objectToQuery(req.body)
    res.redirect(`/search/${queryString}`)
})

router.post('/simple-search', (req, res) => {
    let queryString = `search_query=all:${req.body.searchTerm}+AND+(${global.astroCategories})`
    res.redirect(`/search/${queryString}`)
})

module.exports = router