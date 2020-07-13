const mongoose = require('mongoose')

let upvoteSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        ref: 'Paper'
    },
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    vote: {
        type: Number,
        required: true,
        enum: [-1, 1]
    }
})

module.exports = mongoose.model('Upvotes', upvoteSchema);
