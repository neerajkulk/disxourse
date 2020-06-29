const path = require('path');
const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
dotenv.config({ path: './config/config.env' })
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const ejs = require('ejs');
const mongoose = require('mongoose')

// Passport
const passport = require('passport')
require('./config/passport')(passport)

const connectDB = require('./config/db')
connectDB()

const app = express()
const PORT = process.env.PORT || 3000

// set the view engine to ejs
app.set('view engine', 'ejs');


// Set Static folder
app.use(express.static(path.join(__dirname, 'public')))

// express-session middleware
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    //cookie: { secure: true }, Wont work without https
    store: new MongoStore({ mongooseConnection:mongoose.connection})
}))

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// body-parser stuff
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


// Routes
app.use('/', require('./routes/routes'))
app.use('/', require('./routes/auth'))

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`))


const fetchPapers = require('./fetchPapers');
let query = "http://export.arxiv.org/api/query?search_query=cat:astro-ph.SR&start=0&max_results=30&sortBy=submittedDate&sortOrder=descending"
//fetchPapers.updateDB(query)

