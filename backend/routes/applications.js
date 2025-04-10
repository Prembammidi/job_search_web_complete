const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');

// @route   POST api/applications
// @desc    Create a new application
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      jobId,
      jobTitle,
      company,
      location,
      applicationUrl,
      jobDescription,
      isRemote,
      notes
    } = req.body;

    // Validate input
    if (!jobId || !jobTitle || !company) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Check if application already exists
    let application = await Application.findOne({
      user: req.user.id,
      jobId
    });

    if (application) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied to this job'
      });
    }

    // Create new application
    application = new Application({
      user: req.user.id,
      jobId,
      jobTitle,
      company,
      location,
      applicationUrl,
      jobDescription,
      isRemote,
      notes,
      status: 'applied'
    });

    await application.save();

    res.status(201).json({
      status: 'success',
      application
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET api/applications
// @desc    Get all applications for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user.id })
      .sort({ applicationDate: -1 });

    res.json({
      status: 'success',
      count: applications.length,
      applications
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET api/applications/:id
// @desc    Get application by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check if application belongs to user
    if (application.user.toString() !== req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this application'
      });
    }

    res.json({
      status: 'success',
      application
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT api/applications/:id
// @desc    Update application status or notes
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Find application
    let application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check if application belongs to user
    if (application.user.toString() !== req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to update this application'
      });
    }

    // Update fields
    if (status) application.status = status;
    if (notes) application.notes = notes;
    application.updatedAt = Date.now();

    await application.save();

    res.json({
      status: 'success',
      application
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE api/applications/:id
// @desc    Delete an application
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find application
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check if application belongs to user
    if (application.user.toString() !== req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to delete this application'
      });
    }

    await application.remove();

    res.json({
      status: 'success',
      message: 'Application removed'
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
