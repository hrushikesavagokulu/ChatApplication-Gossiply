const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// models/users.js
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true }, // email should be uniqueString,
    password: { type: String, required: true },
    bio: String,
    about: String,
    avatar: String,
    requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    posts: [String], // array of image URLs
    online: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }

}, { timestamps: true });


userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);

