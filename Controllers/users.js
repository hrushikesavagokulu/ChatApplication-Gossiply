const User = require('../Models/users');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../Services/authService');
async function signup(req, res) {
    const { username, email, password } = req.body;

    try {
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).send('User already exists');


        const user = await User.create({ username, email, password });

        const token = generateToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            sameSite: 'Lax',
            maxAge: 1000 * 60 * 60 * 5 // ✅ 5 hours
        }); // optional for better cookie support
        res.redirect('/profile');
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).send('Internal Server Error');
    }
}

async function login(req, res) {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { title: 'Login', error: 'User not found' }); // 🔧 FIXED: should render login
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('login', { title: 'Login', error: 'Wrong password' });
        }

        const token = generateToken(user._id);
        res.cookie('jwt', token, {
            httpOnly: true,
            sameSite: 'Lax',
            maxAge: 1000 * 60 * 60 * 5 // ✅ 5 hours
        });
        // optional but improves compatibility

        if (user.email === 'kunchepugokulu12@gmail.com') {
            return res.redirect('/admin');
        }

        res.redirect('/home');
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Internal Server Error');
    }
}




function logout(req, res) {
    res.clearCookie('jwt');
    res.render('login', { title: 'Login' });
}

const Conversation = require('../Models/conversation'); // Add this if missing at the top



async function home(req, res) {
    try {
        const user = await User.findById(req.user._id)
            .populate('friends', 'username avatar')
            .populate('requests', 'username avatar');

        let conversationId = null;

        if (user.friends.length > 0) {
            const firstFriendId = user.friends[0]._id;
            let conversation = await Conversation.findOne({
                members: { $all: [req.user._id, firstFriendId] },
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    members: [req.user._id, firstFriendId],
                    messages: [],
                });
            }

            conversationId = conversation._id.toString();
        }

        const conversations = await Conversation.find({ members: req.user._id });

        const unreadCounts = {};
        const contactMap = new Map();

        // Map each friendId => latestMessageTime + unreadCount
        for (const conv of conversations) {
            if (!conv || !Array.isArray(conv.members)) continue;

            const otherId = conv.members.find(id =>
                id && id.toString() !== req.user._id.toString()
            );
            if (!otherId) continue;

            const friend = user.friends.find(f => f._id.toString() === otherId.toString());
            if (!friend) continue;

            const count = conv.messages.filter(
                msg =>
                    msg.sender &&
                    msg.sender.toString() !== req.user._id.toString() &&
                    Array.isArray(msg.readBy) &&
                    !msg.readBy.some(u => u.toString() === req.user._id.toString())
            ).length;

            const lastMessage = conv.messages[conv.messages.length - 1];
            const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp || lastMessage.createdAt || 0) : new Date(0);

            contactMap.set(friend._id.toString(), {
                friend,
                unreadCount: count,
                lastMessageTime
            });

            if (count > 0) unreadCounts[friend._id.toString()] = count;
        }

        // For friends without conversation
        // For friends without conversation
        user.friends.forEach(f => {
            // Fix avatar path if needed
            if (f.avatar && !f.avatar.startsWith('/uploads/')) {
                f.avatar = `/uploads/${f.username}/${f.avatar}`;
            }

            if (!contactMap.has(f._id.toString())) {
                contactMap.set(f._id.toString(), {
                    friend: f,
                    unreadCount: 0,
                    lastMessageTime: new Date(0)
                });
            }
        });


        // Convert to sorted array
        const allContacts = Array.from(contactMap.values()).sort((a, b) =>
            b.lastMessageTime - a.lastMessageTime
        );

        const newMsgContacts = allContacts.filter(c => c.unreadCount > 0).map(c => c.friend);
        const normalContacts = allContacts.filter(c => c.unreadCount === 0).map(c => c.friend);

        res.render('home', {
            title: 'Your Contacts',
            user,
            contacts: user.friends,
            requests: user.requests || [],
            conversationId,
            unreadCounts,
            newMsgContacts,
            normalContacts
        });

    } catch (error) {
        console.error('Error loading home:', error);
        res.status(500).send('Server Error');
    }
}



