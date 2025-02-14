const express = require('express');
const app = express();
const port = 3000;

const cookieParser = require('cookie-parser');  // ✅ Required for CSRF cookies
const session = require('express-session');
const csurf = require('csurf');
require("dotenv").config();

// Load Middleware
const rateLimit = require('./middleware/rateLimit');
const auth = require('./middleware/auth');
const moderation = require('./middleware/moderation');

// Load Routes
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/messages');

// ✅ Proper middleware order
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());  // ✅ Must be before CSRF
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,  // ✅ FIXED: Allow session cookies over HTTP (Tor)
        sameSite: 'Strict'
    }
}));


// ✅ Fix CSRF middleware
app.use(csurf({ cookie: true }));

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('/users/login');
});

// ✅ Ensure CSP doesn’t break iframes or CSS
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'none'; frame-ancestors 'self'; style-src 'self' 'unsafe-inline';");
    next();
});

// Use Routes
app.use('/users', userRoutes);
app.use('/chat', chatRoutes);
app.use('/messages', messageRoutes);

app.listen(port, () => {
    console.log(`server is running on ${port}`);
});
