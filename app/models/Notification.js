const mongoose = require('mongoose')

let notificationSchema = mongoose.Schema({
    receiverID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    sender: {
        id: {
            type: mongoose.Types.ObjectId,
            ref: 'Users'
        },
        username: {
            type: String,
            required: true
        }
    },
    date: {
        type: Date,
        default: Date.now(),
    },
    paper: {
        title: {
            type: String,
            required: true
        },
        arxivID: {
            type: String,
            required: true
        }
    }
})

module.exports = mongoose.model('Notifications', notificationSchema);
