const puppeteer = require('puppeteer');
const axios = require('axios');

/**
 * AutomatedJobApplicant class for handling automated job applications
 * across different job portals and application systems
 */
class AutomatedJobApplicant {
  constructor(userProfile) {
    this.userProfile = userProfile;
    this.browser = null;
    this.page = null;
    this.applicationResults = [];
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
   * Apply to a job
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyToJob(job) {
    if (!this.browser) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          jobId: job.id,
          error: 'Failed to initialize browser'
        };
      }
    }

    try {
      // Determine the application system type
      const applicationType = this.detectApplicationSystem(job.applicationUrl);
      
      let result;
      
      // Apply based on the application system type
      switch (applicationType) {
        case 'workday':
          result = await this.applyViaWorkday(job);
          break;
        case 'greenhouse':
          result = await this.applyViaGreenhouse(job);
          break;
        case 'lever':
          result = await this.applyViaLever(job);
          break;
        case 'indeed':
          result = await this.applyViaIndeed(job);
          break;
        case 'linkedin':
          result = await this.applyViaLinkedIn(job);
          break;
        default:
          result = await this.applyViaGenericForm(job);
      }
      
      // Store the result
      this.applicationResults.push(result);
      
      return result;
    } catch (error) {
      console.error(`Error applying to job ${job.id}:`, error);
      
      const result = {
        success: false,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.applicationResults.push(result);
      
      return result;
    }
  }

  /**
   * Detect the application system type based on the URL
   * @param {string} url - Application URL
   * @returns {string} - Application system type
   */
  detectApplicationSystem(url) {
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
    } else {
      return 'generic';
    }
  }

  /**
   * Apply via Workday application system
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaWorkday(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Check if there's an "Apply" button and click it
      const applyButton = await this.page.$('a[data-automation-id="applyNowButton"], button[data-automation-id="applyNowButton"]');
      if (applyButton) {
        await applyButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check if we need to create an account or sign in
      const createAccountButton = await this.page.$('button[data-automation-id="createAccountButton"]');
      if (createAccountButton) {
        // Fill out the create account form
        await this.page.type('input[data-automation-id="email"]', this.userProfile.email);
        await this.page.type('input[data-automation-id="password"]', this.userProfile.password);
        await this.page.type('input[data-automation-id="confirmPassword"]', this.userProfile.password);
        
        await createAccountButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Fill out personal information
      await this.fillWorkdayPersonalInfo();
      
      // Upload resume if there's a resume upload field
      await this.uploadWorkdayResume();
      
      // Fill out work experience
      await this.fillWorkdayWorkExperience();
      
      // Fill out education
      await this.fillWorkdayEducation();
      
      // Fill out skills
      await this.fillWorkdaySkills();
      
      // Fill out additional questions
      await this.fillWorkdayAdditionalQuestions();
      
      // Submit application
      const submitButton = await this.page.$('button[data-automation-id="bottomNavigationSubmit"]');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check for confirmation message
      const confirmationElement = await this.page.$('div[data-automation-id="applicationConfirmationMessage"]');
      const success = !!confirmationElement;
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via Workday:', error);
      throw error;
    }
  }

  /**
   * Fill out personal information in Workday
   */
  async fillWorkdayPersonalInfo() {
    try {
      // Check if we're on the personal information page
      const personalInfoHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!personalInfoHeader) return;
      
      // Fill out first name
      const firstNameField = await this.page.$('input[data-automation-id="firstName"]');
      if (firstNameField) {
        await firstNameField.type(this.userProfile.firstName);
      }
      
      // Fill out last name
      const lastNameField = await this.page.$('input[data-automation-id="lastName"]');
      if (lastNameField) {
        await lastNameField.type(this.userProfile.lastName);
      }
      
      // Fill out address
      const addressLine1Field = await this.page.$('input[data-automation-id="addressLine1"]');
      if (addressLine1Field) {
        await addressLine1Field.type(this.userProfile.address.street);
      }
      
      const cityField = await this.page.$('input[data-automation-id="city"]');
      if (cityField) {
        await cityField.type(this.userProfile.address.city);
      }
      
      // Select state/province
      const stateDropdown = await this.page.$('button[data-automation-id="stateDropdown"]');
      if (stateDropdown) {
        await stateDropdown.click();
        await this.page.waitForSelector(`li[data-automation-id="stateOption-${this.userProfile.address.state}"]`);
        await this.page.click(`li[data-automation-id="stateOption-${this.userProfile.address.state}"]`);
      }
      
      const postalCodeField = await this.page.$('input[data-automation-id="postalCode"]');
      if (postalCodeField) {
        await postalCodeField.type(this.userProfile.address.zipCode);
      }
      
      // Fill out phone number
      const phoneField = await this.page.$('input[data-automation-id="phone"]');
      if (phoneField) {
        await phoneField.type(this.userProfile.phone);
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error filling Workday personal info:', error);
    }
  }

  /**
   * Upload resume in Workday
   */
  async uploadWorkdayResume() {
    try {
      // Check if we're on the resume upload page
      const resumeUploadHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!resumeUploadHeader) return;
      
      // Look for the file input
      const fileInput = await this.page.$('input[type="file"]');
      if (fileInput) {
        // Upload the resume file
        await fileInput.uploadFile(this.userProfile.resumePath);
        
        // Wait for upload to complete
        await this.page.waitForSelector('div[data-automation-id="uploadedFile"]');
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error uploading Workday resume:', error);
    }
  }

  /**
   * Fill out work experience in Workday
   */
  async fillWorkdayWorkExperience() {
    try {
      // Check if we're on the work experience page
      const workExpHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!workExpHeader) return;
      
      // For each work experience in the profile
      for (const experience of this.userProfile.workExperience) {
        // Click add experience button
        const addButton = await this.page.$('button[data-automation-id="addExperienceButton"]');
        if (addButton) {
          await addButton.click();
          await this.page.waitForSelector('input[data-automation-id="jobTitle"]');
        }
        
        // Fill out job title
        const jobTitleField = await this.page.$('input[data-automation-id="jobTitle"]');
        if (jobTitleField) {
          await jobTitleField.type(experience.title);
        }
        
        // Fill out company
        const companyField = await this.page.$('input[data-automation-id="company"]');
        if (companyField) {
          await companyField.type(experience.company);
        }
        
        // Fill out location
        const locationField = await this.page.$('input[data-automation-id="location"]');
        if (locationField) {
          await locationField.type(experience.location);
        }
        
        // Fill out start date
        const startDateField = await this.page.$('input[data-automation-id="startDate"]');
        if (startDateField) {
          await startDateField.type(experience.startDate);
        }
        
        // Fill out end date or check current position
        if (experience.current) {
          const currentCheckbox = await this.page.$('input[data-automation-id="currentPosition"]');
          if (currentCheckbox) {
            await currentCheckbox.click();
          }
        } else {
          const endDateField = await this.page.$('input[data-automation-id="endDate"]');
          if (endDateField) {
            await endDateField.type(experience.endDate);
          }
        }
        
        // Fill out description
        const descriptionField = await this.page.$('textarea[data-automation-id="description"]');
        if (descriptionField) {
          await descriptionField.type(experience.description);
        }
        
        // Save this experience
        const saveButton = await this.page.$('button[data-automation-id="saveExperience"]');
        if (saveButton) {
          await saveButton.click();
          await this.page.waitForSelector('div[data-automation-id="experienceItem"]');
        }
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error filling Workday work experience:', error);
    }
  }

  /**
   * Fill out education in Workday
   */
  async fillWorkdayEducation() {
    try {
      // Check if we're on the education page
      const educationHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!educationHeader) return;
      
      // For each education in the profile
      for (const education of this.userProfile.education) {
        // Click add education button
        const addButton = await this.page.$('button[data-automation-id="addEducationButton"]');
        if (addButton) {
          await addButton.click();
          await this.page.waitForSelector('input[data-automation-id="school"]');
        }
        
        // Fill out school
        const schoolField = await this.page.$('input[data-automation-id="school"]');
        if (schoolField) {
          await schoolField.type(education.school);
        }
        
        // Fill out degree
        const degreeField = await this.page.$('input[data-automation-id="degree"]');
        if (degreeField) {
          await degreeField.type(education.degree);
        }
        
        // Fill out field of study
        const fieldOfStudyField = await this.page.$('input[data-automation-id="fieldOfStudy"]');
        if (fieldOfStudyField) {
          await fieldOfStudyField.type(education.fieldOfStudy);
        }
        
        // Fill out graduation date
        const gradDateField = await this.page.$('input[data-automation-id="graduationDate"]');
        if (gradDateField) {
          await gradDateField.type(education.graduationDate);
        }
        
        // Save this education
        const saveButton = await this.page.$('button[data-automation-id="saveEducation"]');
        if (saveButton) {
          await saveButton.click();
          await this.page.waitForSelector('div[data-automation-id="educationItem"]');
        }
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error filling Workday education:', error);
    }
  }

  /**
   * Fill out skills in Workday
   */
  async fillWorkdaySkills() {
    try {
      // Check if we're on the skills page
      const skillsHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!skillsHeader) return;
      
      // For each skill in the profile
      for (const skill of this.userProfile.skills) {
        // Click add skill button
        const addButton = await this.page.$('button[data-automation-id="addSkillButton"]');
        if (addButton) {
          await addButton.click();
          await this.page.waitForSelector('input[data-automation-id="skill"]');
        }
        
        // Fill out skill
        const skillField = await this.page.$('input[data-automation-id="skill"]');
        if (skillField) {
          await skillField.type(skill);
        }
        
        // Save this skill
        const saveButton = await this.page.$('button[data-automation-id="saveSkill"]');
        if (saveButton) {
          await saveButton.click();
          await this.page.waitForSelector('div[data-automation-id="skillItem"]');
        }
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error filling Workday skills:', error);
    }
  }

  /**
   * Fill out additional questions in Workday
   */
  async fillWorkdayAdditionalQuestions() {
    try {
      // Check if we're on the additional questions page
      const questionsHeader = await this.page.$('h2[data-automation-id="formHeader"]');
      if (!questionsHeader) return;
      
      // Get all questions
      const questions = await this.page.$$('div[data-automation-id="formField"]');
      
      for (const question of questions) {
        // Get the question text
        const questionText = await question.$eval('label', el => el.textContent.trim());
        
        // Handle different question types based on the question text
        if (questionText.includes('relocate') || questionText.includes('Relocate')) {
          // Relocation question
          if (this.userProfile.willingToRelocate) {
            await question.$eval('input[value="Yes"]', el => el.click());
          } else {
            await question.$eval('input[value="No"]', el => el.click());
          }
        } else if (questionText.includes('visa') || questionText.includes('Visa') || 
                  questionText.includes('legally') || questionText.includes('authorized')) {
          // Work authorization question
          if (this.userProfile.workAuthorization) {
            await question.$eval('input[value="Yes"]', el => el.click());
          } else {
            await question.$eval('input[value="No"]', el => el.click());
          }
        } else if (questionText.includes('salary') || questionText.includes('Salary') || 
                  questionText.includes('compensation')) {
          // Salary expectation question
          const inputField = await question.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.salaryExpectation.toString());
          }
        } else if (questionText.includes('start') || questionText.includes('Start') || 
                  questionText.includes('available')) {
          // Start date question
          const inputField = await question.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.availableStartDate);
          }
        } else if (questionText.includes('referral') || questionText.includes('Referral') || 
                  questionText.includes('hear about')) {
          // Referral source question
          const inputField = await question.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.referralSource);
          }
        } else {
          // Generic question - try to answer yes to positive questions
          if (questionText.includes('willing') || questionText.includes('able') || 
              questionText.includes('can you')) {
            const yesOption = await question.$('input[value="Yes"]');
            if (yesOption) {
              await yesOption.click();
            }
          }
        }
      }
      
      // Click next button
      const nextButton = await this.page.$('button[data-automation-id="bottomNavigationNext"]');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
    } catch (error) {
      console.error('Error filling Workday additional questions:', error);
    }
  }

  /**
   * Apply via Greenhouse application system
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaGreenhouse(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Fill out name
      const firstNameField = await this.page.$('#first_name');
      if (firstNameField) {
        await firstNameField.type(this.userProfile.firstName);
      }
      
      const lastNameField = await this.page.$('#last_name');
      if (lastNameField) {
        await lastNameField.type(this.userProfile.lastName);
      }
      
      // Fill out email
      const emailField = await this.page.$('#email');
      if (emailField) {
        await emailField.type(this.userProfile.email);
      }
      
      // Fill out phone
      const phoneField = await this.page.$('#phone');
      if (phoneField) {
        await phoneField.type(this.userProfile.phone);
      }
      
      // Upload resume
      const resumeInput = await this.page.$('#resume');
      if (resumeInput) {
        await resumeInput.uploadFile(this.userProfile.resumePath);
      }
      
      // Fill out cover letter if there's a field for it
      const coverLetterField = await this.page.$('#cover_letter');
      if (coverLetterField) {
        const coverLetter = this.generateCoverLetter(job);
        await coverLetterField.type(coverLetter);
      }
      
      // Fill out LinkedIn URL if there's a field for it
      const linkedinField = await this.page.$('input[name="job_application[answers_attributes][0][text_value]"]');
      if (linkedinField) {
        await linkedinField.type(this.userProfile.linkedinUrl);
      }
      
      // Fill out additional questions
      await this.fillGreenhouseAdditionalQuestions();
      
      // Submit application
      const submitButton = await this.page.$('#submit_app');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check for confirmation message
      const confirmationElement = await this.page.$('.application-confirmation');
      const success = !!confirmationElement;
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via Greenhouse:', error);
      throw error;
    }
  }

  /**
   * Fill out additional questions in Greenhouse
   */
  async fillGreenhouseAdditionalQuestions() {
    try {
      // Get all question fields
      const questionFields = await this.page.$$('.field');
      
      for (const field of questionFields) {
        // Get the question label
        const labelElement = await field.$('label');
        if (!labelElement) continue;
        
        const questionText = await labelElement.evaluate(el => el.textContent.trim());
        
        // Handle different question types based on the question text
        if (questionText.includes('relocate') || questionText.includes('Relocate')) {
          // Relocation question
          const yesOption = await field.$('input[value="Yes"]');
          const noOption = await field.$('input[value="No"]');
          
          if (this.userProfile.willingToRelocate && yesOption) {
            await yesOption.click();
          } else if (noOption) {
            await noOption.click();
          }
        } else if (questionText.includes('visa') || questionText.includes('Visa') || 
                  questionText.includes('legally') || questionText.includes('authorized')) {
          // Work authorization question
          const yesOption = await field.$('input[value="Yes"]');
          const noOption = await field.$('input[value="No"]');
          
          if (this.userProfile.workAuthorization && yesOption) {
            await yesOption.click();
          } else if (noOption) {
            await noOption.click();
          }
        } else if (questionText.includes('salary') || questionText.includes('Salary') || 
                  questionText.includes('compensation')) {
          // Salary expectation question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.salaryExpectation.toString());
          }
        } else if (questionText.includes('start') || questionText.includes('Start') || 
                  questionText.includes('available')) {
          // Start date question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.availableStartDate);
          }
        } else if (questionText.includes('referral') || questionText.includes('Referral') || 
                  questionText.includes('hear about')) {
          // Referral source question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.referralSource);
          }
        } else {
          // Generic question - try to answer yes to positive questions
          if (questionText.includes('willing') || questionText.includes('able') || 
              questionText.includes('can you')) {
            const yesOption = await field.$('input[value="Yes"]');
            if (yesOption) {
              await yesOption.click();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error filling Greenhouse additional questions:', error);
    }
  }

  /**
   * Apply via Lever application system
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaLever(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Fill out name
      const nameField = await this.page.$('input[name="name"]');
      if (nameField) {
        await nameField.type(`${this.userProfile.firstName} ${this.userProfile.lastName}`);
      }
      
      // Fill out email
      const emailField = await this.page.$('input[name="email"]');
      if (emailField) {
        await emailField.type(this.userProfile.email);
      }
      
      // Fill out phone
      const phoneField = await this.page.$('input[name="phone"]');
      if (phoneField) {
        await phoneField.type(this.userProfile.phone);
      }
      
      // Fill out company
      const companyField = await this.page.$('input[name="org"]');
      if (companyField) {
        await companyField.type(this.userProfile.currentCompany);
      }
      
      // Upload resume
      const resumeInput = await this.page.$('input[name="resume"]');
      if (resumeInput) {
        await resumeInput.uploadFile(this.userProfile.resumePath);
      }
      
      // Fill out LinkedIn URL
      const linkedinField = await this.page.$('input[name="urls[LinkedIn]"]');
      if (linkedinField) {
        await linkedinField.type(this.userProfile.linkedinUrl);
      }
      
      // Fill out cover letter if there's a field for it
      const coverLetterField = await this.page.$('textarea[name="comments"]');
      if (coverLetterField) {
        const coverLetter = this.generateCoverLetter(job);
        await coverLetterField.type(coverLetter);
      }
      
      // Fill out additional questions
      await this.fillLeverAdditionalQuestions();
      
      // Submit application
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check for confirmation message
      const confirmationElement = await this.page.$('.confirmation-heading');
      const success = !!confirmationElement;
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via Lever:', error);
      throw error;
    }
  }

  /**
   * Fill out additional questions in Lever
   */
  async fillLeverAdditionalQuestions() {
    try {
      // Get all custom question fields
      const customFields = await this.page.$$('.application-field');
      
      for (const field of customFields) {
        // Get the question label
        const labelElement = await field.$('.application-label');
        if (!labelElement) continue;
        
        const questionText = await labelElement.evaluate(el => el.textContent.trim());
        
        // Handle different question types based on the question text
        if (questionText.includes('relocate') || questionText.includes('Relocate')) {
          // Relocation question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.willingToRelocate ? 'Yes' : 'No');
          }
        } else if (questionText.includes('visa') || questionText.includes('Visa') || 
                  questionText.includes('legally') || questionText.includes('authorized')) {
          // Work authorization question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.workAuthorization ? 'Yes' : 'No');
          }
        } else if (questionText.includes('salary') || questionText.includes('Salary') || 
                  questionText.includes('compensation')) {
          // Salary expectation question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.salaryExpectation.toString());
          }
        } else if (questionText.includes('start') || questionText.includes('Start') || 
                  questionText.includes('available')) {
          // Start date question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.availableStartDate);
          }
        } else if (questionText.includes('referral') || questionText.includes('Referral') || 
                  questionText.includes('hear about')) {
          // Referral source question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.referralSource);
          }
        } else {
          // Generic question - try to answer yes to positive questions
          if (questionText.includes('willing') || questionText.includes('able') || 
              questionText.includes('can you')) {
            const inputField = await field.$('input[type="text"]');
            if (inputField) {
              await inputField.type('Yes');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error filling Lever additional questions:', error);
    }
  }

  /**
   * Apply via Indeed application system
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaIndeed(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Check if we need to sign in
      const signInButton = await this.page.$('#login-submit-button');
      if (signInButton) {
        // Fill out email
        const emailField = await this.page.$('#login-email-input');
        if (emailField) {
          await emailField.type(this.userProfile.email);
        }
        
        // Fill out password
        const passwordField = await this.page.$('#login-password-input');
        if (passwordField) {
          await passwordField.type(this.userProfile.password);
        }
        
        // Click sign in
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check if we're on the application page
      const applyButton = await this.page.$('#indeedApplyButton');
      if (applyButton) {
        await applyButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Fill out application form
      await this.fillIndeedApplicationForm();
      
      // Submit application
      const submitButton = await this.page.$('#form-action-submit');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check for confirmation message
      const confirmationElement = await this.page.$('.ia-ApplyFormConfirmation');
      const success = !!confirmationElement;
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via Indeed:', error);
      throw error;
    }
  }

  /**
   * Fill out Indeed application form
   */
  async fillIndeedApplicationForm() {
    try {
      // Fill out name if needed
      const nameField = await this.page.$('#input-applicant\\.name');
      if (nameField) {
        await nameField.type(`${this.userProfile.firstName} ${this.userProfile.lastName}`);
      }
      
      // Fill out email if needed
      const emailField = await this.page.$('#input-applicant\\.email');
      if (emailField) {
        await emailField.type(this.userProfile.email);
      }
      
      // Fill out phone if needed
      const phoneField = await this.page.$('#input-applicant\\.phone');
      if (phoneField) {
        await phoneField.type(this.userProfile.phone);
      }
      
      // Upload resume if needed
      const resumeUploadButton = await this.page.$('#resume-upload-button');
      if (resumeUploadButton) {
        const fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(this.userProfile.resumePath);
          await this.page.waitForSelector('.ia-FilePicker-fileName');
        }
      }
      
      // Fill out additional questions
      const questionFields = await this.page.$$('.ia-Questions-item');
      
      for (const field of questionFields) {
        // Get the question text
        const questionElement = await field.$('.ia-Questions-item-label');
        if (!questionElement) continue;
        
        const questionText = await questionElement.evaluate(el => el.textContent.trim());
        
        // Handle different question types based on the question text
        if (questionText.includes('relocate') || questionText.includes('Relocate')) {
          // Relocation question
          const yesOption = await field.$('input[value="Yes"]');
          const noOption = await field.$('input[value="No"]');
          
          if (this.userProfile.willingToRelocate && yesOption) {
            await yesOption.click();
          } else if (noOption) {
            await noOption.click();
          }
        } else if (questionText.includes('visa') || questionText.includes('Visa') || 
                  questionText.includes('legally') || questionText.includes('authorized')) {
          // Work authorization question
          const yesOption = await field.$('input[value="Yes"]');
          const noOption = await field.$('input[value="No"]');
          
          if (this.userProfile.workAuthorization && yesOption) {
            await yesOption.click();
          } else if (noOption) {
            await noOption.click();
          }
        } else if (questionText.includes('salary') || questionText.includes('Salary') || 
                  questionText.includes('compensation')) {
          // Salary expectation question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.salaryExpectation.toString());
          }
        } else if (questionText.includes('start') || questionText.includes('Start') || 
                  questionText.includes('available')) {
          // Start date question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.availableStartDate);
          }
        } else if (questionText.includes('years') || questionText.includes('Years') || 
                  questionText.includes('experience')) {
          // Years of experience question
          const inputField = await field.$('input[type="text"]');
          if (inputField) {
            await inputField.type(this.userProfile.yearsOfExperience.toString());
          }
        } else {
          // Generic question - try to answer yes to positive questions
          if (questionText.includes('willing') || questionText.includes('able') || 
              questionText.includes('can you')) {
            const yesOption = await field.$('input[value="Yes"]');
            if (yesOption) {
              await yesOption.click();
            }
          }
        }
      }
      
      // Click continue button if there is one
      const continueButton = await this.page.$('#form-action-continue');
      if (continueButton) {
        await continueButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Fill out any additional pages
        await this.fillIndeedApplicationForm();
      }
    } catch (error) {
      console.error('Error filling Indeed application form:', error);
    }
  }

  /**
   * Apply via LinkedIn application system
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaLinkedIn(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Check if we need to sign in
      const signInButton = await this.page.$('.sign-in-form__submit-button');
      if (signInButton) {
        // Fill out email
        const emailField = await this.page.$('#username');
        if (emailField) {
          await emailField.type(this.userProfile.email);
        }
        
        // Fill out password
        const passwordField = await this.page.$('#password');
        if (passwordField) {
          await passwordField.type(this.userProfile.password);
        }
        
        // Click sign in
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Check if we're on the job page and need to click apply
      const applyButton = await this.page.$('.jobs-apply-button');
      if (applyButton) {
        await applyButton.click();
        await this.page.waitForSelector('.jobs-easy-apply-content');
      }
      
      // Fill out application steps
      let currentStep = 1;
      let maxSteps = 5; // Prevent infinite loop
      
      while (currentStep <= maxSteps) {
        // Check if we're on the contact info step
        const contactInfoSection = await this.page.$('#jobs-apply-header');
        if (contactInfoSection) {
          await this.fillLinkedInContactInfo();
        }
        
        // Check if we're on the resume upload step
        const resumeSection = await this.page.$('.jobs-document-upload-redesign-container');
        if (resumeSection) {
          await this.uploadLinkedInResume();
        }
        
        // Check if we're on the additional questions step
        const questionsSection = await this.page.$('.jobs-easy-apply-form-section__grouping');
        if (questionsSection) {
          await this.fillLinkedInAdditionalQuestions();
        }
        
        // Check for next button
        const nextButton = await this.page.$('.artdeco-button--primary');
        if (nextButton) {
          const buttonText = await nextButton.evaluate(el => el.textContent.trim());
          
          if (buttonText.includes('Submit') || buttonText.includes('Apply')) {
            // This is the final submit button
            await nextButton.click();
            await this.page.waitForSelector('.artdeco-modal__dismiss', { timeout: 5000 }).catch(() => {});
            break;
          } else {
            // This is a next button
            await nextButton.click();
            await this.page.waitForTimeout(1000); // Wait for next step to load
          }
        } else {
          // No next button found, we might be done
          break;
        }
        
        currentStep++;
      }
      
      // Check for confirmation message
      const confirmationElement = await this.page.$('.artdeco-modal__content');
      const success = confirmationElement ? await confirmationElement.evaluate(el => el.textContent.includes('applied')) : false;
      
      // Close the confirmation dialog if it exists
      const dismissButton = await this.page.$('.artdeco-modal__dismiss');
      if (dismissButton) {
        await dismissButton.click();
      }
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Fill out LinkedIn contact info
   */
  async fillLinkedInContactInfo() {
    try {
      // Fill out phone if needed
      const phoneField = await this.page.$('input[name="phoneNumber"]');
      if (phoneField) {
        await phoneField.evaluate(el => el.value = ''); // Clear existing value
        await phoneField.type(this.userProfile.phone);
      }
      
      // Fill out email if needed
      const emailField = await this.page.$('input[name="email"]');
      if (emailField) {
        await emailField.evaluate(el => el.value = ''); // Clear existing value
        await emailField.type(this.userProfile.email);
      }
    } catch (error) {
      console.error('Error filling LinkedIn contact info:', error);
    }
  }

  /**
   * Upload resume to LinkedIn
   */
  async uploadLinkedInResume() {
    try {
      // Check if there's a resume upload button
      const uploadButton = await this.page.$('.jobs-document-upload-redesign__upload-button');
      if (uploadButton) {
        // Find the file input
        const fileInput = await this.page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(this.userProfile.resumePath);
          await this.page.waitForSelector('.jobs-document-upload-redesign__file-name');
        }
      }
    } catch (error) {
      console.error('Error uploading LinkedIn resume:', error);
    }
  }

  /**
   * Fill out LinkedIn additional questions
   */
  async fillLinkedInAdditionalQuestions() {
    try {
      // Get all form fields
      const formFields = await this.page.$$('.jobs-easy-apply-form-element');
      
      for (const field of formFields) {
        // Get the label text
        const labelElement = await field.$('.artdeco-text-input--label');
        if (!labelElement) continue;
        
        const labelText = await labelElement.evaluate(el => el.textContent.trim());
        
        // Check field type
        const textInput = await field.$('input[type="text"]');
        const textArea = await field.$('textarea');
        const selectInput = await field.$('select');
        const radioInputs = await field.$$('input[type="radio"]');
        const checkboxInputs = await field.$$('input[type="checkbox"]');
        
        if (textInput) {
          // Text input field
          if (labelText.includes('years') || labelText.includes('Years') || 
              labelText.includes('experience')) {
            await textInput.evaluate(el => el.value = ''); // Clear existing value
            await textInput.type(this.userProfile.yearsOfExperience.toString());
          } else if (labelText.includes('salary') || labelText.includes('Salary') || 
                    labelText.includes('compensation')) {
            await textInput.evaluate(el => el.value = ''); // Clear existing value
            await textInput.type(this.userProfile.salaryExpectation.toString());
          } else if (labelText.includes('website') || labelText.includes('Website') || 
                    labelText.includes('portfolio')) {
            await textInput.evaluate(el => el.value = ''); // Clear existing value
            await textInput.type(this.userProfile.websiteUrl);
          } else {
            // Generic text input
            await textInput.evaluate(el => el.value = ''); // Clear existing value
            await textInput.type('Yes');
          }
        } else if (textArea) {
          // Text area field
          if (labelText.includes('cover') || labelText.includes('Cover') || 
              labelText.includes('introduction')) {
            await textArea.evaluate(el => el.value = ''); // Clear existing value
            await textArea.type(this.userProfile.coverLetterSummary);
          } else {
            // Generic text area
            await textArea.evaluate(el => el.value = ''); // Clear existing value
            await textArea.type('Yes, I am interested and qualified for this position.');
          }
        } else if (selectInput) {
          // Select dropdown
          if (labelText.includes('years') || labelText.includes('Years') || 
              labelText.includes('experience')) {
            // Years of experience dropdown
            await selectInput.select(this.userProfile.yearsOfExperience.toString());
          } else if (labelText.includes('education') || labelText.includes('Education') || 
                    labelText.includes('degree')) {
            // Education level dropdown
            await selectInput.select(this.userProfile.highestEducation);
          } else if (labelText.includes('notice') || labelText.includes('Notice')) {
            // Notice period dropdown
            await selectInput.select('2 weeks');
          } else {
            // Generic dropdown - select first option
            const options = await selectInput.$$('option');
            if (options.length > 1) {
              const optionValue = await options[1].evaluate(el => el.value);
              await selectInput.select(optionValue);
            }
          }
        } else if (radioInputs.length > 0) {
          // Radio buttons
          if (labelText.includes('relocate') || labelText.includes('Relocate')) {
            // Relocation question
            if (this.userProfile.willingToRelocate) {
              await radioInputs[0].click(); // Yes
            } else {
              await radioInputs[1].click(); // No
            }
          } else if (labelText.includes('visa') || labelText.includes('Visa') || 
                    labelText.includes('legally') || labelText.includes('authorized')) {
            // Work authorization question
            if (this.userProfile.workAuthorization) {
              await radioInputs[0].click(); // Yes
            } else {
              await radioInputs[1].click(); // No
            }
          } else {
            // Generic radio buttons - select Yes or first option
            await radioInputs[0].click();
          }
        } else if (checkboxInputs.length > 0) {
          // Checkbox inputs - select first one
          await checkboxInputs[0].click();
        }
      }
    } catch (error) {
      console.error('Error filling LinkedIn additional questions:', error);
    }
  }

  /**
   * Apply via generic application form
   * @param {Object} job - Job details
   * @returns {Object} - Application result
   */
  async applyViaGenericForm(job) {
    try {
      await this.page.goto(job.applicationUrl, { waitUntil: 'networkidle2' });
      
      // Look for common form fields
      const nameFields = await this.page.$$('input[name*="name"], input[id*="name"], input[placeholder*="name"]');
      const emailFields = await this.page.$$('input[type="email"], input[name*="email"], input[id*="email"]');
      const phoneFields = await this.page.$$('input[type="tel"], input[name*="phone"], input[id*="phone"]');
      const resumeFields = await this.page.$$('input[type="file"], input[name*="resume"], input[id*="resume"]');
      const coverLetterFields = await this.page.$$('textarea[name*="cover"], textarea[id*="cover"]');
      const submitButtons = await this.page.$$('button[type="submit"], input[type="submit"]');
      
      // Fill out name fields
      for (const field of nameFields) {
        await field.type(`${this.userProfile.firstName} ${this.userProfile.lastName}`);
      }
      
      // Fill out email fields
      for (const field of emailFields) {
        await field.type(this.userProfile.email);
      }
      
      // Fill out phone fields
      for (const field of phoneFields) {
        await field.type(this.userProfile.phone);
      }
      
      // Upload resume
      for (const field of resumeFields) {
        await field.uploadFile(this.userProfile.resumePath);
      }
      
      // Fill out cover letter
      for (const field of coverLetterFields) {
        const coverLetter = this.generateCoverLetter(job);
        await field.type(coverLetter);
      }
      
      // Submit form
      if (submitButtons.length > 0) {
        await submitButtons[0].click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
      }
      
      // Check for common confirmation indicators
      const confirmationTexts = ['thank you', 'application received', 'successfully', 'submitted'];
      const pageContent = await this.page.content();
      const success = confirmationTexts.some(text => pageContent.toLowerCase().includes(text));
      
      return {
        success,
        jobId: job.id,
        company: job.company.name,
        title: job.title,
        applicationUrl: job.applicationUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error applying via generic form:', error);
      throw error;
    }
  }

  /**
   * Generate a cover letter for a job
   * @param {Object} job - Job details
   * @returns {string} - Generated cover letter
   */
  generateCoverLetter(job) {
    // Replace placeholders in the cover letter template
    let coverLetter = this.userProfile.coverLetterTemplate;
    
    coverLetter = coverLetter.replace(/\[Your Name\]/g, `${this.userProfile.firstName} ${this.userProfile.lastName}`);
    coverLetter = coverLetter.replace(/\[Your Address\]/g, this.userProfile.address.street);
    coverLetter = coverLetter.replace(/\[City, State ZIP\]/g, `${this.userProfile.address.city}, ${this.userProfile.address.state} ${this.userProfile.address.zipCode}`);
    coverLetter = coverLetter.replace(/\[Your Email\]/g, this.userProfile.email);
    coverLetter = coverLetter.replace(/\[Your Phone\]/g, this.userProfile.phone);
    
    // Add current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    coverLetter = coverLetter.replace(/\[Date\]/g, currentDate);
    
    // Replace job-specific placeholders
    coverLetter = coverLetter.replace(/\[Hiring Manager's Name\]/g, 'Hiring Manager');
    coverLetter = coverLetter.replace(/\[Company Name\]/g, job.company.name);
    coverLetter = coverLetter.replace(/\[Company Address\]/g, '');
    coverLetter = coverLetter.replace(/\[Job Title\]/g, job.title);
    
    return coverLetter;
  }

  /**
   * Get application results
   * @returns {Array} - Array of application results
   */
  getApplicationResults() {
    return this.applicationResults;
  }
}

module.exports = AutomatedJobApplicant;
