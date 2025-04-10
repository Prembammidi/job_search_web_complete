const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const SearchHistory = require('../models/SearchHistory');

// Helper function to format job data
const formatJobData = (job) => {
  return {
    id: job.id || job.ext_id,
    title: job.title,
    company: {
      name: job.company?.name || 'Unknown Company',
      logo: job.company?.logo || null,
      website: job.company?.website_url || null
    },
    location: job.location || 'Unknown Location',
    isRemote: job.has_remote || false,
    description: job.description || '',
    applicationUrl: job.application_url || '',
    publishedAt: job.published || new Date().toISOString(),
    jobType: job.types?.[0]?.name || 'Full Time'
  };
};

// @route   GET api/jobs/search
// @desc    Search for jobs with filters
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { title, location, remote, hours = 2, limit = 20 } = req.query;
    
    // Calculate the timestamp for hours_ago
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - parseInt(hours));
    const publishedSince = timeThreshold.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Prepare title search parameter (using OR logic between keywords)
    let titleParam = title;
    if (!titleParam) {
      titleParam = "data engineer|data engineering|ETL developer|data pipeline|big data engineer";
    }
    
    // Build parameters for JobDataAPI
    const params = {
      title: titleParam,
      location: location || undefined,
      has_remote: remote === 'true' ? 'true' : undefined,
      published_since: publishedSince,
      limit: parseInt(limit)
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
    
    let jobs = [];
    
    try {
      // Make API request to JobDataAPI
      const apiKey = process.env.JOBDATA_API_KEY;
      const headers = apiKey ? { Authorization: `Api-Key ${apiKey}` } : {};
      
      const response = await axios.get('https://jobdataapi.com/api/jobs/', {
        headers,
        params
      });
      
      if (response.data && response.data.results) {
        jobs = response.data.results.map(formatJobData);
      }
      
      // Save search history
      const searchHistory = new SearchHistory({
        user: req.user.id,
        keywords: title ? title.split('|OR|') : ["data engineer", "data engineering", "ETL developer", "data pipeline", "big data engineer"],
        location: location || null,
        isRemote: remote === 'true',
        hoursAgo: parseInt(hours),
        resultCount: jobs.length,
      });
      
      await searchHistory.save();
      
    } catch (apiError) {
      console.error('API Error:', apiError.message);
      
      // If API call fails, use sample data for demonstration
      console.log('Using sample data for demonstration');
      
      // Generate sample data based on query parameters
      jobs = [
        {
          id: '12345',
          title: 'Senior Data Engineer',
          company: {
            name: 'TechCorp Inc.',
            logo: 'https://example.com/logo.jpg',
            website: 'https://techcorp.com'
          },
          location: location || 'San Francisco, CA',
          isRemote: remote === 'true',
          description: '<h3>About the Role</h3><p>We are looking for a Senior Data Engineer to join our growing team.</p>',
          applicationUrl: 'https://techcorp.com/careers/senior-data-engineer',
          publishedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * parseInt(hours)).toISOString(),
          jobType: 'Full Time'
        },
        {
          id: '12346',
          title: 'Data Engineering Lead',
          company: {
            name: 'DataFlow Systems',
            logo: 'https://example.com/dataflow-logo.jpg',
            website: 'https://dataflowsystems.com'
          },
          location: location || 'Remote',
          isRemote: true,
          description: '<h3>Job Description</h3><p>DataFlow Systems is seeking a Data Engineering Lead.</p>',
          applicationUrl: 'https://dataflowsystems.com/careers/data-engineering-lead',
          publishedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * parseInt(hours)).toISOString(),
          jobType: 'Full Time'
        }
      ];
    }
    
    res.json({
      status: 'success',
      count: jobs.length,
      jobs
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET api/jobs/:id
// @desc    Get job details by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, we would fetch the job details from JobDataAPI
    // For demonstration, we'll return a sample job
    
    const job = {
      id,
      title: 'Senior Data Engineer',
      company: {
        name: 'TechCorp Inc.',
        logo: 'https://example.com/logo.jpg',
        website: 'https://techcorp.com'
      },
      location: 'San Francisco, CA',
      isRemote: true,
      description: `<h3>About the Role</h3>
        <p>We are looking for a Senior Data Engineer to join our growing team. You will be responsible for building and maintaining our data pipelines, working with big data technologies, and collaborating with data scientists.</p>
        <h3>Requirements</h3>
        <ul>
          <li>5+ years of experience in data engineering</li>
          <li>Proficiency in Python, SQL, and Spark</li>
          <li>Experience with cloud platforms (AWS, GCP, or Azure)</li>
          <li>Knowledge of data warehousing concepts</li>
        </ul>`,
      applicationUrl: 'https://techcorp.com/careers/senior-data-engineer',
      publishedAt: new Date().toISOString(),
      jobType: 'Full Time',
      salary: {
        min: 120000,
        max: 160000,
        currency: 'USD'
      },
      skills: ['Python', 'SQL', 'Spark', 'AWS', 'Data Warehousing']
    };
    
    res.json({
      status: 'success',
      job
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET api/jobs/recent
// @desc    Get recently posted jobs
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    // In a real implementation, we would fetch recent jobs from JobDataAPI
    // For demonstration, we'll return sample jobs
    
    const jobs = [
      {
        id: '12345',
        title: 'Senior Data Engineer',
        company: {
          name: 'TechCorp Inc.',
          logo: 'https://example.com/logo.jpg',
          website: 'https://techcorp.com'
        },
        location: 'San Francisco, CA',
        isRemote: true,
        applicationUrl: 'https://techcorp.com/careers/senior-data-engineer',
        publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        jobType: 'Full Time'
      },
      {
        id: '12346',
        title: 'Data Engineering Lead',
        company: {
          name: 'DataFlow Systems',
          logo: 'https://example.com/dataflow-logo.jpg',
          website: 'https://dataflowsystems.com'
        },
        location: 'Remote',
        isRemote: true,
        applicationUrl: 'https://dataflowsystems.com/careers/data-engineering-lead',
        publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
        jobType: 'Full Time'
      }
    ];
    
    res.json({
      status: 'success',
      count: jobs.length,
      jobs
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
