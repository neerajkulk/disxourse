let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');


module.exports = {
    // Shorten author list 
    parseAuthors: function (authorList) {
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

    // Get user's previous vote for a paper
    getUserPreviousVote: async function (paperID, userID) {
        let userVote = await Upvote.findOne({ paperID: paperID, userID: userID }).lean()
        if (userVote) {
            return userVote.vote 
        } else{
            return 0
        }

    },
};