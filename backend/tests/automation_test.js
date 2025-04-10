const puppeteer = require('puppeteer');
const JobPortalScraper = require('../services/JobPortalScraper');
const AutomatedJobApplicant = require('../services/AutomatedJobApplicant');

// Test configuration
const TEST_CONFIG = {
  searchParams: {
    keywords: 'data engineer',
    location: 'remote',
    remote: true,
    hours: 24
  },
  userProfile: {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123',
    phone: '555-123-4567',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345'
    },
    resumePath: './test_files/test_resume.pdf',
    coverLetterTemplate: 'Dear [Hiring Manager],\n\nI am writing to express my interest in the [Job Title] position at [Company Name].\n\nSincerely,\nTest User',
    linkedinUrl: 'https://linkedin.com/in/testuser',
    websiteUrl: 'https://testuser.com',
    currentCompany: 'Test Company',
    workExperience: [
      {
        title: 'Data Engineer',
        company: 'Test Company',
        location: 'Remote',
        startDate: '2020-01-01',
        current: true,
        description: 'Working on data engineering projects'
      }
    ],
    education: [
      {
        school: 'Test University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        graduationDate: '2019-05-15'
      }
    ],
    skills: ['Python', 'SQL', 'ETL', 'Spark', 'AWS'],
    willingToRelocate: false,
    workAuthorization: true,
    salaryExpectation: 120000,
    availableStartDate: '2023-06-01',
    yearsOfExperience: 3,
    highestEducation: 'Bachelor',
    referralSource: 'Job Search Website',
    coverLetterSummary: 'Experienced data engineer with skills in Python, SQL, and cloud technologies.'
  }
};

/**
 * Test the JobPortalScraper functionality
 */
async function testJobPortalScraper() {
  console.log('=== Testing JobPortalScraper ===');
  
  const scraper = new JobPortalScraper();
  
  try {
    console.log('Initializing browser...');
    await scraper.initialize();
    
    console.log('Searching for jobs on LinkedIn...');
    const linkedInJobs = await scraper.searchLinkedIn(TEST_CONFIG.searchParams);
    console.log(`Found ${linkedInJobs.length} jobs on LinkedIn`);
    
    if (linkedInJobs.length > 0) {
      console.log('Sample job from LinkedIn:');
      console.log(JSON.stringify(linkedInJobs[0], null, 2));
    }
    
    console.log('Searching for jobs on Indeed...');
    const indeedJobs = await scraper.searchIndeed(TEST_CONFIG.searchParams);
    console.log(`Found ${indeedJobs.length} jobs on Indeed`);
    
    if (indeedJobs.length > 0) {
      console.log('Sample job from Indeed:');
      console.log(JSON.stringify(indeedJobs[0], null, 2));
    }
    
    console.log('Closing browser...');
    await scraper.close();
    
    console.log('JobPortalScraper test completed successfully');
    return true;
  } catch (error) {
    console.error('Error testing JobPortalScraper:', error);
    await scraper.close();
    return false;
  }
}

/**
 * Test the AutomatedJobApplicant functionality
 */
async function testAutomatedJobApplicant() {
  console.log('=== Testing AutomatedJobApplicant ===');
  
  // Create a mock job for testing
  const mockJob = {
    id: 'test-job-123',
    title: 'Senior Data Engineer',
    company: {
      name: 'Test Company',
      logo: null,
      website: null
    },
    location: 'Remote',
    isRemote: true,
    description: 'This is a test job description for a Senior Data Engineer position.',
    applicationUrl: 'https://www.linkedin.com/jobs/view/test-job-123',
    publishedAt: new Date().toISOString(),
    jobType: 'Full-time',
    source: 'linkedin'
  };
  
  const applicant = new AutomatedJobApplicant(TEST_CONFIG.userProfile);
  
  try {
    console.log('Initializing browser...');
    await applicant.initialize();
    
    console.log('Testing application system detection...');
    const portal = applicant.detectApplicationSystem(mockJob.applicationUrl);
    console.log(`Detected application system: ${portal}`);
    
    // Note: We won't actually apply to a job in this test to avoid unwanted applications
    console.log('Simulating job application process...');
    
    // Instead, we'll test the cover letter generation
    console.log('Testing cover letter generation...');
    const coverLetter = applicant.generateCoverLetter(mockJob);
    console.log('Generated cover letter:');
    console.log(coverLetter);
    
    console.log('Closing browser...');
    await applicant.close();
    
    console.log('AutomatedJobApplicant test completed successfully');
    return true;
  } catch (error) {
    console.error('Error testing AutomatedJobApplicant:', error);
    await applicant.close();
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting tests...');
  
  // Create test files directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  const testFilesDir = path.join(__dirname, 'test_files');
  
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }
  
  // Create a dummy resume file for testing
  const dummyResumePath = path.join(testFilesDir, 'test_resume.pdf');
  if (!fs.existsSync(dummyResumePath)) {
    fs.writeFileSync(dummyResumePath, 'Dummy resume content');
  }
  
  // Update resume path in test config
  TEST_CONFIG.userProfile.resumePath = dummyResumePath;
  
  // Run tests
  const scraperTestResult = await testJobPortalScraper();
  const applicantTestResult = await testAutomatedJobApplicant();
  
  // Report results
  console.log('\n=== Test Results ===');
  console.log(`JobPortalScraper: ${scraperTestResult ? 'PASSED' : 'FAILED'}`);
  console.log(`AutomatedJobApplicant: ${applicantTestResult ? 'PASSED' : 'FAILED'}`);
  
  if (scraperTestResult && applicantTestResult) {
    console.log('\nAll tests passed successfully!');
  } else {
    console.log('\nSome tests failed. Please check the logs for details.');
  }
}

// Run the tests
runTests().catch(console.error);
