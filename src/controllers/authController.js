const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/userModel');

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
    const newUser = await createUser(fullName, email, hashedPassword);

    return res.status(201).json({ message: 'Account Created'});
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

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials'});
    } else {
      req.session.user = { 
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
      return res.status(200).json({ success: 'Login success'})
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Server error, please try again later.' });
  }
}

module.exports = { registerUser, loginUser };