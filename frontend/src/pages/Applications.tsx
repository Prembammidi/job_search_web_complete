import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

// API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Application {
  _id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  applicationUrl: string;
  applicationDate: string;
  status: 'applied' | 'interviewing' | 'rejected' | 'offered' | 'accepted';
  notes: string;
  isRemote: boolean;
  updatedAt: string;
}

const Applications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/applications`);
        
        if (response.data.status === 'success') {
          setApplications(response.data.applications);
        } else {
          setError('Failed to fetch applications');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error fetching applications');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, []);
  
  const handleUpdateClick = (application: Application) => {
    setSelectedApplication(application);
    setUpdateStatus(application.status);
    setUpdateNotes(application.notes || '');
    setDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedApplication(null);
    setUpdateError(null);
  };
  
  const handleUpdateSubmit = async () => {
    if (!selectedApplication) return;
    
    setUpdating(true);
    setUpdateError(null);
    
    try {
      const response = await axios.put(`${API_URL}/applications/${selectedApplication._id}`, {
        status: updateStatus,
        notes: updateNotes
      });
      
      if (response.data.status === 'success') {
        // Update the application in the local state
        setApplications(prevApplications => 
          prevApplications.map(app => 
            app._id === selectedApplication._id 
              ? { ...app, status: updateStatus as any, notes: updateNotes, updatedAt: new Date().toISOString() } 
              : app
          )
        );
        
        handleDialogClose();
      } else {
        setUpdateError('Failed to update application');
      }
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || 'Error updating application');
    } finally {
      setUpdating(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'default';
      case 'interviewing':
        return 'primary';
      case 'rejected':
        return 'error';
      case 'offered':
        return 'success';
      case 'accepted':
        return 'success';
      default:
        return 'default';
    }
  };
  
  return (
    <Navbar>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Applications
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Track and manage your job applications
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : applications.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            You haven't applied to any jobs yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/jobs')}
            sx={{ mt: 2 }}
          >
            Search for Jobs
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="applications table">
            <TableHead>
              <TableRow>
                <TableCell>Job Title</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Applied On</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((application) => (
                <TableRow
                  key={application._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {application.jobTitle}
                  </TableCell>
                  <TableCell>{application.company}</TableCell>
                  <TableCell>
                    {application.location}
                    {application.isRemote && (
                      <Chip 
                        label="Remote" 
                        color="success" 
                        size="small" 
                        sx={{ ml: 1 }} 
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(application.applicationDate)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={application.status.charAt(0).toUpperCase() + application.status.slice(1)} 
                      color={getStatusChipColor(application.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleUpdateClick(application)}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Update Application Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Update Application Status</DialogTitle>
        <DialogContent>
          {updateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {updateError}
            </Alert>
          )}
          
          <DialogContentText sx={{ mb: 2 }}>
            Update the status and notes for your application to {selectedApplication?.jobTitle} at {selectedApplication?.company}.
          </DialogContentText>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              value={updateStatus}
              label="Status"
              onChange={(e) => setUpdateStatus(e.target.value)}
            >
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="interviewing">Interviewing</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="offered">Offered</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            autoFocus
            margin="dense"
            id="notes"
            label="Notes"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={updateNotes}
            onChange={(e) => setUpdateNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleUpdateSubmit} 
            disabled={updating}
            variant="contained"
          >
            {updating ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Navbar>
  );
};

export default Applications;
