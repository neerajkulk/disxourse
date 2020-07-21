const axios = require('axios').default;
const convert = require('xml-js');
const Paper = require('./models/Paper.js');
const global = require('./global');

module.exports = {
    removeVersion: function (arxivURL) {
        return arxivURL.slice(0, -2)
    },
    removeLineBreak: function (string) {
        // https://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
        return string.replace(/(\r\n|\n|\r)/gm, " ")
    },
    sleep: async function (ms) {
        await new Promise(r => setTimeout(r, ms));
    },
    lastElement: function (array) {
        return array.slice(-1).pop()
    },
    parseCategory: function (entry) {
        if (Array.isArray(entry.category)) {
            return entry.category.map(cat => cat._attributes.term)
        } else {
            return entry.category._attributes.term
        }
    },
    parseAuthor: function (entry) {
        if (Array.isArray(entry.author)) {
            return entry.author.map(name => name.name._text)
        } else {
            return entry.author.name._text
        }
    },
    parseURL: function (url) {
        return module.exports.removeVersion(url).replace(/^http:\/\//i, 'https://')
    },
    getArxivID: function (url) {
        let arr = url.split('/')
        if (arr.length == 5) {
            // post 2007
            return module.exports.lastElement(url.split('/'))
        }
        else if (arr.length == 6) {
            // pre 2007
            return arr.slice(4, 6).join(':')
        }
    },
    // Stuff to add papers to mongoDB
    parseEntry: function (entry) {
        const url = module.exports.parseURL(entry.id._text)
        return {
            title: module.exports.removeLineBreak(entry.title._text),
            url: url,
            pdfUrl: module.exports.parseURL(module.exports.lastElement(entry.link)._attributes.href),
            arxivID: module.exports.getArxivID(url),
            authors: module.exports.parseAuthor(entry),
            abstract: module.exports.removeLineBreak(entry.summary._text),
            updated: entry.updated._text,
            published: entry.published._text,
            category: module.exports.parseCategory(entry)
        }
    },
    saveEntry: async function (entry) {
        try {
            const paper = new Paper(module.exports.parseEntry(entry))
            const alreadyExists = await Paper.findOne({ arxivID: paper.arxivID })
            if (!alreadyExists) {
                await paper.save()
                console.log(`${paper.arxivID} has been added`)
                return true
            } else {
                console.log(`${paper.arxivID} already exists`)
                return false
            }
        } catch (err) {
            console.error(err)
        }
    },
    QueryToJSON: async function (queryString) {
        try {
            const response = await axios.get(queryString);
            let parsed = JSON.parse(convert.xml2json(response.data, { compact: true, spaces: 4 }));
            let data = parsed.feed.entry
            if (data == undefined) {
                return [] // no papers
            } else if (data.length == undefined) {
                return [data] // 1 paper
            } else {
                return data // >1 papers
            }
        } catch (err) {
            console.error(err)
            return []
        }
    },
    updateDB: async function (startIndex = 0, maxIndex = 1000, querySize = 100, earlyExit = false) {
        try {
            let totalPapersAdded = 0
            const baseURL = `http://export.arxiv.org/api/query?search_query=${global.astroCategories}`

            for (startIndex = 0; startIndex < maxIndex; startIndex += querySize) {
                let currentQueryNewPapers = 0

                let queryString = baseURL + `&start=${startIndex}&max_results=${querySize}&sortBy=submittedDate&sortOrder=descending`
                console.log('fetching papers from: \n' + queryString)
                let parsed

                // I think sometimes the arxiv API doesn't work and I have to try again. IDK why?
                do {
                    await module.exports.sleep(5000)
                    parsed = await module.exports.QueryToJSON(queryString)
                } while (parsed == undefined);

                for (let entry = 0; entry < parsed.length; entry++) {
                    let saved = await module.exports.saveEntry(parsed[entry])
                    if (saved) { currentQueryNewPapers++ }
                }
                totalPapersAdded += currentQueryNewPapers
                console.log(`\n *** Added ${currentQueryNewPapers} new papers from current query *** \n`)

                if (earlyExit && currentQueryNewPapers == 0) {
                    console.log('\n \n ----------- All up to date ---------- \n \n')
                    break
                }

                await module.exports.sleep(5000) // Let's not break arXiv API
            }

            if (startIndex == maxIndex) {
                console.log('\n \n ----------- Max iteration Limit reached ---------- \n \n')
            }

            console.log(`\n ***** ${totalPapersAdded} new papers added *****`)

        } catch (error) {
            console.error(error);
        }
    },
    addPaperById: async function (arxivID) {
        try {
            arxivID = arxivID.replace(":", "/") // pre-2007 arxivID's
            let queryString = `http://export.arxiv.org/api/query?id_list=${arxivID}`
            let parsed = await module.exports.QueryToJSON(queryString)
            await module.exports.saveEntry(parsed)
        } catch (err) {
            console.err(err)
        }
    }
}

