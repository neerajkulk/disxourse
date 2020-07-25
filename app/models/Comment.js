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
    username: {
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
    },
    parentID: {
        type: mongoose.Types.ObjectId,
        default: null
    }
})

module.exports = mongoose.model('Comments', commentSchema);
