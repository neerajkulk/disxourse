const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const global = require('../global');
const voteHelper = require('./voteHelpers');
const userHelper = require('./userHelpers');

const dotenv = require('dotenv')
dotenv.config({ path: '../config/config.env' })

module.exports = {
    getBaseUrl: function () {
        if (process.env.ENV == 'PROD') {
            return 'https://disxourse.com'
        } else {
            return `http://localhost:${process.env.PORT}`
        }
    },
    parseAuthors: function (authorList) {
        // Shorten list of authors
        const maxAuthors = 10
        let authorString = ''

        if (authorList.length < maxAuthors) {
            authorString = authorList.join(',  ')
        } else {
            authorString = authorList.slice(0, maxAuthors).join(',  ') + ' and Collaborators'
        }
        return authorString

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
            case 'astro-all':
                return 'All Astrophysics'
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
                paper.userVote = await voteHelper.getUserPreviousVote(paper._id, user._id)
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
    },
    parseDurationFilter: function (days) {
        days = Number(days)
        let outString = ''
        switch (days) {
            case 1:
                outString = 'Past Day'
                break;
            case 2:
                outString = 'Past 2 Days'
                break;
            case 7:
                outString = 'Past Week'
                break;
            case 14:
                outString = 'Past 2 Weeks'
                break;
            case 31:
                outString = 'Past Month'
                break;
            default:
                outString = `Past ${days} days`
                break;
        }
        return outString
    }
};