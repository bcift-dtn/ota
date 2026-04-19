const pool = require('../config/db');

const createUser = async (fullName, email, hashedPassword) => {
  const query = 'INSERT INTO ota.users(full_name, email, password) VALUES($1, $2, $3) RETURNING *';
  const values = [fullName, email, hashedPassword];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    throw  err;
  }
}

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM ota.users WHERE emails = $1';
  
  try {
    const res = await pool.query(query, email);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = { createUser, findUserByEmail };