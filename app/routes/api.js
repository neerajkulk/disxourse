const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let User = require('../models/User');
let Upvote = require('../models/Upvote');
let Comment = require('../models/Comment');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global.js');

async function usernameExists(username) {
    let user = await User.findOne({ username: username })
    if (user) {
        return true
    } else {
        return false
    }
}

router.post('/api/init-user', async (req, res) => {
    let newUser = await User.findByIdAndUpdate({ _id: req.user._id })
    let userExists = await usernameExists(req.body.username)

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

router.post('/api/comment/:paperid', async (req, res) => {
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
        res.status(200).redirect(req.get('Referrer') + '#comments')
    } catch (err) {
        console.log(err)
    }
})



router.post('/api/vote/:paperid', async (req, res) => {
    try {
        if (helpers.fullAuth(req.user)) {
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

        } else {
            res.status(403).send('must be logged in to vote')
            console.log('must be logged in to vote')
        }
    } catch (err) {
        console.error(err)
    }

})


module.exports = router