const searchUsers = async (req, res) => {
    const query = req.query.q || '';
    const currentUser = await User.findById(req.user._id).populate('friends');

    let users = [];

    if (query.trim() !== '') {
        users = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ],
            _id: { $ne: currentUser._id }
        }).lean(); // ✅ Use lean() to simplify object structure

        // ✅ Fetch all requests in one query to reduce DB load
        const requestSentUsers = await User.find({
            requests: currentUser._id
        }, '_id');

        const requestedIds = new Set(requestSentUsers.map(u => u._id.toString()));

        users = users.map(user => {
            if (!user.avatar) {
                user.avatar = '/images/default-avatar.png'; // path to a default avatar image in public folder
            } else if (!user.avatar.startsWith('/uploads/')) {
                user.avatar = `/uploads/${user.username}/${user.avatar}`;
            }
            return {
                ...user,
                isFriend: currentUser.friends.some(f => f._id.equals(user._id)),
                requested: requestedIds.has(user._id.toString())
            };
        });

    }

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('partials/userList', { users });
    }

    res.render('search', { title: 'Search Users', users });
};





async function addFriend(req, res) {
    try {
        const currentUser = await User.findById(req.user._id);
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) return res.status(404).send('User not found');

        // Add request if not already requested or friend
        if (
            !targetUser.requests.includes(currentUser._id) &&
            !targetUser.friends.includes(currentUser._id)
        ) {
            targetUser.requests.push(currentUser._id);
            await targetUser.save();
        }

        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(200).json({ status: 'requested' });
        }

        res.redirect('/home');
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).send('Server Error');
    }
}



async function viewProfile(req, res) {
    try {
        const user = await User.findById(req.user._id).populate('friends');

        // Fix avatar URL
        if (user.avatar && !user.avatar.startsWith('/uploads/')) {
            user.avatar = `/uploads/${user.username}/${user.avatar}`;
        }

        res.render('profile', { title: 'Your Profile', user });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).send('Server Error');
    }
}


// async function uploadPost(req, res) {
//     try {
//         const user = await User.findById(req.user._id);
//         if (req.file) {
//             const postPath = '/posts/' + req.file.filename;
//             if (!user.posts.includes(postPath)) {
//                 user.posts.push(postPath);
//                 await user.save();
//             }
//         }
//         res.redirect('/profile');
//     } catch (error) {
//         console.error('Error uploading post:', error);
//         res.status(500).send('Upload failed');
//     }
// }

async function uploadPost(req, res) {
    try {
        const user = await User.findById(req.user._id);

        const imagePath = `/posts/${req.user.username}/${req.file.filename}`;
        user.posts.unshift(imagePath);  // Add at beginning
        await user.save();
        res.redirect('/profile');
    } catch (err) {
        console.error('Upload post error:', err);
        res.status(500).send('Failed to upload post');
    }
};






async function updateProfile(req, res) {
    try {
        const { username, bio, about } = req.body;
        const update = { bio, about };

        const currentUser = await User.findById(req.user._id);
        const oldUsername = currentUser.username;

        if (username && username !== oldUsername) {
            const existingUser = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') },
                _id: { $ne: req.user._id }
            });

            if (existingUser) {
                // Suggest alternatives
                const suggestions = [];
                for (let i = 0; suggestions.length < 3 && i < 50; i++) {
                    const suggestion = `${username}${Math.floor(Math.random() * 10000)}`;
                    const exists = await User.findOne({ username: suggestion });
                    if (!exists && !suggestions.includes(suggestion)) {
                        suggestions.push(suggestion);
                    }
                }

                return res.render('username', {
                    title: 'Your Profile',
                    error: 'Username already taken',
                    suggestions
                });
            }

            update.username = username;

            // Move old post folder to new one
            const oldDir = path.join(__dirname, '..', 'public', 'posts', oldUsername);
            const newDir = path.join(__dirname, '..', 'public', 'posts', username);

            if (fs.existsSync(oldDir)) {
                fs.renameSync(oldDir, newDir);

                // Update all post paths in the DB
                currentUser.posts = currentUser.posts.map(post =>
                    post.replace(`/posts/${oldUsername}/`, `/posts/${username}/`)
                );
                update.posts = currentUser.posts;
            }
        }

        if (req.file) {
            update.avatar = `/uploads/${req.user.username}/${req.file.filename}`;

        }

        await User.findByIdAndUpdate(req.user._id, update);
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Server Error');
    }
}



// async function viewFriendProfile(req, res) {
//     try {
//         const currentUser = await User.findById(req.user._id).populate('friends');
//         const friend = await User.findById(req.params.id).populate('friends');

//         if (!friend) return res.status(404).send('User not found');

//         // Number of friends friend has
//         const friendCount = friend.friends.length;

//         // Find mutual friends (IDs)
//         const currentUserFriendIds = new Set(currentUser.friends.map(f => f._id.toString()));
//         const mutualFriends = friend.friends.filter(f => currentUserFriendIds.has(f._id.toString()));

