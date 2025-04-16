import React, { useState, useEffect } from 'react';
import { getEmailRecords, EmailRecord, EmailRecordFilters } from '../services/emailRecordService';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';

const EmailRecords: React.FC = () => {
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [filters, setFilters] = useState<EmailRecordFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const data = await getEmailRecords(filters);
        setRecords(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch email records');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [filters]);

  const handleDateChange = (field: 'start_date' | 'end_date') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value || undefined
    }));
  };

  const handleFilterChange = (field: keyof EmailRecordFilters) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value || undefined
    }));
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Email Records
      </Typography>

      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <TextField
            label="Start Date"
            type="date"
            value={filters.start_date || ''}
            onChange={handleDateChange('start_date')}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box>
          <TextField
            label="End Date"
            type="date"
            value={filters.end_date || ''}
            onChange={handleDateChange('end_date')}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box>
          <TextField
            select
            label="Sector"
            value={filters.sector || ''}
            onChange={handleFilterChange('sector')}
            fullWidth
          >
            <MenuItem value="">All Sectors</MenuItem>
            <MenuItem value="Technology">Technology</MenuItem>
            <MenuItem value="Healthcare">Healthcare</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="Education">Education</MenuItem>
          </TextField>
        </Box>
        <Box>
          <TextField
            select
            label="State"
            value={filters.state || ''}
            onChange={handleFilterChange('state')}
            fullWidth
          >
            <MenuItem value="">All States</MenuItem>
            <MenuItem value="CA">California</MenuItem>
            <MenuItem value="NY">New York</MenuItem>
            <MenuItem value="TX">Texas</MenuItem>
            <MenuItem value="FL">Florida</MenuItem>
          </TextField>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Recipient Email</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Sent At</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Attachment</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.recipient_email}</TableCell>
                <TableCell>{record.company_name}</TableCell>
                <TableCell>{record.contact_person}</TableCell>
                <TableCell>{record.sector}</TableCell>
                <TableCell>{record.state}</TableCell>
                <TableCell>{new Date(record.sent_at).toLocaleString()}</TableCell>
                <TableCell>
                  {record.success ? (
                    <Typography color="success.main">Success</Typography>
                  ) : (
                    <Typography color="error.main">
                      Failed: {record.error_message}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{record.attachment_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default EmailRecords; 