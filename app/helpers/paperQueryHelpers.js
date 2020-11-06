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

        /* kinda hacky way to get papers in all astro categories. 
        Users should be able to choose what categories they want to follow in dashboard.
        While I only serve astro papers, this solution is okay. But if I want to expand to all of arXiv, 
        categories should be defined for each user and feed is personalized for the user. 
        Grep 'astro-all' when refactoring this */

        if (category == 'astro-all') {
            query = {
                $or: [{ category: 'astro-ph.CO' },
                { category: 'astro-ph.EP' },
                { category: 'astro-ph.GA' },
                { category: 'astro-ph.HE' },
                { category: 'astro-ph.IM' },
                { category: 'astro-ph.SR' }]
            }
        } else {
            query = { category: category }
        }

        /* single arXiv categories */
        switch (filter) {
            case 'newest':
                results = await Paper.find(query).sort({ published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break;
            case 'top-week':
                d.setDate(d.getDate() - 8);
                query.published = { "$gte": d }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-month':
                d.setDate(d.getDate() - 31);
                query.published = { "$gte": d }
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            case 'top-all':
                results = await Paper.find(query).sort({ voteScore: -1, published: -1 }).skip(resultsPerPage * page).limit(resultsPerPage).lean()
                break
            default:
                results = []
                break
        }
        return results
    }
}