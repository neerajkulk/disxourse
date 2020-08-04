const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const global = require('../global');
const voteHelpers = require('./voteHelpers');
const userHelper = require('./userHelpers');


module.exports = {
    removeLineBreak: function (string) {
        // https://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
        return string.replace(/(\r\n|\n|\r)/gm, " ")
    },
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
                authorString = authorString = `${authorList[0]} and collaborators`
                break;
        }
        return authorString
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
    getPaperTemplateData: async function (papers, user) {
        // Add user-specific data to pass into EJS template (previous votes)
        for (let index = 0; index < papers.length; index++) {
            paper = papers[index]
            paper.authors = module.exports.parseAuthors(paper.authors)
            if (user) {
                paper.userVote = await voteHelpers.getUserPreviousVote(paper._id, user._id)
            }
        }
        return papers
    },
    paginateURLs: function (currentURL) {
        let arr = currentURL.split('/')
        let currentPage = Number(arr.slice(-1).pop())
        let nextPage = currentPage + 1
        let prevPage = currentPage == 0 ? null : currentPage - 1
        arr.pop()
        baseURL = arr.join('/')
        return {
            first: baseURL + '/' + 0,
            prev: prevPage == null ? null : baseURL + '/' + prevPage,
            current: currentURL,
            next: baseURL + '/' + nextPage
        }
    },
    parseFilter: function (filter) {
        let outString = ''
        switch (filter) {
            case 'newest':
                outString = 'Newest'
                break;
            case 'top-week':
                outString = 'Top - Past Week'
                break
            case 'top-month':
                outString = 'Top - Past Month'
                break
            case 'top-all':
                outString = 'Top - All time'
                break
        }
        return outString
    }
};