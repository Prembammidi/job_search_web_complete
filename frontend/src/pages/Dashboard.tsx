import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Navbar>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Welcome back, {user?.firstName || user?.username}!
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/jobs')}
              >
                Search for Jobs
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/applications')}
              >
                View Applications
              </Button>
              {!user?.profileComplete && (
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={() => navigate('/profile')}
                >
                  Complete Your Profile
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Profile Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Profile Status
            </Typography>
            <Box sx={{ mt: 2 }}>
              {user?.profileComplete ? (
                <>
                  <Typography variant="body1" color="success.main" gutterBottom>
                    Your profile is complete!
                  </Typography>
                  <Typography variant="body2">
                    You're ready to apply for data engineering jobs.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="warning.main" gutterBottom>
                    Your profile is incomplete
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Complete your profile to apply for jobs more efficiently.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate('/profile')}
                  >
                    Complete Profile
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Recent Job Searches */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Job Searches
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No recent searches yet. Start searching for data engineering jobs!
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ mt: 2 }}
                onClick={() => navigate('/jobs')}
              >
                Search Jobs
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Applications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Applications
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No applications yet. Start applying to data engineering jobs!
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ mt: 2 }}
                onClick={() => navigate('/applications')}
              >
                View Applications
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Navbar>
  );
};

export default Dashboard;
