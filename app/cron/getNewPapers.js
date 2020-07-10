const fetchPapers = require('../fetchPapers')
const CronJob = require('cron').CronJob;
// Add new papers 1AM PST everyday
const job = new CronJob('0 0 1 * * *', function() {
  fetchPapers.updateDB(startIndex = 0, maxIndex = 1000, querySize = 100, earlyExit = false)
}, null, true, 'America/Los_Angeles');
job.start();

module.exports = job
