const mongoose = require('mongoose')

let notificationSchema = mongoose.Schema({
    userID: {
        type: mongoose.Types.ObjectId,
        ref: 'Users'
    },
    message: {
        type: String
    },
    read: {
        type: Boolean
    },
    date: {
        type: Date,
        default: Date.now(),
    }
})

module.exports = mongoose.model('Notifications', notificationSchema);
