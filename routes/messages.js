const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sql = require('../config/database');

const path = require('path');

router.get('/input', auth.checkUserSession, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/input.html'));
});

router.post('/send', auth.checkUserSession, async (req, res) => {
    const username = req.session.username;
    const message = req.body.message?.trim();

    if (!message) {
        return res.status(400).send('Message cannot be empty.');
    }

    try {
        // Store message in the database
        await sql`INSERT INTO messages (username, message) VALUES (${username}, ${message})`;

        // Get all connected users from the database
        const connectedUsers = await sql`SELECT username FROM users WHERE status = TRUE`;

        // Convert connected users into a list of usernames
        const connectedUsernames = connectedUsers.map(user => user.username);


        res.redirect('/messages/input')
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error storing message.');
    }
});

router.get('/history', auth.checkUserSession, async (req, res) => {
    try {
        const messages = await sql`SELECT username, message, timestamp FROM messages ORDER BY timestamp DESC LIMIT 50`;
        res.json(messages);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error retrieving messages.');
    }
});

module.exports = router;

