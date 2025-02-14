const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const bcrypt = require('bcryptjs');
const sql = require('../config/database');

const csrfProtection = csrf({ cookie: true });

router.get('/login', csrfProtection, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Sharmouta Chat - Login</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body class="auth-page">
            <div class="auth-container">
                <h2>Login to Sharmouta Chat</h2>
                <form method="post" action="/users/login">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required autocomplete="off">
                    <label for="password">Password(leave empty for guest mode):</label>
                    <input type="password" name="password">
                    <!-- CSRF Token -->
                    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
    
                    <input type="submit" value="Login">
                </form>
                <p>New user? <a href="users/register">Register Here!</a></p>
            </div>
            <div class="rules-container">
                <h2>Rules of this chat room</h2>
                <ol>
                    <li>No CSAM/CP</li>
                    <li>No spamming the chat</li>
                </ol>
            </div>
        </body>
        </html>
    `);
});

router.post('/login', csrfProtection, async (req, res) => {
    const { username, password } = req.body;

    if (!username) {
        return res.status(400).send("Username is required.");
    }

    let user = await sql`SELECT * FROM users WHERE username = ${username}`;

    if (user.length > 0) {
        // If a password exists, verify it
        if (user[0].password) {
            if (!password) {
                return res.status(400).send("Password required for registered accounts.");
            }
            const isPasswordValid = await bcrypt.compare(password, user[0].password);
            if (!isPasswordValid) {
                return res.status(400).send("Incorrect password.");
            }
        } else if (password) {
            return res.status(400).send("This account does not require a password.");
        }
        if (user[0].banned) {
            return res.status(403).send("You have been kicked and cannot rejoin.");
        }
    } else {
        // Insert guest user into the database
        await sql`INSERT INTO users (username, password, is_admin, is_guest) VALUES (${username}, NULL, FALSE, TRUE)`;

        // 🔥 Re-fetch the newly inserted user to prevent `user[0]` from being undefined
        user = await sql`SELECT * FROM users WHERE username = ${username}`;
    }

    // ✅ Now, `user[0]` will always be defined
    req.session.username = username;
    req.session.isAdmin = user[0].is_admin;

    res.redirect('/chat');
});


// Register Page
router.get('/register', csrfProtection, (req, res) => {
    res.send(`
       <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Register for Sharmouta Chat</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body class="auth-page">
            <div class="auth-container">
                <h2>Create an Account</h2>
                <form method="post" action="/users/register">
                    <label>Username:</label>
                    <input type="text" name="username" required>

                    <label>Password (optional):</label>
                    <input type="password" name="password">

                    <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                    <input type="submit" value="Register">
                </form>
                <p>Already have an account? <a href="/users/login">Log in here</a></p>
            </div>
        </body>
        </html>
    `);
});

// Register a new user
router.post('/register', csrfProtection, async (req, res) => {
    const { username, password } = req.body;

    // Check if username exists
    const userExists = await sql`SELECT username FROM users WHERE username = ${username}`;
    if (userExists.length > 0) {
        return res.status(400).send("Username already taken.");
    }

    // Hash password if provided, otherwise store NULL
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Insert user into the database
    await sql`INSERT INTO users (username, password, is_admin) VALUES (${username}, ${hashedPassword}, FALSE)`;

    res.send("Account created! <a href='/users/login'>Login</a>");
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Error logging out.");
        }
        res.redirect('/users/login');
    });
});


module.exports = router;
