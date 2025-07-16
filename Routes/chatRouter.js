const express = require('express');
const router = express.Router();
const Conversation = require('../Models/conversation');
const { authenticate } = require('../MiddleWares/authMiddleware');

// Get conversation between logged-in user and a friend
router.get('/conversation/:friendId', authenticate, async (req, res) => {
    const userId = req.user._id.toString();
    const friendId = req.params.friendId;

    try {
        let conversation = await Conversation.findOne({
            members: { $all: [userId, friendId] }
        }).populate('messages.sender', 'username avatar');

        if (!conversation) {
            conversation = new Conversation({
                members: [userId, friendId],
                messages: []
            });
            await conversation.save();
        }

        res.json(conversation);
    } catch (err) {
        console.error('Error fetching conversation:', err);
        res.status(500).json({ error: 'Server error' });
    }
});



module.exports = router;
