const express = require('express')
const router = express.Router()
const User = require('../models/User');
const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Group = require('../models/Group');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureUser, storeReq, ensureGuest, ensurePrivate } = require('../middleware/auth')
const helpers = require('../helpers/helpers');
const voteHelper = require('../helpers/voteHelpers');
const global = require('../global');
const paperQueryHelper = require('../helpers/paperQueryHelpers');
const userHelper = require('../helpers/userHelpers');
const searchHelper = require('../helpers/searchHelpers');
const commentHelper = require('../helpers/commentHelpers');


router.get('/', storeReq, async (req, res) => {
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

router.get('/about', storeReq, async (req, res) => {
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

router.get('/feedback', storeReq, async (req, res) => {
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

router.get('/feed/:cat/:filter/:page', storeReq, async (req, res) => {
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

router.get('/paper/:arxivid', storeReq, async (req, res) => {
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

router.get('/search/:query', storeReq, async (req, res) => {
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

router.get('/user-public/:userID', storeReq, async (req, res) => {
    /* Other users see this public page for any user */
    try {
        const voteCount = await Upvote.countDocuments({ userID: req.params.userID })

        let userComments = await Comment.find({ userID: req.params.userID }).sort({ date: -1 }).limit(30).populate('paperID').lean()
        userComments = userComments.filter(comment => comment.paperID != null) // de-referenced papers (should not happen)
        const commentCount = userComments.length
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

router.get('/group/:id', ensureUser, async (req, res) => {
    /* Show voted papers by group members. Sort paper list by votes */
    try {
        const group = await Group.findById(req.params.id).lean()
        if (group.members.map(id => id.toString()).includes(req.user.id.toString())) {
            let date = new Date();
            date.setDate(date.getDate() - 7) /* Hardcoded search upvotes from a week ago */
            let papersVoted = []
            for (let i = 0; i < group.members.length; i++) {
                upvotes = await Upvote.find({ userID: group.members[i], date: { "$gte": date } })
                    .populate('paperID')
                    .populate('userID')
                    .lean()
                upvotes.forEach(vote => {
                    let paperExists = false;
                    /* check if paper has already been added to array */
                    for (let i = 0; i < papersVoted.length; i++) {
                        const paper = papersVoted[i].paper;
                        if (paper._id.toString() == vote.paperID._id.toString()) {
                            papersVoted[i].votes.push({
                                username: vote.userID.username,
                                vote: vote.vote
                            })
                            paperExists = true
                            break
                        }
                    }
                    if (!paperExists) {
                        papersVoted.push({
                            paper: vote.paperID,
                            votes: [{
                                username: vote.userID.username,
                                vote: vote.vote
                            }]
                        })
                    }
                })
            }
            papersVoted.forEach(paper => {
                /* Parse authors */
                paper.paper.authors = helpers.parseAuthors(paper.paper.authors)
            })
            papersVoted.forEach(paper => {
                /* Recalculate voteScore using only users in group */
                paper.paper.voteScore = voteHelper.addVotes(paper.votes)
            })
            papersVoted.sort((a, b) => b.paper.voteScore - a.paper.voteScore) /* Sort by upvotes */

            const myData = {
                papersVoted: papersVoted,
                user: await userHelper.getUserData(req.user),
                group: group
            }
            res.render('group', { myData })
        } else {
            res.redirect('/')
        }

    } catch (err) {
        console.error(err)
    }
})

router.get('/groups-main', storeReq, ensureUser, async (req, res) => {
    /* main page for groups. Show list of groups user belongs to */
    try {
        let groups = await Group.find({ members: req.user._id })
            .populate('members', 'username -_id')

        /* format group fields */
        if (groups.length != 0) {
            groups.forEach((group, i, groups) => {
                groups[i].members.forEach((user, i, members) => { members[i] = user.username })
            })
        }

        const myData = {
            user: await userHelper.getUserData(req.user),
            groups: groups,
            baseURL: helpers.getBaseUrl()
        }
        res.render('group-main', { myData })
    } catch (err) {
        console.error(err)
    }
})

router.get('/new-group', storeReq, ensureUser, async (req, res) => {
    /* Create a new group. Once group has been created, url to join group is rendered */
    try {
        const myData = {
            user: await userHelper.getUserData(req.user),
        }
        res.render('new-group', { myData })
    } catch (err) {
        console.error(err)
    }
})

router.get('/join-group/:id', storeReq, ensureUser, async (req, res) => {
    /* Adds user as a group member and redirects to main group page */
    try {
        const group = await Group.findById(req.params.id)

        if (group.members.includes(req.user._id)) {
            // No duplicates
        } else {
            group.members.push(req.user._id)
            await group.save()
        }
        res.redirect('/groups-main')
    } catch (err) {
        console.error(err)
    }
})


module.exports = router