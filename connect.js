// const mongoose = require('mongoose');

// function connectDB(mongoURI) {
//     return mongoose.connect(mongoURI, {
//         useNewUrlParser: true,
//     });
// }

// module.exports = { connectDB };




const mongoose = require('mongoose');

async function connectDB(mongoURI) {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected Successfully!");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        process.exit(1); // Stop the app if DB not connected
    }
}

module.exports = { connectDB };
