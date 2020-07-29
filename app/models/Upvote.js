const mongoose = require('mongoose')

let upvoteSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        ref: 'Papers'
    },
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'Users'
    },
    vote: {
        type: Number,
        required: true,
        enum: [-1, 1]
    }
})

module.exports = mongoose.model('Upvotes', upvoteSchema);
