const crawler = require('crawler-request');
const nodemailer = require('nodemailer');
const aws = require('aws-sdk');

module.exports = {
    emailAuthors: async function (paper, comment) {
        try {
            await module.exports.addAuthorEmail(paper)
            if (Array.isArray(paper.emails)) {
                const url = `https://disxourse.com/paper/${paper.arxivID}`
                paper.emails.forEach(email => {
                    module.exports.sendMailSES({
                        from: 'disxourse@gmail.com',
                        to: email,
                        subject: `New Comment on ${paper.title}`,
                        html:
                            `<p> Hello! </p>
                           <p>You have a new comment on "${paper.title}" </p> 
                           <p> ${comment.username} commented:</p> 
                           <p>"${comment.commentBody}"</p> 
                           <p> Continue the discussion on <a href="${url}"> ${url} </a> 
                           <br>
                           <br>
                           <p> To unsubscribe from future emails on this paper, click here: <a href="http://localhost:3000/api/unsubscribe-author/${paper._id}/${email}"> unsubscribe </a>  </p> 
                           `
                        //    TODO: change unsubscribe URL for production
                    })
                })
            }
        } catch (err) {
            console.error(err)
        }
    },
    addAuthorEmail: async function addAuthorEmail(paper) {
        /* scrape email of corresponding author from pdf link
        paper.emails can be:
        1) undefined (never scraped for emails)
        2) null (scraped but no emails found)
        3) array (array of emails found)
        */
        try {
            if (paper.emails === undefined) {
                let response = await crawler(paper.pdfUrl)
                let emails = module.exports.emailRegex(response.text)
                paper.emails = emails
                await paper.save()
            }
        } catch (err) {
            console.error(err)
        }
    },
    sendMailSES: function (mailObj) {
        /* takes in object and sends it as an email */
        let transporter = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            })
        });

        transporter.sendMail(mailObj, (err, info) => {
            console.log(info.envelope);
            if (err) {
                console.error(err)
            }
        });
    },
    sendMailGmail: function (mailObj) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 465,
            secure: false,
            requireTLS: false,
            auth: {
                user: 'disXourse@gmail.com',
                pass: process.env.EMAILPASS
            }
        });
        transporter.sendMail(mailObj, (err, info) => {
            console.log(info.envelope);
        });
    },
    emailRegex: function (text) {
        return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    }

}