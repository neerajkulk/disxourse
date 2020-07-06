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
    },
    getPaperTemplateData: async function (papers, user) {
        // Add user-specific data to pass into EJS template (previous votes)
        for (let index = 0; index < papers.length; index++) {
            paper = papers[index]
            paper.authors = module.exports.parseAuthors(paper.authors)
            if (user) {
                paper.userVote = await module.exports.getUserPreviousVote(paper._id, user._id)
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
    queryPapers: async function (category, filter, resultsPerPage, page) {
        let results
        let d = new Date()
        let query
        switch (filter) {
            case 'newest':
                results = await Paper.find({ category: category }).sort('-published').skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break;
            case 'top-week':
                d.setDate(d.getDate() - 7);
                query = { category: category, published: { "$gte": d } }
                results = await Paper.find(query).sort('-voteScore').skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-month':
                d.setDate(d.getDate() - 30);
                query = { category: category, published: { "$gte": d } }
                results = await Paper.find(query).sort('-voteScore').skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-all':
                query = { category: category }
                results = await Paper.find(query).sort('-voteScore').skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            default:
                results = []
                break
        }
        return results
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