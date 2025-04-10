const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for resume uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const userDir = path.join(__dirname, '../uploads/resumes');
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for resume uploads
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', auth, async (req, res) => {
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
      profile: user
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      coverLetterTemplate
    } = req.body;
    
    // Find user
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (coverLetterTemplate) user.coverLetterTemplate = coverLetterTemplate;
    
    // Check if profile is complete
    user.profileComplete = !!(
      user.firstName && 
      user.lastName && 
      user.resumeUrl && 
      user.coverLetterTemplate
    );
    
    user.updatedAt = Date.now();
    
    await user.save();
    
    res.json({
      status: 'success',
      profile: user
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST api/profile/resume
// @desc    Upload resume
// @access  Private
router.post('/resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    // Find user
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Delete old resume if exists
    if (user.resumeUrl) {
      const oldResumePath = path.join(__dirname, '..', user.resumeUrl);
      if (fs.existsSync(oldResumePath)) {
        fs.unlinkSync(oldResumePath);
      }
    }
    
    // Update resume URL
    user.resumeUrl = `/uploads/resumes/${req.file.filename}`;
    
    // Check if profile is complete
    user.profileComplete = !!(
      user.firstName && 
      user.lastName && 
      user.resumeUrl && 
      user.coverLetterTemplate
    );
    
    user.updatedAt = Date.now();
    
    await user.save();
    
    res.json({
      status: 'success',
      profile: user
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Server error'
    });
  }
});

// @route   POST api/profile/cover-letter
// @desc    Update cover letter template
// @access  Private
router.post('/cover-letter', auth, async (req, res) => {
  try {
    const { template } = req.body;
    
    if (!template) {
      return res.status(400).json({
        status: 'error',
        message: 'Cover letter template is required'
      });
    }
    
    // Find user
    let user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update cover letter template
    user.coverLetterTemplate = template;
    
    // Check if profile is complete
    user.profileComplete = !!(
      user.firstName && 
      user.lastName && 
      user.resumeUrl && 
      user.coverLetterTemplate
    );
    
    user.updatedAt = Date.now();
    
    await user.save();
    
    res.json({
      status: 'success',
      profile: user
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
