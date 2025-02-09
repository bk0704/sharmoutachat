const express = require('express');
const app = express();
app.use(express.static('public'));
const port = 3000;

// Load Middleware
const rateLimit = require('./middleware/rateLimit');  // Rate-limiting middleware
const auth = require('./middleware/auth');  // Authentication middleware
const moderation = require('./middleware/moderation');  // Message filtering middleware

// Load Routes
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/messages');

const session = require('express-session');
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));

app.use(express.urlencoded({ extended: true })); // Enable form data parsing

/*// ✅ Adjust CSP to allow `data:` URIs for media sources
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; media-src 'self' data: http: file:;");
    next();
});*/

app.get('/', (req, res) => {
    res.redirect('/users/login');
});

// Use Routes
app.use('/users', userRoutes); // Handles login and username tracking
app.use('/chat', chatRoutes); // Handles real-time chat streaming
app.use('/messages', messageRoutes); // Handles storing & retrieving messages

app.listen(port, () => {
    console.log(`server is running on ${port}`);
});
