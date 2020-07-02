const mongoose = require('mongoose')

let commentSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    userID: {
        type: mongoose.Types.ObjectId,
        required: true
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
