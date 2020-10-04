const fs = require('fs');
const download = require('download');
const pdf = require('pdf-parse');

const nodemailer = require('nodemailer');
const aws = require('aws-sdk');
const helper = require('./helpers')

module.exports = {
    emailAuthors: async function (paper, comment) {
        try {
            await module.exports.addAuthorEmail(paper)
            if (Array.isArray(paper.emails)) {
                const url = `${helper.getBaseUrl()}/paper/${paper.arxivID}`
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
                           <p>disXourse is an online forum to discuss and ask questions on new astronomy papers. 
                           You received this email because a user requested to notify you of their comment.  
                           To unsubscribe from future emails on this paper, click here: <a href="${helper.getBaseUrl()}/api/unsubscribe-author/${paper._id}/${email}"> unsubscribe </a>  </p> 
                           `
                    })
                })
            }
        } catch (err) {
            console.error(err)
        }
    },
    scrapeEmails: async function (pdfURL) {
        const randFname = Math.floor(Math.random() * 100000)
        const data = await download(pdfURL);
        fs.writeFileSync(`./paper-${randFname}.pdf`, data); //save pdf to disk
        let dataBuffer = fs.readFileSync(`./paper-${randFname}.pdf`); // read pdf from disk
        let pdfdata = await pdf(dataBuffer)

        // delete pdf
        fs.unlink(`./paper-${randFname}.pdf`, (err) => {
            if (err) {
                console.error(err)
                return
            }
        })

        return module.exports.emailRegex(pdfdata.text)
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
                let emails = await module.exports.scrapeEmails(paper.pdfUrl)
                paper.emails = emails
                await paper.save()
            }
        } catch (err) {
            console.error(err)
        }
    },
    sendMailSES: function (mailObj) {
        /* takes in object and sends it as an email */
        try {
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
        } catch (err) {
            console.error(err)
        }
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