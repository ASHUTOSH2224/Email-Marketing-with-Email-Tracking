import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Link,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import EmailIcon from '@mui/icons-material/Email';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

// Common timezone list
const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Auckland'
];

const EmailSender: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [sector, setSector] = useState('');
  const [state, setState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(new Date());
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAttachment(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setLastError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('recipients_csv', file);
      }
      if (attachment) {
        formData.append('attachment', attachment);
      }
      formData.append('prompt', prompt);
      formData.append('sector', sector);
      formData.append('state', state);
      
      if (scheduleEnabled && scheduledTime) {
        formData.append('scheduled_time', scheduledTime.toISOString());
        formData.append('time_zone', timeZone);
      }

      const endpoint = scheduleEnabled ? API_ENDPOINTS.SCHEDULE_EMAILS : API_ENDPOINTS.SEND_EMAILS;
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setNotification({
        open: true,
        message: scheduleEnabled 
          ? `Emails scheduled successfully for ${scheduledTime?.toLocaleString()}!`
          : `${response.data.message || 'Emails sent'} successfully!`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('Error sending emails:', error);
      
      let errorMessage = '';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.detail || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`;
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        console.log('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check that the backend is running.';
        console.log('Error request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Error: ${error.message}`;
        console.log('Error message:', error.message);
      }
      
      setLastError(errorMessage);
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <EmailIcon color="primary" sx={{ fontSize: 30 }} />
            <Typography variant="h4" component="h1">
              AI-Powered Email Sender
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Upload Recipients CSV
            </Typography>
            <Button
              variant="contained"
              component="label"
              sx={{ mr: 2 }}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleFileChange}
              />
            </Button>
            <Typography variant="body2" component="span" color="textSecondary">
              {file ? file.name : 'No file chosen'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Attach File
            </Typography>
            <Button
              variant="contained"
              component="label"
              sx={{ mr: 2 }}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={handleAttachmentChange}
              />
            </Button>
            <Typography variant="body2" component="span" color="textSecondary">
              {attachment ? attachment.name : 'No file chosen'}
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
              }
              label="Schedule for later"
            />
            
            {scheduleEnabled && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <DateTimePicker
                  label="Schedule Time"
                  value={scheduledTime}
                  onChange={(newValue) => setScheduledTime(newValue)}
                  sx={{ flex: 1 }}
                />
                
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={timeZone}
                    label="Timezone"
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    {TIMEZONES.map((tz: string) => (
                      <MenuItem key={tz} value={tz}>
                        {tz}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              AI Prompt Instructions
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Enter your prompt for LLM..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              helperText="Tell the AI how to personalize emails for your recipients."
            />
          </Box>

          <TextField
            label="Sector"
            fullWidth
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />

          <TextField
            label="State"
            fullWidth
            value={state}
            onChange={(e) => setState(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                {scheduleEnabled ? 'Scheduling...' : 'Sending...'}
              </>
            ) : (
              scheduleEnabled ? 'Schedule Emails' : 'Send Emails'
            )}
          </Button>

          {lastError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Error details: {lastError}
              </Typography>
              <Typography variant="body2">
                Make sure the backend server is running at <Link href="http://localhost:5000" target="_blank">http://localhost:5000</Link>
              </Typography>
            </Alert>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailSender; 