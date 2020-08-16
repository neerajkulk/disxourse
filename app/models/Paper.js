const mongoose = require('mongoose')

let paperSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    pdfUrl: {
        type: String,
        required: true
    },
    arxivID: {
        type: String,
        required: true
    },
    authors: {
        type: [String],
        required: true
    },
    emails: {
        type: [String],
        default: undefined
    },
    abstract: {
        type: String,
        required: true
    },
    updated: {
        type: Date
    },
    published: {
        type: Date
    },
    category: {
        type: [String]
    },
    voteScore: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model('Papers', paperSchema);