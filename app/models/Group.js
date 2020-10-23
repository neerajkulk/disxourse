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
    admins: [{
        type: mongoose.Types.ObjectId,
        ref: 'Users'
    }]
})

module.exports = mongoose.model('Groups', groupSchema);