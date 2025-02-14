const sql = require('../config/database');
const session = require('express-session');

module.exports.checkIfBannedOrMuted = async (req, res, next) => {
    const username = req.session.username;
    if (!username) {
        return res.status(403).send("Unauthorized.");
    }

    try {
        const user = await sql`SELECT banned FROM users WHERE username = ${username}`;

        if (user.length > 0 && user[0].banned) {
            return res.status(403).send("You are banned from the chat.");
        }

        next();
    } catch (error) {
        console.error("Error checking ban status:", error);
        res.status(500).send("Internal server error.");
    }
};

module.exports.processAdminCommands = async (req, res, next) => {
    const username = req.session.username;
    const message = req.body.message?.trim();

    if (!username || !message) {
        return res.status(400).send("Invalid request.");
    }

    // Only admins can execute commands
    if (!req.session.isAdmin) {
        return next();
    }

    try {
        let adminMessage = null;

        // /kick username (Logout user & delete messages)
        if (message.startsWith('/kick ')) {
            const kickedUser = message.split(' ')[1];
            if (!kickedUser) return res.send("Usage: /kick username");

            // Delete all messages from the kicked user
            await sql`DELETE FROM messages WHERE username = ${kickedUser}`;

            // Mark user as kicked (temporarily banned)
            await sql`UPDATE users SET banned = TRUE WHERE username = ${kickedUser}`;

            // Force session logout (invalidate their session)
            if (req.sessionStore) {
                req.sessionStore.destroy(kickedUser, (err) => {
                    if (err) console.error("Error destroying session:", err);
                });
            }

            adminMessage = `${kickedUser} has been kicked and their messages have been deleted.`;

            // ✅ Store the admin message in the database but not the `/kick` command
            await sql`
                INSERT INTO messages (timestamp, username, message, is_admin_message) 
                VALUES (NOW(), '[ADMIN]', ${adminMessage}, TRUE)
            `;
        }

        next(); // ✅ Ensures normal messages are still processed
    } catch (error) {
        console.error("Error processing admin command:", error);
        res.status(500).send("Internal server error.");
    }
};
