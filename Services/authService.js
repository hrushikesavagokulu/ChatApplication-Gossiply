const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';

function generateToken(userId) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');
    return jwt.sign({ id: userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

function verifyToken(token) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');
    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    generateToken,
    verifyToken
};
