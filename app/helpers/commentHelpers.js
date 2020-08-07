const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

const global = require('../global');

module.exports = {
    formatComment: async function (comment) {
        /* replace \r\n linebreaks with <br> html tags */
        comment.commentBody = comment.commentBody.replace(/\r\n/g, "<br>")
        /* hyperlink mentions to user profiles */
        const regex = /(?<=^|(?<=[^a-zA-Z0-9-_\.]))@([A-Za-z]+[A-Za-z0-9-_]+)/igm;
        const mentions = comment.commentBody.match(regex)
        if (mentions) {
            for (let i = 0; i < mentions.length; i++) {
                const mentionedUser = await User.findOne({ username: mentions[i].substring(1) }).lean()
                comment.commentBody = comment.commentBody.replace(mentions[i], `<a href="/user-public/${mentionedUser._id}">${mentions[i]}</a>`)
            }
        }
        return comment
    },
    formatComments: async function (comments) {
        /* format an array of comments */
        for (let i = 0; i < comments.length; i++) {
            comments[i] = await module.exports.formatComment(comments[i])
        }
        return comments
    },
    makeCommentsThread: async function (commentsDB) {
        /* Turn array of comments into a nested object by recursively matching parentID's */
        let comments = [] // store threads here
        for (let i = 0; i < commentsDB.length; i++) {
            comment = await module.exports.formatComment(commentsDB[i])
            comment.comments = []
            if (comment.parentID == null) {
                comments.push(comment)
            } else {
                insertComment(comments, comment)
            }
        }
        return comments

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
    },
    groupCommentsByPaper: function (comments) {
        /* Get User comments and group them by paper */
        let commentData = [] // poplate comments in this array 
        comments.forEach(comment => {
            let newComment = true
            commentData.forEach(prevComment => {
                // check if comment belongs to a paper
                if (prevComment.paper.paperID.toString() == comment.paperID._id.toString()) {
                    prevComment.comments.push({
                        commentBody: comment.commentBody,
                        date: comment.date,
                        username: comment.username,
                        userID: comment.userID
                    })
                    newComment = false
                }
            })
            if (newComment) {
                // no previous comments
                commentData.push({
                    paper: {
                        paperID: comment.paperID._id,
                        url: `/paper/${comment.paperID.arxivID}`,
                        title: comment.paperID.title
                    },
                    comments: [{
                        commentBody: comment.commentBody,
                        date: comment.date,
                        username: comment.username,
                        userID: comment.userID
                    }]
                })
            }
        })
        return commentData
    },
    notifyNewComment: async function (sender, paper) {
        /* Create notification for each engaged user when a new comment is posted */
        let usersID = await module.exports.getEngagedUsers(paper._id)
        for (let i = 0; i < usersID.length; i++) {
            const userID = usersID[i];
            if (sender._id.toString() != userID) {
                const notification = new Notification({
                    receiverID: userID,
                    sender: {
                        id: sender._id.toString(),
                        username: sender.username
                    },
                    type: 'comment',
                    date: Date.now(),
                    paper: {
                        title: paper.title,
                        arxivID: paper.arxivID
                    }
                });
                await notification.save()
            }
        }
    },
    getEngagedUsers: async function (paperID) {
        /* List of user ID's that have upvoted or commented on a paper */
        let comments = await Comment.find({ paperID: paperID })
        let upvotes = await Upvote.find({ paperID: paperID })
        users = []
        comments.forEach(comment => {
            let id = comment.userID.toString()
            if (!users.includes(id)) {
                users.push(id)
            }
        })
        upvotes.forEach(upvote => {
            let id = upvote.userID.toString()
            if (!users.includes(id)) {
                users.push(id)
            }
        })
        return users
    }
}