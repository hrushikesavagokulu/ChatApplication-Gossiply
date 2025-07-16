



const express = require('express');
const router = express.Router();
const upload = require('../MiddleWares/uploads');
const { authenticate } = require('../MiddleWares/authMiddleware');
const User = require('../Models/users');

// Controller Imports
const {
    signup,
    login,
    logout,
    home,
    searchUsers,
    addFriend,
    viewProfile,
    uploadPost,
    updateProfile,
    viewFriendProfile,
    deletePost,
    removeFriend,
    fetchContacts
} = require('../Controllers/users');

// ------------------- PUBLIC ROUTES -------------------

// Welcome Page
router.get('/', (req, res) => res.render('welcome', { title: 'Welcome' }));

// Signup
router.get('/signup', (req, res) => res.render('signup', { title: 'Signup' }));
router.post('/signup', signup);

// Login
router.get('/login', (req, res) => res.render('login', { title: 'Login' }));
router.post('/login', login);

// ------------------- PROTECTED ROUTES -------------------

router.get('/logout', authenticate, logout);

// Home
router.get('/home', authenticate, home);

// Profile
router.get('/profile', authenticate, viewProfile);
router.post('/profile', authenticate, upload.single('avatar'), updateProfile);
router.post('/profile/upload-post', authenticate, upload.single('photo'), uploadPost);
router.post('/profile/delete-post/:postPath', authenticate, deletePost);
router.get('/api/contacts', authenticate, fetchContacts);

// View Another User's Profile
router.get('/user/:id', authenticate, viewFriendProfile);

// Friend Actions
router.get('/search', authenticate, searchUsers);
router.post('/add-friend/:id', authenticate, addFriend);
router.post('/accept-request/:id', authenticate, async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    const requestSender = await User.findById(req.params.id);

    if (!requestSender) return res.status(404).send('User not found');

    if (!currentUser.friends.includes(requestSender._id)) {
        currentUser.friends.push(requestSender._id);
        requestSender.friends.push(currentUser._id);
    }

    currentUser.requests = currentUser.requests.filter(id => !id.equals(requestSender._id));

    await currentUser.save();
    await requestSender.save();

    res.redirect('/home');
});

router.post('/reject-request/:id', authenticate, async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    currentUser.requests = currentUser.requests.filter(id => !id.equals(req.params.id));
    await currentUser.save();
    res.redirect('/home');
});

router.post('/friends/remove/:id', authenticate, removeFriend);

// ------------------- ADMIN ROUTES -------------------

router.get('/admin', authenticate, async (req, res) => {
    const adminEmail = 'kunchepugokulu12@gmail.com';
    const user = await User.findById(req.user._id);

    if (user.email !== adminEmail) {
        return res.status(403).send('Access Denied');
    }

    try {
        const users = await User.find({ _id: { $ne: user._id } }).populate('friends');
        res.render('auth', {
            title: 'Admin Dashboard',
            admin: user,
            users
        });
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
        res.status(500).send('Server Error');
    }
});
const fs = require('fs');
const path = require('path');
router.post('/admin/delete/:id', authenticate, async (req, res) => {
    const adminEmail = 'kunchepugokulu12@gmail.com';
    const user = await User.findById(req.user._id);

    if (user.email !== adminEmail) {
        return res.status(403).send('Access Denied');
    }

    try {
        // Find the user to delete
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            return res.status(404).send('User not found');
        }

        const username = userToDelete.username;
        const foldersToDelete = [
            path.join(__dirname, '../public/posts', username),
            path.join(__dirname, '../public/uploads', username)
        ];

        // Delete user's folders
        foldersToDelete.forEach(folder => {
            if (fs.existsSync(folder)) {
                fs.rmSync(folder, { recursive: true, force: true });
                console.log(`✅ Deleted folder: ${folder}`);
            }
        });

        // Remove user from friends/requests of other users
        await User.updateMany(
            { friends: userToDelete._id },
            { $pull: { friends: userToDelete._id } }
        );
        await User.updateMany(
            { requests: userToDelete._id },
            { $pull: { requests: userToDelete._id } }
        );

        // Clean up their conversations
        const Conversation = require('../Models/conversation');
        await Conversation.deleteMany({ members: userToDelete._id });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.redirect('/admin');
    } catch (error) {
        console.error('❌ Error deleting user and data:', error);
        res.status(500).send('Failed to delete user and their files');
    }
});

module.exports = router;
