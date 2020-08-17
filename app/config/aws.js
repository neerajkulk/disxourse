const aws = require('aws-sdk');

function AWSconfig() {
    aws.config.update({
        region: process.env.AWS_region,
        accessKeyId: process.env.AWS_accessKeyId,
        secretAccessKey: process.env.AWS_secretAccessKey
    });
}
module.exports = AWSconfig