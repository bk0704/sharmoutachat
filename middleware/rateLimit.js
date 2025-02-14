const rateLimit = require('express-rate-limit');

module.exports.chatLimiter = rateLimit({
    windowMs: 5000,  // 5 seconds
    max: 5,  // Limit to 5 messages per user per 5 seconds
    message: "Too many messages! Please slow down.",
    headers: true,
});
