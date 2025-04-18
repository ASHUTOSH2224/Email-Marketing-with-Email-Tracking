import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Box, Card, CardContent, Typography, Grid, Button } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import EmailTracking from './components/EmailTracking';
import EmailSender from './components/EmailSender';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8'
    },
    secondary: {
      main: '#7c3aed',
      light: '#a78bfa',
      dark: '#5b21b6'
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    }
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      '@media (min-width:600px)': {
        fontSize: '3.5rem'
      }
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      '@media (min-width:600px)': {
        fontSize: '2.5rem'
      }
    },
    h4: {
      fontWeight: 600
    },
    h5: {
      fontWeight: 500
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 24px'
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)'
        }
      }
    }
  }
});

const HomePage = () => (
  <Container className="mt-4">
    <Box sx={{ textAlign: 'center', mb: 8, mt: 4 }}>
      <Typography 
        variant="h1" 
        component="h1" 
        gutterBottom 
        className="gradient-text scalixity-brand"
        sx={{ 
          fontWeight: 800,
          letterSpacing: '-0.02em',
          mb: 3
        }}
      >
        SCALIXITY
      </Typography>
      <Typography 
        variant="h2" 
        component="h2" 
        gutterBottom 
        sx={{ 
          fontSize: { xs: '1.75rem', md: '2.25rem' },
          fontWeight: 600,
          color: 'text.primary',
          mb: 2
        }}
      >
        Marketing Model
      </Typography>
      <Typography 
        variant="h5" 
        color="text.secondary" 
        paragraph
        sx={{ 
          maxWidth: '800px',
          mx: 'auto',
          mb: 6
        }}
      >
        Elevate Your Email Marketing with AI-Powered Precision
      </Typography>
    </Box>

    <Grid container spacing={4}>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
          <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
            <EmailIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Smart Email Campaigns
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Create personalized email campaigns powered by AI. Our system automatically generates tailored content for each recipient.
            </Typography>
            <Button
              component={Link}
              to="/sender"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Start Sending
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
          <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
            <TrackChangesIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Real-time Tracking
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Monitor your campaign performance in real-time. Get detailed analytics and insights about email delivery and engagement.
            </Typography>
            <Button
              component={Link}
              to="/tracking"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
          <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
            <AutoGraphIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Smart Scheduling
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Schedule your campaigns for optimal delivery times. Our AI helps you reach your audience when they're most likely to engage.
            </Typography>
            <Button
              component={Link}
              to="/sender"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Schedule Now
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    <Box sx={{ 
      mt: 8, 
      textAlign: 'center', 
      bgcolor: 'background.paper', 
      py: 6, 
      px: 4,
      borderRadius: 4,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
    }}>
      <Typography variant="h4" gutterBottom className="gradient-text">
        Ready to Scale Your Marketing?
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: '600px', mx: 'auto', mb: 4 }}>
        Join SCALIXITY's AI-powered platform and transform your email marketing strategy today.
      </Typography>
      <Button
        component={Link}
        to="/sender"
        variant="contained"
        color="primary"
        size="large"
        sx={{ 
          py: 1.5,
          px: 4,
          fontSize: '1.1rem'
        }}
      >
        Get Started Now
      </Button>
    </Box>
  </Container>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <Navbar bg="dark" variant="dark" expand="lg" className="scalixity-navbar">
            <Container>
              <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                <Typography 
                  variant="h6" 
                  component="span" 
                  className="gradient-text"
                  sx={{ 
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    fontSize: '1.5rem'
                  }}
                >
                  SCALIXITY
                </Typography>
              </Navbar.Brand>
              <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                  <Nav.Link as={Link} to="/">Home</Nav.Link>
                  <Nav.Link as={Link} to="/sender">Send Emails</Nav.Link>
                  <Nav.Link as={Link} to="/tracking">Email Tracking</Nav.Link>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>

          <Container>
            <Routes>
              <Route path="/sender" element={<EmailSender />} />
              <Route path="/tracking" element={<EmailTracking />} />
              <Route path="/" element={<HomePage />} />
            </Routes>
          </Container>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
