let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');


module.exports = {
    parseAuthors: function (authorList) {
        // Shorten list of authors
        let authorString = ''
        switch (authorList.length) {
            case 1:
                authorString = authorList[0]
                break;
            case 2:
                authorString = `${authorList[0]} and ${authorList[1]}`
                break
            default:
                authorString = authorString = `${authorList[0]} Et al.`
                break;
        }
        return authorString
    },

    getUserPreviousVote: async function (paperID, userID) {
        // Returns user's previous vote on a paper 
        let userVote = await Upvote.findOne({ paperID: paperID, userID: userID }).lean()
        if (userVote) {
            return userVote.vote
        } else {
            return 0
        }
    },
    sentencifyArxivCategory: function (cat) {
        switch (cat) {
            case 'astro-ph.CO':
                return 'Cosmology and Nongalactic Astrophysics'
            case 'astro-ph.EP':
                return 'Earth and Planetary Astrophysics'
            case 'astro-ph.GA':
                return 'Astrophysics of Galaxies'
            case 'astro-ph.HE':
                return 'High Energy Astrophysical Phenomena'
            case 'astro-ph.IM':
                return 'Instrumentation and Methods for Astrophysics'
            case 'astro-ph.SR':
                return 'Solar and Stellar Astrophysics'
            default:
                return 'Not valid'
        }
    },
    sumPaperVotes: async function (paperID) {
        // Compute net upvotes of a paper by summing up all votes
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
    }
};