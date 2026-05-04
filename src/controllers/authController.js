const bcrypt = require('bcrypt');
const { createUser, findUserByEmail, generateVerificationToken, findUserByToken, verifyUserEmail} = require('../models/userModel');
const { sendVerificationEmail } = require('../config/mailer');

const registerUser = async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long'});
  }

  if (!(password === confirmPassword)) {
    return res.status(400).json({ error: 'Password do not match'});
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newUser = await createUser(fullName, email, hashedPassword, verificationToken, tokenExpires);
    
    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({ message: 'Account Created. Please check your email to verify.'});
  } catch (err) {
    // 23505 is postgre unique vialation error
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.error(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials'});
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before loggin in.'})
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials'});
    } else {
      req.session.user = { 
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        isUser: user.is_user,
        isAgent: user.is_agent,
        isSeller: user.is_seller,
        isAdmin: user.is_admin
      }
      return res.status(200).json({ success: 'Login success'})
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(400).send(`<h1>Something went wrong!</h1>`);
      }
      res.redirect('/');
    })
  } catch (err) {
    return console.error(err);
  }
}

const verifyEmail = async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('<h1>Invalid verification link.</h1>');
  }

  try {
    const user = await findUserByToken(token);

    if (!user) {
      return res.status(400).send(`<h1>Invalid or expired verification link.</h1>`)
    } 

    await verifyUserEmail(user.id);

    res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.status(500).send('<h1>Something went wrong.</h1>');
  }
}

module.exports = { registerUser, loginUser, logout, verifyEmail };