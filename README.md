# Marketing Email Automation System

A full-stack application for automating marketing emails with tracking capabilities. The system uses Flask for the backend API, React for the frontend, and MySQL for the database.

## Features

- Automated email generation using AI
- Bulk email sending with attachments
- Email tracking and analytics
- Interactive dashboard with charts and statistics
- Filterable email records by date, sector, and state
- Export functionality to CSV
- Real-time success/failure tracking

## Prerequisites

- Python 3.8+
- Node.js 14+
- MySQL 8.0+
- Git

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Marketing_Model
```

### 2. Backend Setup

1. Create and activate a virtual environment:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory with the following variables:
```env
GROQ_API_KEY=your_groq_api_key
ZOHO_EMAIL=your_zoho_email
ZOHO_APP_PASSWORD=your_zoho_app_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=email_tracking
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

4. Create the MySQL database:
```sql
CREATE DATABASE email_tracking;
```

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

## Running the Application

1. Start the Flask backend server:
```bash
# From the root directory with virtual environment activated
python flask_api.py
```
The backend will run on http://localhost:8000

2. Start the React frontend development server:
```bash
# From the frontend directory
npm start
```
The frontend will run on http://localhost:3000

## Usage

1. Access the web interface at http://localhost:3000
2. Upload your companies data CSV file with the following columns:
   - Name of the Exhibitor (Company Name)
   - Contact Person
   - Email
   - Mobile Number
   - Sector
   - State
   - Profile (Company Description)
3. Add any attachments if needed
4. Configure email filters (optional)
5. Send emails and track their status in the dashboard

## Database Schema

The system uses a MySQL database with the following main table:

```sql
CREATE TABLE email_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    mobile_number VARCHAR(20),
    profile TEXT,
    sector VARCHAR(100),
    state VARCHAR(100),
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    attachment_name VARCHAR(255)
);
```

## Troubleshooting

1. If the backend fails to start:
   - Check if MySQL is running
   - Verify database credentials in `.env`
   - Ensure all required ports are available

2. If emails fail to send:
   - Verify Zoho email credentials
   - Check SMTP server connectivity
   - Review error messages in the tracking dashboard

3. If the frontend can't connect to the backend:
   - Verify the `REACT_APP_API_BASE_URL` in frontend `.env`
   - Check if the backend server is running
   - Ensure CORS is properly configured

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 