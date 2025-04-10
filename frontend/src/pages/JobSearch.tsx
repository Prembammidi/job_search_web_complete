import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Pagination
} from '@mui/material';
import { 
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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
}

const JobSearch: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useState({
    title: '',
    location: '',
    remote: false,
    hours: 2
  });
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const jobsPerPage = 5;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: name === 'remote' ? checked : value
    }));
  };
  
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setError(null);
    setPage(1);
    
    try {
      const response = await axios.get(`${API_URL}/jobs/search`, {
        params: {
          title: searchParams.title,
          location: searchParams.location || undefined,
          remote: searchParams.remote || undefined,
          hours: searchParams.hours
        }
      });
      
      if (response.data.status === 'success') {
        setJobs(response.data.jobs);
        setTotalJobs(response.data.count);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error searching for jobs');
    } finally {
      setLoading(false);
    }
  };
  
  // Load recent jobs on initial render
  useEffect(() => {
    const loadRecentJobs = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/jobs/recent`);
        
        if (response.data.status === 'success') {
          setJobs(response.data.jobs);
          setTotalJobs(response.data.count);
        }
      } catch (err) {
        console.error('Error loading recent jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecentJobs();
  }, []);
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Get current jobs for pagination
  const indexOfLastJob = page * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <Navbar>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Search Jobs
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Find data engineering jobs posted in the last few hours
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box component="form" onSubmit={handleSearch} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Job Title"
                name="title"
                value={searchParams.title}
                onChange={handleChange}
                placeholder="Data Engineer, ETL Developer, etc."
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={searchParams.location}
                onChange={handleChange}
                placeholder="City, State, or Country"
                InputProps={{
                  startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel id="hours-label">Hours Ago</InputLabel>
                <Select
                  labelId="hours-label"
                  name="hours"
                  value={searchParams.hours}
                  label="Hours Ago"
                  onChange={handleSelectChange}
                >
                  <MenuItem value={1}>1 hour</MenuItem>
                  <MenuItem value={2}>2 hours</MenuItem>
                  <MenuItem value={4}>4 hours</MenuItem>
                  <MenuItem value={8}>8 hours</MenuItem>
                  <MenuItem value={24}>24 hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={searchParams.remote}
                    onChange={handleChange}
                    name="remote"
                  />
                }
                label="Remote"
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ height: '100%' }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {loading ? 'Searching...' : `${totalJobs} jobs found`}
        </Typography>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {currentJobs.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">
                No jobs found. Try adjusting your search criteria.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {currentJobs.map((job) => (
                <Grid item xs={12} key={job.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div">
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
                        <Typography variant="body2" color="text.secondary">
                          {job.company.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {job.location}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Posted {formatDate(job.publishedAt)}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {jobs.length > jobsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={Math.ceil(jobs.length / jobsPerPage)} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          )}
        </>
      )}
    </Navbar>
  );
};

export default JobSearch;
