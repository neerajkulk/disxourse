const http = require('http');
const path = require('path');
const express = require('express')
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
let ejs = require('ejs');
const parseString = require('xml2js').parseString;


const app = express()
const port = 3000

// MongoDB connect
mongoose.connect('mongodb://localhost/arxiv', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to mongoDB')
});

// MongoDB Schema
let Paper = require('./models/papers.js');
const { rejects } = require('assert');


// set the view engine to ejs
app.set('view engine', 'ejs');


// Middleware
app.use(express.static(path.join(__dirname, 'public')))

// body-parser stuff
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.get('/test/:id', (req, res) => {
    // console.log('test: ' + req.url)
})


app.get('/', (req, res) => res.render('front'))

app.get('/new/:cat', (req, res) => {
    
    let myData = {
        title:sentencifyArxivCategory(req.params.cat),
        fetchURL:'/api'+req.url
    }
    
    console.log(myData.title)
    res.render('new',{myData})
})

app.get('/api/new/:cat', (req, res) => {
    Paper.find({ category: req.params.cat }).sort('-published').limit(10).exec(function (err, newPapers) {
        let results = newPapers
        if (results.length == 0) {
            res.send('No results found')
        } else res.json(newPapers)
    });
})


app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))


function sentencifyArxivCategory(cat) {
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
}


// Stuff to add papers to mongoDB
function parseEntry(entry) {
    return {
        title: entry.title[0].replace(/(\r\n|\n|\r)/gm, " "),
        url: entry.id[0].slice(0, -2), // ignore arxiv versions
        authors: entry.author.map(name => name.name[0]),
        abstract: entry.summary[0].replace(/(\r\n|\n|\r)/gm, " "),
        updated: entry.updated[0],
        published: entry.published[0],
        category: entry.category.map(cat => cat['$'].term),
    }
}

function saveEntry(entry) {
    const paper = new Paper(parseEntry(entry))
    Paper.countDocuments({ url: paper.url }, function (err, count) {
        if (count === 0) {
            paper.save((err, paper) => {
                if (err) return console.error(err);
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

let query = "http://export.arxiv.org/api/query?search_query=cat:astro-ph.SR&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending"

//updateDB(query)