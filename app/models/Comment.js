const mongoose = require('mongoose')

let commentSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        ref: 'Paper'
    },
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    displayName: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    commentBody: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Comments', commentSchema);
