const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sql = require('../config/database');
const sanitizeHtml = require('sanitize-html');
const rateLimit = require('../middleware/rateLimit');
const moderation = require('../middleware/moderation');
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: true });

const path = require('path');

router.get('/input', auth.checkUserSession, csrfProtection, async (req, res) => {
    const users = await sql`SELECT username FROM users WHERE status = TRUE`;

    let userOptions = users.map(user => `<option value="${user.username}">${user.username}</option>`).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sharmouta Chat</title>
            <link rel="stylesheet" href="../public/styles.css">
        </head>
        <body>
            <div id="input-wrapper">
                <form method="post" action="/messages/send">
                    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                    <div>
                        <select name="recipient" title="Send as public or Private Message">
                            <option value="">Everyone (Public Message)</option>
                            <optgroup label="Private Message">
                                ${userOptions}
                            </optgroup>
                        </select>
                    </div>
                    <input type="text" id="message" name="message" required autocomplete="off" style="width: 90%; height: 2em; padding: 5px; font-size: 14px;">
                    <input type="submit" value="Send">
                </form>
            </div>
        </body>
        </html>
    `);
});

router.post('/send', auth.checkUserSession, rateLimit.chatLimiter, csrfProtection, moderation.checkIfBannedOrMuted, moderation.processAdminCommands, async (req, res) => {
    const sender = req.session.username;
    let message = req.body.message?.trim();
    const recipient = req.body.recipient?.trim();

    if (!message) {
        return res.status(400).send('Message cannot be empty.');
    }

    message = sanitizeHtml(message, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'], // Allow basic formatting
        allowedAttributes: {},  // No custom attributes allowed
    });

    try {
        if (recipient) {
            // ✅ Private message
            await sql`
                INSERT INTO private_messages (sender, recipient, message, timestamp)
                VALUES (${sender}, ${recipient}, ${message}, NOW())`;
        } else {
            // ✅ Public message
            await sql`
                INSERT INTO messages (timestamp, username, message)
                VALUES (NOW(), ${sender}, ${message})`;
        }

        res.redirect('/messages/input');
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error storing message.');
    }
});



module.exports = router;
