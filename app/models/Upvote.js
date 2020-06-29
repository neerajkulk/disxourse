const mongoose = require('mongoose')

let upvoteSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    userID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    vote: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Upvotes', upvoteSchema);