//         const mutualCount = mutualFriends.length;

//         res.render('friend-profile', {
//             title: `${friend.username}'s Profile`,
//             friend,
//             friendCount,
//             mutualFriends,
//             mutualCount,
//         });
//     } catch (err) {
//         console.error('Error loading friend profile:', err);
//         res.status(500).send('Server Error');
//     }
// }

async function viewFriendProfile(req, res) {
    try {
        const currentUser = await User.findById(req.user._id).populate('friends');
        const friend = await User.findById(req.params.id).populate('friends');

        if (!friend) return res.status(404).send('User not found');

        // Number of friends friend has
        const friendCount = friend.friends.length;

        // Find mutual friends (IDs)
        const currentUserFriendIds = new Set(currentUser.friends.map(f => f._id.toString()));
        const mutualFriends = friend.friends.filter(f => currentUserFriendIds.has(f._id.toString()));

        const mutualCount = mutualFriends.length;

        // Optional: Fix avatar URLs here if needed
        // For friend
        if (friend.avatar && !friend.avatar.startsWith('/uploads/')) {
            friend.avatar = `/uploads/${friend.username}/${friend.avatar}`;
        }

        // For each mutual friend
        mutualFriends.forEach(f => {
            if (f.avatar && !f.avatar.startsWith('/uploads/')) {
                f.avatar = `/uploads/${f.username}/${f.avatar}`;
            }
        });

        res.render('friend-profile', {
            title: `${friend.username}'s Profile`,
            friend,
            friendCount,
            mutualFriends,
            mutualCount,
        });
    } catch (err) {
        console.error('Error loading friend profile:', err);
        res.status(500).send('Server Error');
    }
}



async function removeFriend(req, res) {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return res.status(404).send('User not found');
        }

        // Remove friend from both users
        user.friends = user.friends.filter(f => f.toString() !== friendId);
        friend.friends = friend.friends.filter(f => f.toString() !== userId);

        await user.save();
        await friend.save();

        res.redirect('/profile');
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).send('Server error');
    }
};



const fs = require('fs');
const path = require('path');

async function deletePost(req, res) {
    try {
        const user = await User.findById(req.user._id);
        const postToDelete = decodeURIComponent(req.params.postPath); // Ex: '1750486752107-image.jpg'

        // 1. Remove post path from user's post array
        user.posts = user.posts.filter(post => !post.includes(postToDelete));
        await user.save();

        // 2. Construct full path to the image file
        const filePath = path.join(__dirname, '../public/posts', postToDelete);

        // 3. Delete the file if it exists
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('❌ Error deleting file from public/posts:', err.message);
            } else {
                console.log('✅ Deleted file from disk:', filePath);
            }
        });

        // 4. Redirect back to profile
        res.redirect('/profile');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Delete failed');
    }
}

module.exports = { deletePost };




async function fetchContacts(req, res) {
    try {
        const user = await User.findById(req.user._id)
            .populate('friends', 'username avatar');

        const conversations = await Conversation.find({ members: req.user._id });

        const contactMap = new Map();
        const unreadCounts = {};

        for (const conv of conversations) {
            const otherId = conv.members.find(id => id && id.toString() !== req.user._id.toString());

            if (!otherId) continue;

            const friend = user.friends.find(f => f._id.toString() === otherId.toString());
            if (!friend) continue;

            const count = conv.messages.filter(
                msg =>
                    msg.sender?.toString() !== req.user._id.toString() &&
                    !msg.readBy?.some(r => r.toString() === req.user._id.toString())
            ).length;

            const lastMessage = conv.messages[conv.messages.length - 1];
            const lastMessageTime = lastMessage ? new Date(lastMessage.timestamp || lastMessage.createdAt || 0) : new Date(0);

            contactMap.set(friend._id.toString(), {
                friend,
                unreadCount: count,
                lastMessageTime
            });

            if (count > 0) unreadCounts[friend._id.toString()] = count;
        }

        user.friends.forEach(f => {
            if (!contactMap.has(f._id.toString())) {
                contactMap.set(f._id.toString(), {
                    friend: f,
                    unreadCount: 0,
                    lastMessageTime: new Date(0)
                });
            }
        });

        const allContacts = Array.from(contactMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        res.json({
            success: true,
            contacts: allContacts.map(c => ({
                _id: c.friend._id,
                username: c.friend.username,
                avatar: c.friend.avatar,
                unreadCount: c.unreadCount
            }))
        });
    } catch (error) {
        console.error('Fetch contacts error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


module.exports = {
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
};


