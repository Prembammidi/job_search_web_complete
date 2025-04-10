# Deploy to Render.com

Follow these steps to deploy your Job Search Automation application to Render.com:

## Step 1: Create a MongoDB Atlas Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up or log in
2. Create a new free tier cluster
3. Set up a database user with password authentication
4. Configure network access to allow connections from anywhere (for development)
5. Get your MongoDB connection string (will look like: `mongodb+srv://username:password@cluster.mongodb.net/job_search_db`)

## Step 2: Deploy to Render.com

1. Go to [Render.com](https://render.com/) and sign up or log in
2. Click "New +" and select "Web Service"
3. Choose "Deploy from a Git repository" or "Upload Files"
4. If uploading files, compress this entire directory into a ZIP file and upload it
5. Configure your web service:
   - Name: job-search-automation
   - Environment: Node
   - Build Command: `npm run build`
   - Start Command: `npm start`
6. Add environment variables:
   - MONGODB_URI: Your MongoDB Atlas connection string
   - JWT_SECRET: Will be auto-generated
   - CREDENTIAL_ENCRYPTION_KEY: Will be auto-generated
   - NODE_ENV: production
7. Select the free plan
8. Click "Create Web Service"

## Step 3: Access Your Application

Once deployment is complete, Render will provide a URL for your application (e.g., https://job-search-automation.onrender.com).

Visit this URL in your browser to start using your Job Search Automation application!
