const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer');
const Paper = require('../models/Paper');
const User = require('../models/User');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { ensureAuth, ensureUser, ensureGuest } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const global = require('../global');
const voteHelper = require('../helpers/voteHelpers');
const userHelper = require('../helpers/userHelpers');
const searchHelper = require('../helpers/searchHelpers');
const commentHelper = require('../helpers/commentHelpers');
const mailHelper = require('../helpers/mailHelpers');

const dotenv = require('dotenv');
dotenv.config({ path: '../config/config.env' });

router.post('/api/init-user', ensureAuth, async (req, res) => {
    /* Oauth login redirects here for first time users to pick a useraname  */
    try {
        let newUser = await User.findByIdAndUpdate({ _id: req.user._id })
        const userExists = await userHelper.usernameTaken(req.body.username)
        const valid = /^[a-z0-9_]{1,16}$/igm.test(req.body.username)
        if (userExists) {
            /* re-render page with error if username taken*/
            res.render('init-user', {
                user: req.user,
                userExists: userExists
            })
        } else if (!valid) {
            res.render('init-user', { user: req.user, invalid: true })
        } else {
            newUser.username = req.body.username
            if (req.body.email) { newUser.email = req.body.email }
            await newUser.save()
            res.redirect('/')
        }
    } catch (err) {
        console.error(err)
    }
})

router.delete('/api/unsubscribe-author/', async (req, res) => {
    try {
        const paper = await Paper.findOne({ _id: req.body.paperID })
        const index = paper.emails.indexOf(req.body.email);
        paper.emails.splice(index, 1);
        res.sendStatus(200)
        paper.save()
    } catch (err) {
        console.error(err)
    }

})

router.get('/api/unsubscribe-author/:paperID/:email', (req, res) => {
    res.render('unsubscribe-author')
})

router.delete('/api/comment', async (req, res) => {
    try {
        const paper = await Paper.findOne({ _id: req.body.paperID })
        await Comment.deleteOne({ _id: req.body.commentID })
        paper.commentCount--
        await paper.save()
        res.sendStatus(200)
    } catch (err) {
        console.error(err)
    }
})

router.post('/api/comment/:paperid', ensureUser, async (req, res) => {
    /* Recieve comment form and store in DB  */
    try {
        const comment = new Comment({
            paperID: req.params.paperid,
            userID: req.user._id,
            username: req.user.username,
            commentBody: req.body.commentBody,
            date: Date.now(),
            parentID: req.body.parentID == '' ? null : req.body.parentID,
            depth: parseInt(req.body.depth)
        })
        await comment.save()
        res.status(200).redirect(req.get('Referrer') + '#comment-form')
        const paper = await Paper.findById(req.params.paperid)
        paper.commentCount++
        await paper.save()
        await commentHelper.notifyNewComment(req.user, paper) // Create notifications for other users
        await notifyMentions(comment, paper)
        if (process.env.ENV == 'PROD' && req.body.emailAuthors == 'true') {
            await mailHelper.emailAuthors(paper, comment)
        }
    } catch (err) {
        console.error(err)
    }
})






async function notifyMentions(comment, paper) {
    /* regex search for @users and send notifications to users */
    // https://stackoverflow.com/questions/2304632/regex-for-twitter-username
    const regex = /(?<=^|(?<=[^a-zA-Z0-9-_\.]))@([A-Za-z]+[A-Za-z0-9-_]+)/igm;
    let mentions = comment.commentBody.match(regex)
    if (mentions) {
        for (let i = 0; i < mentions.length; i++) {
            const username = mentions[i].substr(1); //remove @
            const mentionedUser = await User.findOne({ username: username }).lean()
            if (mentionedUser) {
                const notify = new Notification({
                    receiverID: mentionedUser._id,
                    sender: {
                        id: comment.userID,
                        username: comment.username
                    },
                    type: 'mention',
                    paper: {
                        title: paper.title,
                        arxivID: paper.arxivID
                    },
                    date: Date.now()
                });
                await notify.save()
            }
        }
    }
}

router.post('/api/vote/:paperid', ensureUser, async (req, res) => {
    /* Take care of storing votes on papers in DB */
    try {
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
            const newVote = new Upvote({
                paperID: req.body.paperID,
                userID: req.user._id,
                vote: req.body.vote,
                date: Date.now()
            })
            await newVote.save()
            res.status(200).end('new vote saved')
        }
        await voteHelper.sumPaperVotes(req.body.paperID) //re-calculate total votes on paper
    } catch (err) {
        console.error(err)
    }
})

router.post('/mail-feedback', async (req, res) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 465,
        secure: false,
        requireTLS: false,
        auth: {
            user: 'disXourse@gmail.com',
            pass: process.env.EMAILPASS
        }
    });

    const mailOptions = {
        from: 'disXourse@gmail.com',
        to: 'nrjklk@gmail.com',
        subject: `feedback from ${req.body.email}`,
        text: req.body.feedback
    };

    let myData = {
        user: await userHelper.getUserData(req.user),
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            myData.success = false
            res.render('feedback', { myData })
            console.error(error)
        } else {
            myData.success = true
            res.render('feedback', { myData })
        }
    });
})

router.post('/simple-search', (req, res) => {
    /* Create arxiv query string (advanced) and redirect to search page */
    let queryString = `search_query=all:${req.body.searchTerm}+AND+(${global.astroCategories})`
    res.redirect(`/search/${queryString}`)
})

router.post('/advanced-search', (req, res) => {
    /* Create arxiv query string and redirect to search page */
    const queryString = searchHelper.objectToQuery(req.body)
    res.redirect(`/search/${queryString}`)
})

router.delete('/api/delete-notifs', ensureUser, async (req, res) => {
    /* Delete notification from DB */
    try {
        await Notification.deleteMany({ receiverID: req.user._id })
        res.sendStatus(200)
    } catch (err) {
        console.error(err)
    }

})

module.exports = router