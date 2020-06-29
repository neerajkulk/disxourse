const express = require('express')
const router = express.Router()
let Paper = require('../models/Paper');
let Upvote = require('../models/Upvote');
const fetchPapers = require('../fetchPapers');
const { ensureAuth, ensureGuest } = require('../middleware/auth')


router.get('/', (req, res) => res.render('front', {
    user: req.user
}))

router.get('/dashboard', ensureAuth, (req, res) => res.render('dashboard', {
    name: req.user.firstName
}))

// New feed for category
router.get('/new/:cat', (req, res) => {

    let myData = {
        title: sentencifyArxivCategory(req.params.cat),
        fetchURL: '/api' + req.url
    }
    res.render('new', {
        user: req.user,
        myData: myData
    })
})

// Page for single paper
router.get('/paper/:arxivid', (req, res) => {
    let query = { url: `http://arxiv.org/abs/${req.params.arxivid}` }
    Paper.findOne(query, (err, paper) => {
        if (paper) {
            res.render('single', {
                paper: paper,
                user: req.user
            })
        } else {
            fetchPapers.addPaperById(req.params.arxivid)
            res.redirect('back'); // reload page
        }
    })
});


// Returns JSON of new papers in the field
router.get('/api/new/:cat', (req, res) => {
    Paper.find({ category: req.params.cat }).sort('-published').limit(10).exec(function (err, newPapers) {
        let results = newPapers
        if (results.length == 0) {
            res.send('No results found')
        } else res.json(newPapers)
    });
})


// JSON of all users voted on a paper
router.get('/api/userVotes', async (req, res) => {
    if (req.user) {
        let userVotes = await Upvote.find({ userID: req.user._id }, { userID: 1, paperID: 1, vote: 1 })
        res.json(userVotes)
    } else {
        res.send('Must be logged in to view your votes')
    }

})



// Net vote count for a paper 
router.get('/api/paperVotes/:paperid', async (req, res) => {
    let sum = 0
    let paperVotes = await Upvote.find({ paperID: req.params.paperid })
    paperVotes.forEach(voteObj => { sum += voteObj.vote })
    res.send(String(sum))
})

router.post('/api/vote/:paperid', async (req, res) => {
    try {
        if (req.user) {
            // Has the user voted on the paper before?
            let previousVote = await Upvote.findOne({ paperID: req.body.paperID, userID: req.user._id })

            if (previousVote) {

                if (req.body.vote == 0) {
                    await previousVote.deleteOne()
                    res.status(200).send('Previous vote deleted')
                } else {
                    previousVote.vote = req.body.vote
                    await previousVote.save()
                    res.status(200).send('previous vote updated')
                }
            } else {
                let newVote = new Upvote({
                    paperID: req.body.paperID,
                    userID: req.user._id,
                    vote: req.body.vote
                })
                await newVote.save()
                res.status(200).end('new vote saved')
            }

        } else {
            res.status(403).send('must be logged in to vote')
            console.log('must be logged in to vote')
        }
    } catch (err) {
        console.error(err)
    }

})

// router.post('/api/vote/:paperid', async (req, res) => {

//     try {
//         if (req.user) {
//             const paper = await Paper.findById(req.params.paperid)
//             let userVoted = false
//             let voteObj = {
//                 user: req.user._id,
//                 vote: req.body.vote
//             }
//             // Update existing vote
//             for (let index = 0; index < paper.voteData.length; index++) {
//                 if (String(paper.voteData[index].user) == String(req.user._id)) {
//                     userVoted = true // user has voted previously
//                     if (voteObj.vote == 0) {
//                         paper.voteData.splice(index, 1);
//                     } else {
//                         paper.voteData[index] = voteObj
//                     }
//                     break
//                 }
//             }
//             // First time vote
//             if (userVoted == false) {
//                 paper.voteData.push(voteObj)
//             }
//             paper.netVotes = calcNetVotes(paper.voteData)
//             paper.markModified("voteData");
//             await paper.save()
//             res.status(200).send('vote stored in DB')
//         } else {
//             console.log('User not logged in')
//             res.status(403).send('User Not Logged in')
//         }
//     } catch (err) {
//         console.error(err)
//     }

// })


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


module.exports = router