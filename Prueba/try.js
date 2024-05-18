const crypto = require('crypto');

const secretLength = 32; // Adjust the length as needed
const secret = crypto.randomBytes(secretLength).toString('hex');

console.log('Secret Key:', secret);
