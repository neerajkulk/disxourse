const axios = require('axios').default;
const convert = require('xml-js');


// MongoDB Schema
let Paper = require('./models/Paper.js');

function removeVersion(arxivURL) {
    return arxivURL.slice(0, -2)
}

function removeLineBreak(string) {
    // https://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
    return string.replace(/(\r\n|\n|\r)/gm, "")
}

async function sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
}

function lastElement(array) {
    return array.slice(-1).pop()
}

function parseCategory(entry) {
    if (Array.isArray(entry.category)) {
        return entry.category.map(cat => cat._attributes.term)
    } else {
        return entry.category._attributes.term
    }
}

function parseAuthor(entry) {
    if (Array.isArray(entry.author)) {
        return entry.author.map(name => name.name._text)
    } else {
        return entry.author.name._text
    }
}
// Stuff to add papers to mongoDB
function parseEntry(entry) {
    const url = removeVersion(entry.id._text)
    return {
        title: removeLineBreak(entry.title._text),
        url: url,
        pdfUrl: removeVersion(lastElement(entry.link)._attributes.href),
        arxivID: lastElement(url.split('/')),
        authors: parseAuthor(entry),
        abstract: removeLineBreak(entry.summary._text),
        updated: entry.updated._text,
        published: entry.published._text,
        category: parseCategory(entry)
    }
}


async function saveEntry(entry) {
    try {
        const paper = new Paper(parseEntry(entry))
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
}

async function QueryToJSON(queryString) {
    try {
        const response = await axios.get(queryString);
        console.log(response.data)
        let parsed = JSON.parse(convert.xml2json(response.data, { compact: true, spaces: 4 }));
        return parsed.feed.entry
    } catch (err) {
        console.error(err)
    }
}

async function updateDB() {
    try {
        let startIndex = 0
        let maxIndex = 1000  //10
        let querySize = 100 // 100
        let totalPapersAdded = 0
        const baseURL = "http://export.arxiv.org/api/query?search_query=cat:astro-ph.CO+OR+astro-ph.EP+OR+astro-ph.GA+OR+astro-ph.HE+OR+astro-ph.IM+OR+astro-ph.SR"


        for (startIndex = 0; startIndex < maxIndex; startIndex += querySize) {
            let currentQueryNewPapers = 0

            let queryString = baseURL + `&start=${startIndex}&max_results=${querySize}&sortBy=submittedDate&sortOrder=descending`
            console.log(queryString)
            let parsed = await QueryToJSON(queryString)

            for (let entry = 0; entry < parsed.length; entry++) {
                let saved = await saveEntry(parsed[entry])
                if (saved) { currentQueryNewPapers++ }
            }
            totalPapersAdded += currentQueryNewPapers
            console.log(`\n *** Added ${currentQueryNewPapers} new papers from current query *** \n`)

            if (currentQueryNewPapers == 0) {
                console.log('\n \n ----------- All up to date ---------- \n \n')
                break
            }

            await sleep(5000) // Let's not break arXiv API
        }

        if (startIndex == maxIndex) {
            console.log('\n \n ----------- Max iteration Limit reached!?!?! ---------- \n \n')
        }

        console.log(`\n ***** ${totalPapersAdded} new papers added *****`)

    } catch (error) {
        console.error(error);
    }
}

async function addPaperById(arxivID) {
    try {
        let queryString = `http://export.arxiv.org/api/query?id_list=${arxivID}`
        let parsed = await QueryToJSON(queryString)
        await saveEntry(parsed)
    } catch (err) {
        console.err(err)
    }
}

module.exports = {
    updateDB,
    addPaperById
};

