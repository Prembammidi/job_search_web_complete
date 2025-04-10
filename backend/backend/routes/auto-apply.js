const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AutomatedJobApplicant = require('../services/AutomatedJobApplicant');
const CredentialManager = require('../services/CredentialManager');
const Application = require('../models/Application');
const User = require('../models/User');

// Initialize credential manager
const credentialManager = new CredentialManager(process.env.CREDENTIAL_ENCRYPTION_KEY);

/**
 * @route   POST /api/auto-apply
 * @desc    Automatically apply to a job
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // Get user profile
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed their profile
    if (!user.profileComplete) {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete your profile before applying to jobs'
      });
    }
    
    // Get job details from database
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Determine which portal to use based on job source or application URL
    const portal = determinePortal(job.applicationUrl);
    
    // Check if user has credentials for this portal
    const hasCredentials = await credentialManager.hasCredentials(req.user.id, portal);
    if (!hasCredentials) {
      return res.status(400).json({
        status: 'error',
        message: `You need to add your ${portal} credentials before applying`
      });
    }
    
    // Get user credentials for this portal
    const credentials = await credentialManager.getCredentials(req.user.id, portal);
    
    // Build user profile for automated application
    const userProfile = buildUserProfile(user, credentials);
    
    // Initialize automated job applicant
    const applicant = new AutomatedJobApplicant(userProfile);
    
    // Apply to job
    const result = await applicant.applyToJob(job);
    
    // Close browser
    await applicant.close();
    
    if (result.success) {
      // Create application record
      const application = new Application({
        user: req.user.id,
        jobId: job._id,
        jobTitle: job.title,
        company: job.company.name,
        location: job.location,
        applicationUrl: job.applicationUrl,
        applicationDate: new Date(),
        status: 'applied',
        isRemote: job.isRemote,
        notes: `Automatically applied via ${portal}`
      });
      
      await application.save();
      
      res.json({
        status: 'success',
        message: 'Successfully applied to job',
        application
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to apply to job',
        error: result.error
      });
    }
  } catch (err) {
    console.error('Error in auto-apply:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while applying to job'
    });
  }
});

/**
 * @route   POST /api/auto-apply/batch
 * @desc    Automatically apply to multiple jobs
 * @access  Private
 */
router.post('/batch', auth, async (req, res) => {
  try {
    const { jobIds } = req.body;
    
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Job IDs array is required'
      });
    }
    
    // Get user profile
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed their profile
    if (!user.profileComplete) {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete your profile before applying to jobs'
      });
    }
    
    // Start batch application process
    // This will be handled asynchronously
    res.json({
      status: 'success',
      message: `Started batch application process for ${jobIds.length} jobs`,
      batchId: generateBatchId()
    });
    
    // Process applications in the background
    processBatchApplications(req.user.id, jobIds, user);
    
  } catch (err) {
    console.error('Error in batch auto-apply:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while setting up batch application'
    });
  }
});

/**
 * @route   GET /api/auto-apply/status/:batchId
 * @desc    Get status of a batch application process
 * @access  Private
 */
router.get('/status/:batchId', auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Get batch status from database or cache
    const batchStatus = await getBatchStatus(batchId);
    
    if (!batchStatus) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch application process not found'
      });
    }
    
    res.json({
      status: 'success',
      batchStatus
    });
  } catch (err) {
    console.error('Error getting batch status:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error while getting batch status'
    });
  }
});

/**
 * Determine which portal to use based on job application URL
 * @param {string} url - Application URL
 * @returns {string} - Portal name
 */
function determinePortal(url) {
  if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) {
    return 'workday';
  } else if (url.includes('greenhouse.io')) {
    return 'greenhouse';
  } else if (url.includes('lever.co')) {
    return 'lever';
  } else if (url.includes('indeed.com')) {
    return 'indeed';
  } else if (url.includes('linkedin.com')) {
    return 'linkedin';
  } else if (url.includes('glassdoor.com')) {
    return 'glassdoor';
  } else {
    return 'other';
  }
}

/**
 * Build user profile for automated application
 * @param {Object} user - User document
 * @param {Object} credentials - Portal credentials
 * @returns {Object} - User profile
 */
function buildUserProfile(user, credentials) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: credentials.email || user.email,
    password: credentials.password,
    phone: user.phone,
    address: user.address,
    resumePath: user.resumeUrl,
    coverLetterTemplate: user.coverLetterTemplate,
    linkedinUrl: user.linkedinUrl,
    websiteUrl: user.websiteUrl,
    currentCompany: user.currentCompany,
    workExperience: user.workExperience,
    education: user.education,
    skills: user.skills,
    willingToRelocate: user.willingToRelocate,
    workAuthorization: user.workAuthorization,
    salaryExpectation: user.salaryExpectation,
    availableStartDate: user.availableStartDate,
    yearsOfExperience: calculateYearsOfExperience(user.workExperience),
    highestEducation: getHighestEducation(user.education),
    referralSource: 'Job Search Website',
    coverLetterSummary: generateCoverLetterSummary(user)
  };
}

/**
 * Calculate total years of experience
 * @param {Array} workExperience - Work experience array
 * @returns {number} - Years of experience
 */
