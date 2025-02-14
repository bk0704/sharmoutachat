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

router.get('/input', auth.checkUserSession, csrfProtection, (req, res) => {
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
                    <input type="text" id="message" name="message" required autocomplete="off" style="width: 90%; height: 2em; padding: 5px; font-size: 14px;">
                    
                    <!-- CSRF Token -->
                    <input type="hidden" name="_csrf" value="${req.csrfToken()}">

                    <input type="submit" value="Send">
                </form>
            </div>
        </body>
        </html>
    `);
});

router.post('/send', auth.checkUserSession, rateLimit.chatLimiter, csrfProtection, moderation.checkIfBannedOrMuted, moderation.processAdminCommands, async (req, res) => {
    const username = req.session.username;
    let message = req.body.message?.trim();

    if (!message) {
        return res.status(400).send('Message cannot be empty.');
    }

    // ✅ Remove all JavaScript but allow basic text formatting
    message = sanitizeHtml(message, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'], // Allow basic formatting
        allowedAttributes: {},  // No custom attributes allowed
    });

    try {
        // Store message in the database
        await sql`INSERT INTO messages (timestamp, username, message) VALUES (NOW(), ${username}, ${message})`;

        res.redirect('/messages/input')
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error storing message.');
    }
});

module.exports = router;
