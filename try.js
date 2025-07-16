// genHash.js
const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'Deva@gokul4994';
    const saltRounds = 12;  // use same rounds as your current hash (12)
    const hashed = await bcrypt.hash(password, saltRounds);
    console.log('Hashed password:', hashed);
}

generateHash();
