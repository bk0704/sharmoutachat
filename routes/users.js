const express = require('express');
const path = require('path');
const router = express.Router();
const sql = require('../config/database');

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.post('/login', async (req, res) => {
    const username = req.body.username?.trim();
    console.log("Received username:", username);

    if (!username) {
        return res.status(400).send('Username cannot be empty.');
    }

    try {
        // Insert the user into the database or update status if already exists
        await sql`
            INSERT INTO users (username, status) VALUES (${username}, TRUE)
            ON CONFLICT (username) DO UPDATE SET status = TRUE
        `;

        req.session.username = username;
        res.redirect('/chat');
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error logging in.');
    }
});

router.post('/logout', async (req, res) => {
    if (req.session.username) {
        await sql`UPDATE users SET status = FALSE WHERE username = ${req.session.username}`;
        await sql`DELETE FROM users WHERE status = FALSE`; // ✅ Remove all inactive users
        req.session.destroy(); // Remove session
    }
    res.redirect('/users/login');
});


module.exports = router;
