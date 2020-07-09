const dotenv = require('dotenv')
dotenv.config({ path: '../config/config.env' })
const connectDB = require('../config/db')
const fetchPapers = require('../fetchPapers');

let promise = new Promise(function (resolve, reject) {
    connectDB()
    resolve()
});

promise.then(fetchPapers.updateDB)
