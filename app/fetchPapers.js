const http = require('http');
const parseString = require('xml2js').parseString;


// MongoDB Schema
let Paper = require('./models/Paper.js');

// Stuff to add papers to mongoDB
function parseEntry(entry) {
    return {
        title: entry.title[0].replace(/(\r\n|\n|\r)/gm, " "),
        url: entry.id[0].slice(0, -2), // ignore arxiv versions,
        pdfUrl: entry.link.slice(-1).pop()['$'].href.slice(0, -2), // ignore arxiv versions,
        authors: entry.author.map(name => name.name[0]),
        abstract: entry.summary[0].replace(/(\r\n|\n|\r)/gm, " "),
        updated: entry.updated[0],
        published: entry.published[0],
        category: entry.category.map(cat => cat['$'].term)
    }
}

function saveEntry(entry) {
    const paper = new Paper(parseEntry(entry))
    Paper.countDocuments({ url: paper.url }, function (err, count) {
        if (count === 0) {
            paper.save((err, paper) => {
                if (err) return console.error(err);
                console.log(`added ${paper.url} to DB`)
            })
        }
    });
}

function updateDB(queryString) {
    // Play Nice
    // Separate API calls by 3 seconds
    // Keep queries under 1000 results.
    http.get(queryString, (resp) => {
        let data = ''
        resp.on('data', (chunk) => {
            data += chunk
        })
        resp.on('end', () => {
            parseString(data, function (err, papersJSON) {
                papersJSON.feed.entry.map(entry => {
                    saveEntry(entry)
                })
            })
        })
    }).on("error", (err) => {
        console.log("Error: " + err.message)
    })
}

function addPaperById(arxivID) {
    let queryString = `http://export.arxiv.org/api/query?id_list=${arxivID}`
    updateDB(queryString)
}

module.exports = {
    updateDB,
    addPaperById
};

