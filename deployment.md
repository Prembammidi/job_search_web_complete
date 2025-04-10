# Deployment Configuration

This file contains the configuration for deploying the Job Search Automation application to a production environment.

## Prerequisites

- Node.js 14+ installed on the server
- MongoDB database (can be hosted on MongoDB Atlas or self-hosted)
- Environment variables properly configured
- Puppeteer dependencies installed on the server

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/job_search_db
JWT_SECRET=your_jwt_secret_key_change_in_production
CREDENTIAL_ENCRYPTION_KEY=64_character_hex_string_for_aes_256_encryption
NODE_ENV=production
```

## Deployment Steps

1. Build the frontend:
   ```
   cd frontend
   npm run build
   ```

2. Install production dependencies:
   ```
   cd backend
   npm install --production
   ```

3. Install Puppeteer dependencies on Ubuntu/Debian:
   ```
   apt-get update && apt-get install -y \
     gconf-service \
     libasound2 \
     libatk1.0-0 \
     libatk-bridge2.0-0 \
     libc6 \
     libcairo2 \
     libcups2 \
     libdbus-1-3 \
     libexpat1 \
     libfontconfig1 \
     libgcc1 \
     libgconf-2-4 \
     libgdk-pixbuf2.0-0 \
     libglib2.0-0 \
     libgtk-3-0 \
     libnspr4 \
     libpango-1.0-0 \
     libpangocairo-1.0-0 \
     libstdc++6 \
     libx11-6 \
     libx11-xcb1 \
     libxcb1 \
     libxcomposite1 \
     libxcursor1 \
     libxdamage1 \
     libxext6 \
     libxfixes3 \
     libxi6 \
     libxrandr2 \
     libxrender1 \
     libxss1 \
     libxtst6 \
     ca-certificates \
     fonts-liberation \
     libappindicator1 \
     libnss3 \
     lsb-release \
     xdg-utils \
     wget
   ```

4. Start the application:
   ```
   cd backend
   node server.js
   ```

## Using Process Manager (PM2)

For production deployments, it's recommended to use PM2:

1. Install PM2:
   ```
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```
   cd backend
   pm2 start server.js --name "job-search-automation"
   ```

3. Configure PM2 to start on system boot:
   ```
   pm2 startup
   pm2 save
   ```

## Deployment to Cloud Platforms

### Heroku

1. Create a Procfile in the root directory:
   ```
   web: cd backend && node server.js
   ```

2. Set up environment variables in Heroku dashboard

3. Deploy using Heroku CLI:
   ```
   heroku create job-search-automation
   git push heroku main
   ```

### AWS Elastic Beanstalk

1. Create an `app.js` file in the root directory that requires the backend server:
   ```javascript
   require('./backend/server.js');
   ```

2. Create a `.ebextensions` directory with configuration files for Puppeteer dependencies

3. Deploy using the EB CLI:
   ```
   eb init
   eb create job-search-automation
   ```

## Security Considerations

1. Ensure the JWT_SECRET and CREDENTIAL_ENCRYPTION_KEY are strong and unique
2. Set up HTTPS using a valid SSL certificate
3. Implement rate limiting to prevent abuse
4. Regularly update dependencies to patch security vulnerabilities
5. Consider using a Web Application Firewall (WAF) for additional protection

## Monitoring

1. Set up application monitoring using tools like New Relic or Datadog
2. Configure error tracking with Sentry or similar services
3. Set up log aggregation for troubleshooting
4. Implement health checks to monitor application status
