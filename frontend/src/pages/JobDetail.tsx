import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  CircularProgress,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
  Link as MuiLink
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

// API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Job {
  id: string;
  title: string;
  company: {
    name: string;
    logo: string | null;
    website: string | null;
  };
  location: string;
  isRemote: boolean;
  description: string;
  applicationUrl: string;
  publishedAt: string;
  jobType: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  skills?: string[];
}

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/jobs/${id}`);
        
        if (response.data.status === 'success') {
          setJob(response.data.job);
        } else {
          setError('Failed to fetch job details');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error fetching job details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchJobDetails();
    }
  }, [id]);
  
  const handleApply = async () => {
    if (!job) return;
    
    setApplying(true);
    setApplicationSuccess(false);
    setApplicationError(null);
    
    try {
      const response = await axios.post(`${API_URL}/applications`, {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company.name,
        location: job.location,
        applicationUrl: job.applicationUrl,
        jobDescription: job.description,
        isRemote: job.isRemote
      });
      
      if (response.data.status === 'success') {
        setApplicationSuccess(true);
        // Open application URL in new tab
        window.open(job.applicationUrl, '_blank');
      } else {
        setApplicationError('Failed to mark job as applied');
      }
    } catch (err: any) {
      setApplicationError(err.response?.data?.message || 'Error applying to job');
    } finally {
      setApplying(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return 'Not specified';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    });
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `From ${formatter.format(min)}`;
    } else if (max) {
      return `Up to ${formatter.format(max)}`;
    }
    
    return 'Not specified';
  };
  
  return (
    <Navbar>
      <Box sx={{ mb: 4 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/jobs')}
          sx={{ mb: 2 }}
        >
          Back to Search
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Job Details
        </Typography>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : job ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h5" component="div">
                  {job.title}
                </Typography>
                <Box>
                  <Chip 
                    label={job.isRemote ? 'Remote' : 'On-site'} 
                    color={job.isRemote ? 'success' : 'default'} 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                  <Chip 
                    label={job.jobType} 
                    variant="outlined" 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BusinessIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {job.company.name}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {job.location}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Posted {formatDate(job.publishedAt)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Job Description
              </Typography>
              
              <Box 
                dangerouslySetInnerHTML={{ __html: job.description }} 
                sx={{ 
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    marginTop: 2,
                    marginBottom: 1,
                    fontWeight: 500
                  },
                  '& p': {
                    marginBottom: 1.5
                  },
                  '& ul, & ol': {
                    marginLeft: 2,
                    marginBottom: 1.5
                  },
                  '& li': {
                    marginBottom: 0.5
                  }
                }}
              />
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleApply}
                  disabled={applying || applicationSuccess}
                  startIcon={applying ? <CircularProgress size={20} /> : <LaunchIcon />}
                >
                  {applying ? 'Applying...' : applicationSuccess ? 'Applied' : 'Apply Now'}
                </Button>
                
                {applicationSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Job marked as applied! Complete your application on the employer's website.
                  </Alert>
                )}
                
                {applicationError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {applicationError}
                  </Alert>
                )}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Link
                </Typography>
                <MuiLink 
                  href={job.applicationUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  Apply on {job.company.name} <LaunchIcon fontSize="small" sx={{ ml: 0.5 }} />
                </MuiLink>
              </CardContent>
            </Card>
            
            {job.salary && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Salary
                  </Typography>
                  <Typography variant="body1">
                    {formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per year
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            {job.skills && job.skills.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {job.skills.map((skill, index) => (
                      <Chip key={index} label={skill} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">
          Job not found
        </Alert>
      )}
    </Navbar>
  );
};

export default JobDetail;
