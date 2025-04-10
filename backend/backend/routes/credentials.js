const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Credential = require('../models/Credential');
const CredentialManager = require('../services/CredentialManager');

// Initialize credential manager
const credentialManager = new CredentialManager(process.env.CREDENTIAL_ENCRYPTION_KEY);

/**
 * @route   GET /api/credentials
 * @desc    Get all portals for which the user has stored credentials
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const portals = await credentialManager.listUserPortals(req.user.id);
    
    res.json({
      status: 'success',
      portals
    });
  } catch (err) {
    console.error('Error fetching credentials:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching credentials'
    });
  }
});

/**
 * @route   POST /api/credentials/:portal
 * @desc    Store credentials for a specific portal
 * @access  Private
 */
router.post('/:portal', auth, async (req, res) => {
  try {
    const { portal } = req.params;
    const credentials = req.body;
    
    // Validate portal
    if (!['linkedin', 'indeed', 'glassdoor', 'workday', 'greenhouse', 'lever', 'other'].includes(portal)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid portal specified'
      });
    }
    
    // Validate credentials
    if (!credentials || Object.keys(credentials).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No credentials provided'
      });
    }
    
    // Store credentials
    await credentialManager.storeCredentials(req.user.id, portal, credentials);
    
    res.json({
      status: 'success',
      message: `Credentials for ${portal} stored successfully`
    });
  } catch (err) {
    console.error('Error storing credentials:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while storing credentials'
    });
  }
});

/**
 * @route   GET /api/credentials/:portal
 * @desc    Check if credentials exist for a specific portal
 * @access  Private
 */
router.get('/:portal', auth, async (req, res) => {
  try {
    const { portal } = req.params;
    
    // Validate portal
    if (!['linkedin', 'indeed', 'glassdoor', 'workday', 'greenhouse', 'lever', 'other'].includes(portal)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid portal specified'
      });
    }
    
    // Check if credentials exist
    const hasCredentials = await credentialManager.hasCredentials(req.user.id, portal);
    
    res.json({
      status: 'success',
      hasCredentials
    });
  } catch (err) {
    console.error('Error checking credentials:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while checking credentials'
    });
  }
});

/**
 * @route   DELETE /api/credentials/:portal
 * @desc    Delete credentials for a specific portal
 * @access  Private
 */
router.delete('/:portal', auth, async (req, res) => {
  try {
    const { portal } = req.params;
    
    // Validate portal
    if (!['linkedin', 'indeed', 'glassdoor', 'workday', 'greenhouse', 'lever', 'other'].includes(portal)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid portal specified'
      });
    }
    
    // Delete credentials
    const deleted = await credentialManager.deleteCredentials(req.user.id, portal);
    
    if (deleted) {
      res.json({
        status: 'success',
        message: `Credentials for ${portal} deleted successfully`
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: `No credentials found for ${portal}`
      });
    }
  } catch (err) {
    console.error('Error deleting credentials:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting credentials'
    });
  }
});

module.exports = router;
