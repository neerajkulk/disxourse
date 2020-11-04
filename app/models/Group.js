const mongoose = require('mongoose')


let groupSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    members: [{
        type: mongoose.Types.ObjectId,
        ref: 'Users'
    }],
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model('Groups', groupSchema);