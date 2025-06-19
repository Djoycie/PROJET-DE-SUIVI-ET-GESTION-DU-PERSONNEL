// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // ton utilisateur MySQL
    password: '',    // ton mot de passe MySQL
    database: 'gestion_personnel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;