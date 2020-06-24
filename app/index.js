const path = require('path');
const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
dotenv.config({ path: './config/config.env' })

const ejs = require('ejs');

const connectDB = require('./config/db')
connectDB()

const app = express()
const PORT = process.env.PORT || 3000

// set the view engine to ejs
app.set('view engine', 'ejs');


// Middleware
app.use(express.static(path.join(__dirname, 'public')))

// body-parser stuff
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


// Routes
app.use('/', require('./routes/routes'))
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`))


const fetchPapers = require('./fetchPapers');
let query = "http://export.arxiv.org/api/query?search_query=cat:astro-ph.SR&start=0&max_results=30&sortBy=submittedDate&sortOrder=descending"
//fetchPapers.updateDB(query)

