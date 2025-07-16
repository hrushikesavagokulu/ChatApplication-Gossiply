const mongoose = require('mongoose');

function connectDB(mongoURI) {
    return mongoose.connect(mongoURI, {
        useNewUrlParser: true,
    });
}

module.exports = { connectDB };
