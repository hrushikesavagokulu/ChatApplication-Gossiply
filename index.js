const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./connect');
const User = require('./Models/users');
const Conversation = require('./Models/conversation');

const staticRouter = require('./Routes/staticRouter');
const chatRouter = require('./Routes/chatRouter');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const passport = require('passport');
require('./config/passport'); // make sure path is correct
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true if HTTPS
}));

// Initialize Passport (MUST follow session)
app.use(passport.initialize());
app.use(passport.session());
const authRoutes = require('./Routes/auth'); // <== new Google auth route
// only if using sessions

app.use('/auth', authRoutes); // <== mount it


// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 5, // ✅ 5 hours
        httpOnly: true,
        sameSite: 'Lax',
        secure: false // set to true if using HTTPS
    }
}));

// Initialize Passport (MUST come after session)
app.use(passport.initialize());
app.use(passport.session());



app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/posts', express.static(path.join(__dirname, 'public/posts')));

// Connect to MongoDB
connectDB(process.env.MONGO_URI);

// Routes
app.use('/', staticRouter);
app.use('/chat', chatRouter);

// ---- ✅ SOCKET.IO LOGIC ----
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join room for conversation
    socket.on('joinRoom', ({ conversationId, userId, friendId }) => {
        if (!conversationId) return;
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined room ${conversationId}`);
    });

    // Handle sending text message only (no imageUrl)
    socket.on('chatMessage', async ({ conversationId, senderId, text }) => {
        if (!conversationId || !senderId || !text) return;

        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) return;

            const message = {
                sender: senderId,
                text,
                timestamp: new Date(),
                readBy: [senderId] // Mark as read by sender
            };

            conversation.messages.push(message);
            await conversation.save();

            // Send to all in room
            io.to(conversationId).emit('newMessage', {
                conversationId,
                senderId,
                text,
                timestamp: message.timestamp
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Handle marking messages as read
    socket.on('markAsRead', async ({ conversationId, userId }) => {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) return;

            conversation.messages.forEach(msg => {
                if (!msg.readBy.includes(userId)) {
                    msg.readBy.push(userId);
                }
            });

            await conversation.save();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});



// Start server
const PORT = process.env.PORT || 8005;
server.listen(PORT, () => console.log(`Server running on port ${PORT}...`));
