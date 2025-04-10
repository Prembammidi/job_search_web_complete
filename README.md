# Job Search Automation Web Application

This web application automates the process of searching for data engineering jobs and applying to them, even on complex application portals like Workday.

## Features

- **Automated Job Search**: Scrapes multiple job portals (LinkedIn, Indeed, Glassdoor) for data engineering positions
- **Intelligent Filtering**: Focuses on jobs posted within the last 2 hours to be among the first applicants
- **Automated Application**: Automatically fills out application forms on various job portals including Workday
- **Secure Credential Management**: Safely stores encrypted credentials for different job portals
- **Application Tracking**: Monitors the status of all your job applications in one place
- **Resume & Cover Letter Management**: Stores and automatically submits your resume and customized cover letters

## Technical Architecture

### Backend
- Node.js with Express
- MongoDB database
- Puppeteer for web automation
- AES-256 encryption for credential security

### Frontend
- React with TypeScript
- Material UI components
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites
- Node.js 14+ installed
- MongoDB database (local or cloud)
- Modern web browser

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/job-search-automation.git
cd job-search-automation
```

2. Install dependencies
```
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/job_search_db
JWT_SECRET=your_jwt_secret_key
CREDENTIAL_ENCRYPTION_KEY=64_character_hex_string_for_aes_256_encryption
NODE_ENV=development
```

4. Start the development servers
```
# Start backend server
cd backend
npm run dev

# In a separate terminal, start frontend server
cd frontend
npm start
```

5. Access the application at http://localhost:3000

## Usage Guide

### Setting Up Your Profile

1. Register for an account
2. Complete your profile with personal information
3. Upload your resume (PDF, DOC, or DOCX format)
4. Create a cover letter template with placeholders for company and job details

### Adding Portal Credentials

1. Go to the Credentials section
2. Add your login credentials for job portals (LinkedIn, Indeed, etc.)
3. These credentials will be securely encrypted and used for automated applications

### Searching for Jobs

1. Go to the Jobs section
2. Enter search criteria (keywords, location, etc.)
3. Specify if you want remote positions only
4. Set the time range (default is jobs posted in the last 2 hours)
5. Review the search results

### Applying to Jobs

#### Single Application
1. View a job's details
2. Click "Apply Automatically"
3. The system will navigate to the job portal and complete the application

#### Batch Application
1. Select multiple jobs from search results
2. Click "Apply to Selected"
3. Monitor the batch application progress

### Tracking Applications

1. Go to the Applications section
2. View all your applications and their statuses
3. Update application statuses as you progress through interviews

## Security

- All portal credentials are encrypted using AES-256 encryption
- Passwords are never stored in plain text
- JWT authentication protects all API endpoints
- HTTPS encryption for all data transmission

## Troubleshooting

### Common Issues

1. **Application Fails**: Some job portals may change their structure. Try applying manually and report the issue.

2. **Credential Errors**: Ensure your stored credentials for the portal are correct and up-to-date.

3. **Resume Upload Fails**: Make sure your resume is in PDF, DOC, or DOCX format and under 5MB.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
