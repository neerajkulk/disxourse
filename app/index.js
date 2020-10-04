const path = require('path');
const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
dotenv.config({ path: './config/config.env' })
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)

const ejs = require('ejs');
const mongoose = require('mongoose')

const passport = require('passport')
require('./config/passport')(passport)

const connectDB = require('./config/db')
connectDB()

// AWS required for SES (email service)
const AWSconfig = require('./config/aws')
AWSconfig()

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
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}))

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// body-parser stuff
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


// Routes
app.use('/', require('./routes/auth'))
app.use('/', require('./routes/api'))
app.use('/', require('./routes/pages'))

app.listen(PORT, () => console.log(`Server running in ${process.env.ENV} mode at http://localhost:${PORT}`))

// cron jobs
const getNewPapers = require('./cron/getNewPapers')


// Load papers at start
const fetchPapers = require('./fetchPapers')
//fetchPapers.updateDB(startIndex = 0, maxIndex = 100, querySize = 100, earlyExit = false)


// const fs = require('fs');
// const download = require('download');
// const pdf = require('pdf-parse');


// function mailRegex(text) {
//     return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
// }

// async function scrapeEmails(pdfURL) {
//     const randFname = Math.floor(Math.random() * 100000) + 1
//     const data = await download(pdfURL);
//     fs.writeFileSync(`./paper-${randFname}.pdf`, data);
//     let dataBuffer = fs.readFileSync(`./paper-${randFname}.pdf`);
//     let pdfdata = await pdf(dataBuffer)

//     fs.unlink(`./paper-${randFname}.pdf`, (err) => {
//         if (err) {
//             console.error(err)
//             return
//         }
//     })
//     return mailRegex(pdfdata.text)
// }

// scrapeEmails('https://arxiv.org/pdf/2007.09369.pdf').then(x => { console.log(x) })
// //scrapeEmails('https://arxiv.org/pdf/2008.12779.pdf').then(x => { console.log(x) })

