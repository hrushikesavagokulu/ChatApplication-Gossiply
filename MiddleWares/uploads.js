// const multer = require('multer');
// const path = require('path');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         if (file.fieldname === 'avatar') {
//             cb(null, 'public/uploads');
//         } else {
//             cb(null, 'public/posts');
//         }
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     },
// });

// module.exports = multer({ storage });



// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         let folderPath;

//         if (file.fieldname === 'avatar') {
//             folderPath = 'public/uploads';
//         } else {
//             // Store posts under public/posts/<username>
//             const username = req.user.username;
//             folderPath = path.join('public/posts', username);
//         }

//         // Create folder if it doesn't exist
//         if (!fs.existsSync(folderPath)) {
//             fs.mkdirSync(folderPath, { recursive: true });
//         }

//         cb(null, folderPath);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// module.exports = multer({ storage });




const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folderPath = '';

        const username = req.user?.username || 'unknown';

        if (file.fieldname === 'avatar') {
            folderPath = path.join('public/uploads', username);
        } else {
            folderPath = path.join('public/posts', username);
        }

        // Create folder if not exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e5)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

module.exports = multer({ storage });
