const express = require('express');
const passport = require('passport');
const router = express.Router();

// Start Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Handle callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // ✅ Redirect after successful login
        res.redirect('/profile');
    }
);

module.exports = router;
