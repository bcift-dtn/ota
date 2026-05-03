const pool = require('../config/db');
const crypto = require('crypto');

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
}

const createUser = async (fullName, email, hashedPassword, verificationToken, tokenExpires) => {
  const query = `
    INSERT INTO ota.users(full_name, email, password, verification_token, verification_token_expires) 
    VALUES($1, $2, $3, $4, $5) 
    RETURNING *
  `;
  const values = [fullName, email, hashedPassword, verificationToken, tokenExpires];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    throw  err;
  }
}

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM ota.users WHERE email = $1';
  
  try {
    const res = await pool.query(query, [email]);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

const findUserByToken = async (token) => {
  const query = `
    SELECT * FROM ota.users 
    WHERE verification_token = $1 AND verification_token_expires > NOW();
  `

  try {
    const res = await pool.query(query, [token]);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

const verifyUserEmail = async (id) => {
  const query = `
    UPDATE ota.users
    SET is_verified = true, verification_token = NULL, verification_token_expires = NULL
    WHERE id = $1
    RETURNING *;
  `

  try {
    const res = await pool.query(query, [id]);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = { createUser, findUserByEmail, generateVerificationToken, findUserByToken, verifyUserEmail };