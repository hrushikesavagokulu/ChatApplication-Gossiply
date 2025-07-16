const jwt = require('jsonwebtoken');
const User = require('../Models/users');
const { verifyToken } = require('../Services/authService');

async function authenticate(req, res, next) {
    try {
        // ✅ Case 1: Logged in via Google OAuth
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        // ✅ Case 2: Logged in via JWT (email/password)
        const token = req.cookies.jwt;
        if (!token) {
            return res.redirect('/login'); // ✅ return here
        }

        const decoded = await verifyToken(token);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.redirect('/login'); // ✅ return here
        }

        req.user = user;
        return next(); // ✅ only call once
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        return res.redirect('/login');
    }
}

module.exports = {
    authenticate
};
