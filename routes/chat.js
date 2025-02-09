const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sql = require('../config/database');

const clients = []; // Stores all connected users

router.get('/', auth.checkUserSession, async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const username = req.session.username;

    // Mark user as online
    await sql`UPDATE users SET status = TRUE WHERE username = ${username}`;

    // Fetch online users
    const onlineUsers = await sql`SELECT username FROM users WHERE status = TRUE`;
    let userList = onlineUsers.map(user => user.username).join(', ');

    // Send initial HTML response
    res.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Sharmouta Chat</title>
            <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
            <div id="chat-container">
                <h1>Welcome, ${username}!</h1>
                <p>Online Users: ${userList}</p>
                <div id="chat-box-container">
                    <pre id="chat-box">
    `);

    res.flushHeaders();

    // Store last message ID for this client
    let lastMessageID = 0;

    const sendNewMessages = async () => {
        try {
            let query;

            if (lastMessageID > 0) {
                query = sql`SELECT id, username, message FROM messages 
                        WHERE id > ${lastMessageID} 
                        ORDER BY id ASC`;
            } else {
                query = sql`SELECT id, username, message FROM messages 
                        ORDER BY id ASC LIMIT 50`; // Load last 50 messages initially
            }

            const messages = await query;
            console.log("Messages retrieved:", messages.length);

            if (messages.length > 0) {
                console.log("First message:", messages[0]);
                console.log("Last message:", messages[messages.length - 1]);
            }

            if (messages.length > 0) {
                for (const msg of messages) {
                    console.log("Writing inside chat-box:", msg.username, msg.message);
                    res.write(`<p id="message-${msg.id}" class="chat-message"><b>${msg.username}:</b> ${msg.message}</p>\n`);
                }
                lastMessageID = messages[messages.length - 1].id;
                console.log("Updated lastMessageID to:", lastMessageID);
                res.write("\n");
            }

            console.log("Writing message inside chat-box:", messages.username, messages.message);
        } catch (err) {
            console.error("Error streaming messages:", err);
        }
    };

    // Send initial messages
    await sendNewMessages();



    // Keep track of this client
    clients.push({ res, lastMessageID });

    // Periodically check for new messages
    const interval = setInterval(async () => {
        if (!res.writableEnded) {
            await sendNewMessages();
        } else {
            clearInterval(interval);
        }
    }, 2000); // Check for new messages every 2 seconds


    // Handle client disconnection
    req.on('close', async () => {
        console.log("Client disconnected:", username);
        clearInterval(interval); // Stop checking for messages
        clients.splice(clients.findIndex(c => c.res === res), 1);
        if (username) {
            await sql`UPDATE users SET status = FALSE WHERE username = ${username}`;
            await sql`DELETE FROM users WHERE status = FALSE`;
        }
    });

    res.write(`</pre>`); // ✅ Close chat-box only after messages are streamed
    res.write(`</div>`); // ✅ Close chat-box-container properly

    res.write(`
        <div id="input-container">
            <iframe src="/messages/input" id="input-iframe" scrolling="no"></iframe>
        </div>
    </div> <!-- Closing chat-container -->
</body></html>
    `);
});

module.exports = router;


