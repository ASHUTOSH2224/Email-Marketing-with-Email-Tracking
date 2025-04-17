import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EmailTracking from './components/EmailTracking';
import EmailSender from './components/EmailSender';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const theme = createTheme();

const HomePage = () => (
  <Container className="mt-4">
    <h1>Welcome to Marketing Model</h1>
  </Container>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <Navbar bg="dark" variant="dark" expand="lg">
            <Container>
              <Navbar.Brand as={Link} to="/">Marketing Model</Navbar.Brand>
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
