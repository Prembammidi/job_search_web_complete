const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Please provide all required fields' 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User already exists with this email' 
      });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username is already taken' 
      });
    }

    // Create new user
    user = new User({
      username,
      email,
      password
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          status: 'success', 
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileComplete: user.profileComplete
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Please provide email and password' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          status: 'success', 
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profileComplete: user.profileComplete
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }
    res.json({ 
      status: 'success', 
      user 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
});

module.exports = router;
