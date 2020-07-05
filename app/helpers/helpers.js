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
};