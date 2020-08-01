const express = require('express')
const router = express.Router()
const Paper = require('../models/Paper');
const User = require('../models/User');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
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
            commentBody: helpers.removeLineBreak(req.body.commentBody),
            date: Date.now(),
            parentID: req.body.parentID == '' ? null : req.body.parentID,
            depth: parseInt(req.body.depth)
        })
        await comment.save()
        let paper = await Paper.findById(req.params.paperid)
        paper.commentCount++
        await paper.save()

        // Notify past users of comment.
        const message = `${req.user.username} also commented on '${paper.title}'`
        await notifyNewComment(req.user._id.toString(), req.params.paperid, message)

        res.status(200).redirect(req.get('Referrer') + '#comment-form')
    } catch (err) {
        console.error(err)
    }
})

async function notifyNewComment(commenterID, paperID, message) {
    let usersID = await getUsersCommented(paperID)
    for (let i = 0; i < usersID.length; i++) {
        const userID = usersID[i];
        if (commenterID != userID) {
            const notification = new Notification({
                userID: userID,
                message: message,
                read: false,
                date: Date.now()
            });
            await notification.save()
        }
    }
}



async function getUsersCommented(paperID) {
    let comments = await Comment.find({ paperID: paperID })
    users = []
    comments.forEach(comment => {
        let id = comment.userID.toString()
        if (!users.includes(id)) {
            users.push(id)
        }
    })
    return users
}

async function test(params) {
    let users = await getUsersCommented("5f172b73bbbdb30d977b7831")
    users.forEach(user => {
        if (req.user != user) {
            const notification = new Notification({
                userID: user,
                message: 'New comment',
                read: false,
                date: Date.now()
            });
            notification.save()
        }
    })
}


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
                vote: req.body.vote,
                date: Date.now()
            })
            await newVote.save()
            res.status(200).end('new vote saved')
        }
        await helpers.sumPaperVotes(req.body.paperID)
    } catch (err) {
        console.error(err)
    }
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