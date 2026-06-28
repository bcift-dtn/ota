const pool = require('../config/db');
const crypto = require('crypto');

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
}

const findOrCreateGoogleUser = async (googleId, email, fullName) => {
  try {
    const existingGoogle = await pool.query(`
      SELECT * FROM ota.users
      WHERE google_id = $1
    `, [googleId]);
    
    if (existingGoogle.rows[0]) return existingGoogle.rows[0];
    
    const existingEmail = await pool.query(`
      SELECT * FROM ota.users
      WHERE email = $1  
    `, [email]);

    if (existingEmail.rows[0]) {
      const linked = await pool.query(`
        UPDATE ota.users
        SET google_id = $1, auth_provider = 'google'
        WHERE id = $2 RETURNING *
      `, [googleId, existingEmail.rows[0].id]);

      return linked.rows[0];
    }

    const newUser = await pool.query(`
      INSERT INTO ota.users (full_name, email, google_id, auth_provider, is_verified)
      VALUES ($1, $2, $3, 'google', true) RETURNING *  
    `, [fullName, email, googleId]);
    
    return newUser.rows[0];
  } catch (err) {
    throw err;
  }
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

const updateUserProfile = async (id, fullName, phone, email, address) => {
  const query = `
    UPDATE ota.users
    SET full_name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
    WHERE id = $5
    RETURNING *;
  `;

  const values = [fullName, phone, email, address, id];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

const findUserById = async id => {
  const query = `
    SELECT * FROM ota.users
    WHERE id = $1
  `

  try {
    const res = await pool.query(query, [id]);
    return res.rows[0];
  } catch (err) {
    throw err;
  }
}

const updatePassword = async (id, newHashesPassword) => {
  const query = `
    UPDATE ota.users
    SET password = $1
    WHERE id = $2
    RETURNING id;
  `

  try {
    await pool.query(query, [newHashesPassword, id])
  } catch (err) {
    throw err;
  }
}

module.exports = { 
  createUser, 
  findUserByEmail, 
  generateVerificationToken, 
  findUserByToken, 
  verifyUserEmail, 
  findOrCreateGoogleUser,
  updateUserProfile,
  findUserById,
  updatePassword
 };