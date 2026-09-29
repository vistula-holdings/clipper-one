const mysql = require('mysql2');
// Using .env file, parameters are there
var dotenv = require('dotenv');
dotenv.config();

console.log('Request conecction to DB');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

module.exports = pool.promise();