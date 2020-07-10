const fetchPapers = require('../fetchPapers')
const CronJob = require('cron').CronJob;
// Add new papers 1AM PST everyday
const job = new CronJob('0 0 1 * * *', function() {
  fetchPapers.updateDB()
}, null, true, 'America/Los_Angeles');
job.start();

module.exports = job
