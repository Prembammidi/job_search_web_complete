const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * JobPortalScraper class for scraping job listings from various job portals
 */
class JobPortalScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize the browser instance
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ],
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // Set default navigation timeout (30 seconds)
      this.page.setDefaultNavigationTimeout(30000);
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      return true;
    } catch (error) {
      console.error('Error initializing browser:', error);
      return false;
    }
  }

  /**
   * Close the browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Search for jobs on LinkedIn
   * @param {Object} params - Search parameters
   * @returns {Array} - Array of job listings
   */
  async searchLinkedIn(params) {
    if (!this.browser) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize browser');
      }
    }

    try {
      // Construct search URL
      let searchUrl = 'https://www.linkedin.com/jobs/search/?';
      const queryParams = [];
      
      if (params.keywords) {
        queryParams.push(`keywords=${encodeURIComponent(params.keywords)}`);
      }
      
      if (params.location) {
        queryParams.push(`location=${encodeURIComponent(params.location)}`);
      }
      
      if (params.remote) {
        queryParams.push('f_WT=2');
      }
      
      searchUrl += queryParams.join('&');
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Check for login wall and handle it
      const loginButton = await this.page.$('.authwall-join-form__form-toggle--bottom');
      if (loginButton) {
        console.log('LinkedIn login wall detected, using alternative scraping method');
        return this.scrapeLinkedInJobsWithoutLogin(params);
      }
      
      // Scroll to load more jobs
      await this.autoScroll(this.page);
      
      // Extract job listings
      const jobs = await this.page.evaluate(() => {
        const jobElements = document.querySelectorAll('.job-search-card');
        return Array.from(jobElements).map(job => {
          const titleElement = job.querySelector('.job-search-card__title');
          const companyElement = job.querySelector('.job-search-card__subtitle');
          const locationElement = job.querySelector('.job-search-card__location');
          const linkElement = job.querySelector('.job-search-card__title-link');
          const timeElement = job.querySelector('time');
          
          return {
            id: job.dataset.entityUrn?.split(':').pop() || '',
            title: titleElement?.textContent.trim() || '',
            company: {
              name: companyElement?.textContent.trim() || '',
              logo: null,
              website: null
            },
            location: locationElement?.textContent.trim() || '',
            applicationUrl: linkElement?.href || '',
            publishedAt: timeElement?.dateTime || new Date().toISOString(),
            description: '',
            isRemote: locationElement?.textContent.toLowerCase().includes('remote') || false,
            jobType: 'Full-time', // Default value
            source: 'linkedin'
          };
        });
      });
      
      // Filter jobs by recency if hours parameter is provided
      const filteredJobs = params.hours 
        ? this.filterJobsByRecency(jobs, params.hours)
        : jobs;
      
      // Get job details for each job
      const jobsWithDetails = await Promise.all(
        filteredJobs.map(job => this.getLinkedInJobDetails(job))
      );
      
      return jobsWithDetails;
    } catch (error) {
      console.error('Error searching LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Get job details from LinkedIn
   * @param {Object} job - Basic job information
   * @returns {Object} - Job with detailed information
   */
  async getLinkedInJobDetails(job) {
    try {
      if (!job.applicationUrl) {
        return job;
      }
      
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Check for login wall
      const loginWall = await this.page.$('.authwall-join-form');
      if (loginWall) {
        console.log('LinkedIn login wall detected for job details, using basic job info');
        return job;
      }
      
      // Extract job details
      const jobDetails = await this.page.evaluate(() => {
        const descriptionElement = document.querySelector('.job-view-layout .description__text');
        const companyLogoElement = document.querySelector('.job-view-layout .artdeco-entity-image');
        const jobTypeElement = document.querySelector('.job-view-layout .description__job-criteria-text:nth-child(1)');
        const salaryElement = document.querySelector('.job-view-layout .compensation__salary');
        
        let salary = null;
        if (salaryElement) {
          const salaryText = salaryElement.textContent.trim();
          const salaryMatch = salaryText.match(/(\$[\d,]+)\s*-\s*(\$[\d,]+)/);
          if (salaryMatch) {
            salary = {
              min: parseInt(salaryMatch[1].replace(/[$,]/g, '')),
              max: parseInt(salaryMatch[2].replace(/[$,]/g, '')),
              currency: 'USD'
            };
          }
        }
        
        return {
          description: descriptionElement?.innerHTML || '',
          company: {
            logo: companyLogoElement?.src || null
          },
          jobType: jobTypeElement?.textContent.trim() || 'Full-time',
          salary: salary
        };
      });
      
      return {
        ...job,
        description: jobDetails.description,
        company: {
          ...job.company,
          logo: jobDetails.company.logo
        },
        jobType: jobDetails.jobType,
        salary: jobDetails.salary
      };
    } catch (error) {
      console.error(`Error getting LinkedIn job details for ${job.id}:`, error);
      return job;
    }
  }

  /**
   * Scrape LinkedIn jobs without login using alternative method
   * @param {Object} params - Search parameters
   * @returns {Array} - Array of job listings
   */
  async scrapeLinkedInJobsWithoutLogin(params) {
    try {
      // Use axios to make a request to LinkedIn's job search API
      const response = await axios.get('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search', {
        params: {
          keywords: params.keywords || '',
          location: params.location || '',
          f_WT: params.remote ? '2' : '',
          start: 0
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Parse HTML response
      const $ = cheerio.load(response.data);
      const jobs = [];
      
      $('.job-search-card').each((i, element) => {
        const titleElement = $(element).find('.job-search-card__title');
        const companyElement = $(element).find('.job-search-card__subtitle');
        const locationElement = $(element).find('.job-search-card__location');
        const linkElement = $(element).find('.job-search-card__title-link');
        const timeElement = $(element).find('time');
        
        const job = {
          id: $(element).data('entity-urn')?.split(':').pop() || '',
          title: titleElement.text().trim(),
          company: {
            name: companyElement.text().trim(),
            logo: null,
            website: null
          },
          location: locationElement.text().trim(),
          applicationUrl: linkElement.attr('href') || '',
          publishedAt: timeElement.attr('datetime') || new Date().toISOString(),
          description: '',
          isRemote: locationElement.text().toLowerCase().includes('remote'),
          jobType: 'Full-time', // Default value
          source: 'linkedin'
        };
        
        jobs.push(job);
      });
      
      // Filter jobs by recency if hours parameter is provided
      return params.hours 
        ? this.filterJobsByRecency(jobs, params.hours)
        : jobs;
    } catch (error) {
      console.error('Error scraping LinkedIn jobs without login:', error);
      throw error;
    }
  }

  /**
   * Search for jobs on Indeed
   * @param {Object} params - Search parameters
   * @returns {Array} - Array of job listings
   */
  async searchIndeed(params) {
    if (!this.browser) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize browser');
      }
    }

    try {
      // Construct search URL
      let searchUrl = 'https://www.indeed.com/jobs?';
      const queryParams = [];
      
      if (params.keywords) {
        queryParams.push(`q=${encodeURIComponent(params.keywords)}`);
      }
      
      if (params.location) {
        queryParams.push(`l=${encodeURIComponent(params.location)}`);
      }
      
      if (params.remote) {
        queryParams.push('remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11');
      }
      
      // Add date filter if hours parameter is provided
      if (params.hours) {
        let fromage = 1; // Default to 1 day
        if (params.hours <= 24) {
          fromage = 1;
        } else if (params.hours <= 72) {
          fromage = 3;
        } else {
          fromage = 7;
        }
        queryParams.push(`fromage=${fromage}`);
      }
      
      searchUrl += queryParams.join('&');
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Scroll to load more jobs
      await this.autoScroll(this.page);
      
      // Extract job listings
      const jobs = await this.page.evaluate(() => {
        const jobElements = document.querySelectorAll('.job_seen_beacon');
        return Array.from(jobElements).map(job => {
          const titleElement = job.querySelector('.jobTitle span');
          const companyElement = job.querySelector('.companyName');
          const locationElement = job.querySelector('.companyLocation');
          const linkElement = job.querySelector('.jcs-JobTitle');
          const dateElement = job.querySelector('.date');
          
          // Generate a unique ID
          const id = linkElement?.href.match(/jk=([^&]+)/)?.[1] || Math.random().toString(36).substring(2, 15);
          
          // Extract application URL
          const applicationUrl = linkElement?.href || '';
          
          // Determine if job is remote
          const isRemote = locationElement?.textContent.toLowerCase().includes('remote') || false;
          
          return {
            id,
            title: titleElement?.textContent.trim() || '',
            company: {
              name: companyElement?.textContent.trim() || '',
              logo: null,
              website: null
            },
            location: locationElement?.textContent.trim() || '',
            applicationUrl,
            publishedAt: new Date().toISOString(), // Indeed doesn't provide exact timestamp
            description: '',
            isRemote,
            jobType: 'Full-time', // Default value
            source: 'indeed'
          };
        });
      });
      
      // Get job details for each job
      const jobsWithDetails = await Promise.all(
        jobs.map(job => this.getIndeedJobDetails(job))
      );
      
      return jobsWithDetails;
    } catch (error) {
      console.error('Error searching Indeed:', error);
      throw error;
    }
  }

  /**
   * Get job details from Indeed
   * @param {Object} job - Basic job information
   * @returns {Object} - Job with detailed information
   */
  async getIndeedJobDetails(job) {
    try {
      if (!job.applicationUrl) {
        return job;
      }
      
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Extract job details
      const jobDetails = await this.page.evaluate(() => {
        const descriptionElement = document.querySelector('#jobDescriptionText');
        const companyLogoElement = document.querySelector('.jobsearch-CompanyAvatar-image');
        const jobTypeElements = document.querySelectorAll('.jobsearch-JobDescriptionSection-sectionItem');
        const salaryElement = document.querySelector('[data-testid="attribute_snippet_compensation"]');
        
        // Extract job type
        let jobType = 'Full-time'; // Default
        jobTypeElements.forEach(element => {
          const label = element.querySelector('.jobsearch-JobDescriptionSection-sectionItemKey');
          const value = element.querySelector('.jobsearch-JobDescriptionSection-sectionItemValue');
          
          if (label && label.textContent.includes('Job type') && value) {
            jobType = value.textContent.trim();
          }
        });
        
        // Extract salary
        let salary = null;
        if (salaryElement) {
          const salaryText = salaryElement.textContent.trim();
          const salaryMatch = salaryText.match(/(\$[\d,]+)\s*-\s*(\$[\d,]+)/);
          if (salaryMatch) {
            salary = {
              min: parseInt(salaryMatch[1].replace(/[$,]/g, '')),
              max: parseInt(salaryMatch[2].replace(/[$,]/g, '')),
              currency: 'USD'
            };
          }
        }
        
        return {
          description: descriptionElement?.innerHTML || '',
          company: {
            logo: companyLogoElement?.src || null
          },
          jobType,
          salary
        };
      });
      
      return {
        ...job,
        description: jobDetails.description,
        company: {
          ...job.company,
          logo: jobDetails.company.logo
        },
        jobType: jobDetails.jobType,
        salary: jobDetails.salary
      };
    } catch (error) {
      console.error(`Error getting Indeed job details for ${job.id}:`, error);
      return job;
    }
  }

  /**
   * Search for jobs on Glassdoor
   * @param {Object} params - Search parameters
   * @returns {Array} - Array of job listings
   */
  async searchGlassdoor(params) {
    if (!this.browser) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize browser');
      }
    }

    try {
      // Construct search URL
      let searchUrl = 'https://www.glassdoor.com/Job/jobs.htm?';
      const queryParams = [];
      
      if (params.keywords) {
        queryParams.push(`sc.keyword=${encodeURIComponent(params.keywords)}`);
      }
      
      if (params.location) {
        queryParams.push(`locT=C&locId=1147401&locKeyword=${encodeURIComponent(params.location)}`);
      }
      
      if (params.remote) {
        queryParams.push('remoteWorkType=1');
      }
      
      searchUrl += queryParams.join('&');
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Handle potential login modal
      const closeButton = await this.page.$('[alt="Close"]');
      if (closeButton) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Scroll to load more jobs
      await this.autoScroll(this.page);
      
      // Extract job listings
      const jobs = await this.page.evaluate(() => {
        const jobElements = document.querySelectorAll('.react-job-listing');
        return Array.from(jobElements).map(job => {
          const titleElement = job.querySelector('.job-title');
          const companyElement = job.querySelector('.employer-name');
          const locationElement = job.querySelector('.location');
          const logoElement = job.querySelector('.employer-logo');
          const dateElement = job.querySelector('.job-age');
          
          // Generate a unique ID
          const id = job.dataset.id || Math.random().toString(36).substring(2, 15);
          
          // Extract application URL
          const applicationUrl = 'https://www.glassdoor.com' + job.getAttribute('data-job-url');
          
          // Determine if job is remote
          const isRemote = locationElement?.textContent.toLowerCase().includes('remote') || false;
          
          // Estimate published date based on job age text
          let publishedAt = new Date();
          if (dateElement) {
            const ageText = dateElement.textContent.trim();
            if (ageText.includes('d')) {
              const days = parseInt(ageText);
              publishedAt.setDate(publishedAt.getDate() - days);
            } else if (ageText.includes('h')) {
              const hours = parseInt(ageText);
              publishedAt.setHours(publishedAt.getHours() - hours);
            }
          }
          
          return {
            id,
            title: titleElement?.textContent.trim() || '',
            company: {
              name: companyElement?.textContent.trim() || '',
              logo: logoElement?.src || null,
              website: null
            },
            location: locationElement?.textContent.trim() || '',
            applicationUrl,
            publishedAt: publishedAt.toISOString(),
            description: '',
            isRemote,
            jobType: 'Full-time', // Default value
            source: 'glassdoor'
          };
        });
      });
      
      // Filter jobs by recency if hours parameter is provided
      const filteredJobs = params.hours 
        ? this.filterJobsByRecency(jobs, params.hours)
        : jobs;
      
      // Get job details for each job
      const jobsWithDetails = await Promise.all(
        filteredJobs.map(job => this.getGlassdoorJobDetails(job))
      );
      
      return jobsWithDetails;
    } catch (error) {
      console.error('Error searching Glassdoor:', error);
      throw error;
    }
  }

  /**
   * Get job details from Glassdoor
   * @param {Object} job - Basic job information
   * @returns {Object} - Job with detailed information
   */
  async getGlassdoorJobDetails(job) {
    try {
      if (!job.applicationUrl) {
        return job;
      }
      
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Handle potential login modal
      const closeButton = await this.page.$('[alt="Close"]');
      if (closeButton) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Extract job details
      const jobDetails = await this.page.evaluate(() => {
        const descriptionElement = document.querySelector('.jobDescriptionContent');
        const jobTypeElement = document.querySelector('.css-1cz2q2o');
        const salaryElement = document.querySelector('.salary');
        
        // Extract salary
        let salary = null;
        if (salaryElement) {
          const salaryText = salaryElement.textContent.trim();
          const salaryMatch = salaryText.match(/(\$[\d,]+)\s*-\s*(\$[\d,]+)/);
          if (salaryMatch) {
            salary = {
              min: parseInt(salaryMatch[1].replace(/[$,]/g, '')),
              max: parseInt(salaryMatch[2].replace(/[$,]/g, '')),
              currency: 'USD'
            };
          }
        }
        
        return {
          description: descriptionElement?.innerHTML || '',
          jobType: jobTypeElement?.textContent.trim() || 'Full-time',
          salary
        };
      });
      
      return {
        ...job,
        description: jobDetails.description,
        jobType: jobDetails.jobType,
        salary: jobDetails.salary
      };
    } catch (error) {
      console.error(`Error getting Glassdoor job details for ${job.id}:`, error);
      return job;
    }
  }

  /**
   * Filter jobs by recency
   * @param {Array} jobs - Array of job listings
   * @param {number} hours - Maximum age in hours
   * @returns {Array} - Filtered array of job listings
   */
  filterJobsByRecency(jobs, hours) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return jobs.filter(job => {
      if (!job.publishedAt) return true;
      const publishedDate = new Date(job.publishedAt);
      return publishedDate >= cutoffTime;
    });
  }

  /**
   * Auto-scroll page to load more content
   * @param {Page} page - Puppeteer page object
   */
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Search for jobs across multiple platforms
   * @param {Object} params - Search parameters
   * @returns {Array} - Combined array of job listings
   */
  async searchAllPlatforms(params) {
    try {
      // Initialize browser if not already initialized
      if (!this.browser) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize browser');
        }
      }
      
      // Search on multiple platforms in parallel
      const [linkedInJobs, indeedJobs, glassdoorJobs] = await Promise.all([
        this.searchLinkedIn(params).catch(err => {
          console.error('LinkedIn search error:', err);
          return [];
        }),
        this.searchIndeed(params).catch(err => {
          console.error('Indeed search error:', err);
          return [];
        }),
        this.searchGlassdoor(params).catch(err => {
          console.error('Glassdoor search error:', err);
          return [];
        })
      ]);
      
      // Combine results
      const allJobs = [...linkedInJobs, ...indeedJobs, ...glassdoorJobs];
      
      // Remove duplicates based on title and company
      const uniqueJobs = this.removeDuplicateJobs(allJobs);
      
      // Sort by recency
      uniqueJobs.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      return uniqueJobs;
    } catch (error) {
      console.error('Error searching all platforms:', error);
      throw error;
    } finally {
      // Close browser
      await this.close();
    }
  }

  /**
   * Remove duplicate jobs based on title and company
   * @param {Array} jobs - Array of job listings
   * @returns {Array} - Array with duplicates removed
   */
  removeDuplicateJobs(jobs) {
    const uniqueJobs = [];
    const seen = new Set();
    
    for (const job of jobs) {
      const key = `${job.title.toLowerCase()}-${job.company.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueJobs.push(job);
      }
    }
    
    return uniqueJobs;
  }
}

module.exports = JobPortalScraper;
