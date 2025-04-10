import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

// API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Profile: React.FC = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    coverLetterTemplate: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    coverLetterTemplate: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  
  // Load user profile data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        coverLetterTemplate: user.coverLetterTemplate || defaultCoverLetterTemplate
      });
    }
  }, [user]);
  
  const validateForm = () => {
    let valid = true;
    const errors = {
      firstName: '',
      lastName: '',
      coverLetterTemplate: ''
    };
    
    if (!formData.firstName) {
      errors.firstName = 'First name is required';
      valid = false;
    }
    
    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
      valid = false;
    }
    
    if (!formData.coverLetterTemplate) {
      errors.coverLetterTemplate = 'Cover letter template is required';
      valid = false;
    }
    
    setFormErrors(errors);
    return valid;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear success message when user starts typing
    if (success) setSuccess(null);
    if (error) setError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      try {
        const response = await axios.put(`${API_URL}/profile`, formData);
        
        if (response.data.status === 'success') {
          setSuccess('Profile updated successfully');
        } else {
          setError('Failed to update profile');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error updating profile');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
      setResumeError(null);
      setResumeSuccess(null);
    }
  };
  
  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setResumeError('Please select a file to upload');
      return;
    }
    
    // Check file type
    const fileType = resumeFile.type;
    if (fileType !== 'application/pdf' && 
        fileType !== 'application/msword' && 
        fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setResumeError('Only PDF, DOC, and DOCX files are allowed');
      return;
    }
    
    // Check file size (5MB limit)
    if (resumeFile.size > 5 * 1024 * 1024) {
      setResumeError('File size must be less than 5MB');
      return;
    }
    
    setUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);
    
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      const response = await axios.post(`${API_URL}/profile/resume`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.status === 'success') {
        setResumeSuccess('Resume uploaded successfully');
        // Clear file input
        setResumeFile(null);
        const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setResumeError('Failed to upload resume');
      }
    } catch (err: any) {
      setResumeError(err.response?.data?.message || 'Error uploading resume');
    } finally {
      setUploadingResume(false);
    }
  };
  
  // Default cover letter template
  const defaultCoverLetterTemplate = `[Your Name]
[Your Address]
[City, State ZIP]
[Your Email]
[Your Phone]

[Date]

[Hiring Manager's Name]
[Company Name]
[Company Address]
[City, State ZIP]

Dear [Hiring Manager's Name],

I am writing to express my interest in the [Job Title] position at [Company Name]. With my background in data engineering and experience with [relevant skills], I believe I would be a valuable addition to your team.

[Paragraph about your relevant experience and skills]

[Paragraph about why you're interested in the company and position]

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience align with your needs.

Sincerely,

[Your Name]`;

  return (
    <Navbar>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Profile
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Manage your profile and application materials
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                disabled={loading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                disabled={loading}
              />
              
              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resume
            </Typography>
            
            {resumeError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resumeError}
              </Alert>
            )}
            
            {resumeSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {resumeSuccess}
              </Alert>
            )}
            
            <Box sx={{ mb: 2 }}>
              {user?.resumeUrl ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You have uploaded a resume. Upload a new one to replace it.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You haven't uploaded a resume yet. Please upload one to apply for jobs.
                </Alert>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                component="label"
                disabled={uploadingResume}
              >
                Select Resume
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  onChange={handleResumeChange}
                />
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleResumeUpload}
                disabled={!resumeFile || uploadingResume}
              >
                {uploadingResume ? <CircularProgress size={24} /> : 'Upload'}
              </Button>
            </Box>
            
            {resumeFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {resumeFile.name}
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cover Letter Template
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This template will be used to generate customized cover letters for your job applications.
              Use placeholders like [Company Name] and [Job Title] which will be replaced automatically.
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="coverLetterTemplate"
              name="coverLetterTemplate"
              value={formData.coverLetterTemplate}
              onChange={handleChange}
              error={!!formErrors.coverLetterTemplate}
              helperText={formErrors.coverLetterTemplate}
              disabled={loading}
              multiline
              rows={20}
              variant="outlined"
            />
          </Paper>
        </Grid>
      </Grid>
    </Navbar>
  );
};

export default Profile;
