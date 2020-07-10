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

function parseURL(url) {
    return removeVersion(url).replace(/^http:\/\//i, 'https://')
}

function getArxivID(url) {
    return lastElement(url.split('/'))
}

// Stuff to add papers to mongoDB
function parseEntry(entry) {
    const url = parseURL(entry.id._text)
    return {
        title: removeLineBreak(entry.title._text),
        url: url,
        pdfUrl: parseURL(lastElement(entry.link)._attributes.href),
        arxivID: getArxivID(url),
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
        let parsed = JSON.parse(convert.xml2json(response.data, { compact: true, spaces: 4 }));
        return parsed.feed.entry
    } catch (err) {
        console.error(err)
    }
}

async function updateDB(startIndex = 0, maxIndex = 1000, querySize = 100, earlyExit = false) {
    try {
        let totalPapersAdded = 0
        const baseURL = "http://export.arxiv.org/api/query?search_query=cat:astro-ph.CO+OR+cat:astro-ph.EP+OR+cat:astro-ph.GA+OR+cat:astro-ph.HE+OR+cat:astro-ph.IM+OR+cat:astro-ph.SR"

        for (startIndex = 0; startIndex < maxIndex; startIndex += querySize) {
            let currentQueryNewPapers = 0

            let queryString = baseURL + `&start=${startIndex}&max_results=${querySize}&sortBy=submittedDate&sortOrder=descending`
            console.log('fetching papers from: \n' + queryString)
            let parsed

            // I think sometimes the arxiv API doesn't work and I have to try again. IDK why?
            do {
                await sleep(5000)
                parsed = await QueryToJSON(queryString)
            } while (parsed == undefined);

            for (let entry = 0; entry < parsed.length; entry++) {
                let saved = await saveEntry(parsed[entry])
                if (saved) { currentQueryNewPapers++ }
            }
            totalPapersAdded += currentQueryNewPapers
            console.log(`\n *** Added ${currentQueryNewPapers} new papers from current query *** \n`)

            if (earlyExit && currentQueryNewPapers == 0) {
                console.log('\n \n ----------- All up to date ---------- \n \n')
                break
            }

            await sleep(5000) // Let's not break arXiv API
        }

        if (startIndex == maxIndex) {
            console.log('\n \n ----------- Max iteration Limit reached ---------- \n \n')
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

