const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const User = require('../models/Upvote');
const global = require('../global');


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
                authorString = authorString = `${authorList[0]} and collaborators`
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
                results = await Paper.find({ category: category }).sort({ published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break;
            case 'top-week':
                d.setDate(d.getDate() - 7);
                query = { category: category, published: { "$gte": d } }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-month':
                d.setDate(d.getDate() - 30);
                query = { category: category, published: { "$gte": d } }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-all':
                query = { category: category }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
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
    },
    hasUsername: function (user) {
        // Used to see if req.user has a username
        if (user) {
            if (user.username) {
                return user
            }
        }
        return undefined
    },
    usernameTaken: async function (username) {
        // Checks if username exists in DB
        let user = await User.findOne({ username: username })
        if (user) {
            return true
        } else {
            return false
        }
    },
    arxivQueryString: function (query) {
        // Sort order here?
        return `http://export.arxiv.org/api/query?${query}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${global.resultsPerPage}`
    },
    queryToObject: function (queryString) {
        let queryObject = {}
        queryString.split('&').forEach(param => {
            if (param.includes('id_list')) {
                queryObject.id_list = param.split('=')[1]
            } else if (param.includes('search_query')) {
                let searchFields = param.split('=')[1].split('+AND+')
                searchFields.forEach(element => {
                    queryObject[element.split(':')[0]] = element.split(':')[1]
                })
            }
        })
        return queryObject
    },
    objectToQuery: function (reqBody) {
        let queryString = ''

        if (reqBody.id_list != '' && reqBody.id_list != undefined) {
            queryString += `id_list=${reqBody.id_list}&`
            reqBody.id_list = ''
        }
        let queryParams = []
        for (const key in reqBody) {
            if (reqBody[key] != '') {
                queryParams.push(`${key}:${reqBody[key]}`)
            }
        }
        queryParams.push(`(${global.astroCategories})`)
        queryString += `search_query=${queryParams.join('+AND+')}`
        return queryString
    }
};