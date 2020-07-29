const mongoose = require('mongoose')

let commentSchema = mongoose.Schema({
    paperID: {
        type: mongoose.Types.ObjectId,
        ref: 'Papers'
    },
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'Users'
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
    },
    depth: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Comments', commentSchema);
