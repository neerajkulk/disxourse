const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const global = require('../global');

module.exports = {
    getUserPreviousVote: async function (paperID, userID) {
        /* Returns user's previous vote on a paper */
        let userVote = await Upvote.findOne({ paperID: paperID, userID: userID }).lean()
        if (userVote) {
            return userVote.vote
        } else {
            return 0
        }
    },
    sumPaperVotes: async function (paperID) {
        /* Compute net upvotes of a paper by summing up all votes */
        try {
            let paper = await Paper.findById(paperID)

            let sum = 0
            let paperVotes = await Upvote.find({ paperID: paperID })
            paperVotes.forEach(voteObj => { sum += voteObj.vote })
            paper.voteScore = sum
            await paper.save()

        } catch (err) {
            console.error(err)
        }
    },
}