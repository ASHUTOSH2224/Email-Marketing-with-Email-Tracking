import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import EmailTracking from './components/EmailTracking';
import EmailSender from './components/EmailSender';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <Router>
      <div>
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

        <Routes>
          <Route path="/sender" element={<EmailSender />} />
          <Route path="/tracking" element={<EmailTracking />} />
          <Route path="/" element={<div className="container mt-4"><h1>Welcome to Marketing Model</h1></div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