function calculateYearsOfExperience(workExperience) {
  if (!workExperience || workExperience.length === 0) {
    return 0;
  }
  
  let totalMonths = 0;
  
  for (const job of workExperience) {
    const startDate = new Date(job.startDate);
    const endDate = job.current ? new Date() : new Date(job.endDate);
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                  (endDate.getMonth() - startDate.getMonth());
    
    totalMonths += months;
  }
  
  return Math.round(totalMonths / 12);
}

/**
 * Get highest education level
 * @param {Array} education - Education array
 * @returns {string} - Highest education level
 */
function getHighestEducation(education) {
  if (!education || education.length === 0) {
    return 'High School';
  }
  
  const educationLevels = {
    'High School': 1,
    'Associate': 2,
    'Bachelor': 3,
    'Master': 4,
    'PhD': 5
  };
  
  let highestLevel = 'High School';
  let highestValue = 1;
  
  for (const edu of education) {
    const degree = edu.degree;
    
    for (const [level, value] of Object.entries(educationLevels)) {
      if (degree.includes(level) && value > highestValue) {
        highestLevel = level;
        highestValue = value;
      }
    }
  }
  
  return highestLevel;
}

/**
 * Generate a short cover letter summary
 * @param {Object} user - User document
 * @returns {string} - Cover letter summary
 */
function generateCoverLetterSummary(user) {
  return `I am a data engineering professional with ${calculateYearsOfExperience(user.workExperience)} years of experience. My background includes working with ${user.skills.slice(0, 3).join(', ')} and other relevant technologies. I am excited about this opportunity and believe my skills and experience make me a strong candidate for this position.`;
}

/**
 * Generate a unique batch ID
 * @returns {string} - Batch ID
 */
function generateBatchId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

/**
 * Process batch applications in the background
 * @param {string} userId - User ID
 * @param {Array} jobIds - Array of job IDs
 * @param {Object} user - User document
 */
async function processBatchApplications(userId, jobIds, user) {
  try {
    // Create batch record in database
    const batch = {
      id: generateBatchId(),
      userId,
      jobIds,
      status: 'processing',
      progress: 0,
      results: [],
      startTime: new Date(),
      endTime: null
    };
    
    // Save batch to database or cache
    await saveBatchStatus(batch);
    
    // Process each job
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      
      try {
        // Get job details
        const job = await Job.findById(jobId);
        if (!job) {
          batch.results.push({
            jobId,
            success: false,
            error: 'Job not found'
          });
          continue;
        }
        
        // Determine which portal to use
        const portal = determinePortal(job.applicationUrl);
        
        // Check if user has credentials for this portal
        const hasCredentials = await credentialManager.hasCredentials(userId, portal);
        if (!hasCredentials) {
          batch.results.push({
            jobId,
            success: false,
            error: `No credentials for ${portal}`
          });
          continue;
        }
        
        // Get user credentials for this portal
        const credentials = await credentialManager.getCredentials(userId, portal);
        
        // Build user profile
        const userProfile = buildUserProfile(user, credentials);
        
        // Initialize automated job applicant
        const applicant = new AutomatedJobApplicant(userProfile);
        
        // Apply to job
        const result = await applicant.applyToJob(job);
        
        // Close browser
        await applicant.close();
        
        if (result.success) {
          // Create application record
          const application = new Application({
            user: userId,
            jobId: job._id,
            jobTitle: job.title,
            company: job.company.name,
            location: job.location,
            applicationUrl: job.applicationUrl,
            applicationDate: new Date(),
            status: 'applied',
            isRemote: job.isRemote,
            notes: `Automatically applied via ${portal}`
          });
          
          await application.save();
          
          batch.results.push({
            jobId,
            success: true,
            applicationId: application._id
          });
        } else {
          batch.results.push({
            jobId,
            success: false,
            error: result.error
          });
        }
      } catch (err) {
        console.error(`Error applying to job ${jobId}:`, err.message);
        batch.results.push({
          jobId,
          success: false,
          error: err.message
        });
      }
      
      // Update progress
      batch.progress = Math.round(((i + 1) / jobIds.length) * 100);
      await saveBatchStatus(batch);
      
      // Add a delay between applications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Update batch status
    batch.status = 'completed';
    batch.endTime = new Date();
    await saveBatchStatus(batch);
    
  } catch (err) {
    console.error('Error processing batch applications:', err.message);
  }
}

/**
 * Save batch status to database or cache
 * @param {Object} batch - Batch status object
 */
async function saveBatchStatus(batch) {
  // Implementation depends on database or cache system
  // For now, we'll use a simple in-memory store
  global.batchStatuses = global.batchStatuses || {};
  global.batchStatuses[batch.id] = batch;
}

/**
 * Get batch status from database or cache
 * @param {string} batchId - Batch ID
 * @returns {Object} - Batch status object
 */
async function getBatchStatus(batchId) {
  // Implementation depends on database or cache system
  // For now, we'll use a simple in-memory store
  global.batchStatuses = global.batchStatuses || {};
  return global.batchStatuses[batchId];
}

module.exports = router;
