const Paper = require('../models/Paper');
const Upvote = require('../models/Upvote');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const global = require('../global');

module.exports = {
    hasUsername: function (user) {
        /* Used to see if req.user has registered with a username eg: hasUsername(req.user) */
        if (user) {
            if (user.username) {
                return user
            }
        }
        return undefined
    },
    getUserData: async function (reqUser) {
        let userData     // User data required to be rendered in templates
        if (module.exports.hasUsername(reqUser)) {
            userData = module.exports.hasUsername(reqUser)
            userData.unread = await Notification.countDocuments({ receiverID: reqUser._id }) // number of unread notifications
        } else {
            userData = undefined
        }
        return userData
    },
    usernameTaken: async function (username) {
        // Checks if username exists in DB
        let user = await User.findOne({ username: username })
        console.log(user)
        if (user) {
            return true
        } else {
            return false
        }
    }
}

