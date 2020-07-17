const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let User = require('../models/User');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');

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
        console.log(err)
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

function arxivQueryString(searchPhrase) {
    // Sort order here?
    return `http://export.arxiv.org/api/query?search_query=all:${searchPhrase}+AND+cat:astro-ph&start=0&max_results=30&sortBy=relevance&sortOrder=descending`
}

router.get('/search/:query', async (req, res) => {
    let results = []
    let queryString = arxivQueryString(req.params.query)
    let parsed = await fetchPapers.QueryToJSON(queryString)
    if (parsed == undefined) {parsed = []}
    for (let i = 0; i < parsed.length; i++) {
        let paper = parsed[i]
        let paperExists = await Paper.findOne({ arxivID: paper.arxivID }).lean()
        if (paperExists) {
            results.push(paperExists)
        } else {
            let newPaper = new Paper(fetchPapers.parseEntry(paper))
            results.push(newPaper)
            await newPaper.save()
        }
    }
    let paperData = await helpers.getPaperTemplateData(results, req.user)
    let myData = {
        papers: paperData,
        user: helpers.hasUsername(req.user)
    }
    res.render('search', {
        myData: myData
    })
})

router.post('/search', (req, res) => {
    res.redirect(`/search/${req.body.searchPhrase}`)
})

module.exports = router