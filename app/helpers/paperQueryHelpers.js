const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const global = require('../global');


module.exports = {
    queryPapers: async function (category, filter, resultsPerPage, page) {
        /* Fetch papers from DB based on category filter and page */
        let results
        let d = new Date()
        let query
        switch (filter) {
            case 'newest':
                results = await Paper.find({ category: category }).sort({ published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break;
            case 'top-week':
                d.setDate(d.getDate() - 8);
                query = { category: category, published: { "$gte": d } }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-month':
                d.setDate(d.getDate() - 31);
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
    }
}