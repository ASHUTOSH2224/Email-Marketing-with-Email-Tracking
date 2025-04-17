from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
import mysql.connector
import pytz

# Load environment variables
load_dotenv()

# Database configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_NAME = os.getenv('DB_NAME', 'email_tracking')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1234')

# Create database URL with mysql.connector
DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# Create engine with explicit dialect arguments
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=True  # Enable SQL logging for debugging
)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class
Base = declarative_base()

# Helper function to get current time in IST
def get_current_time_ist():
    # Get current UTC time
    utc_now = datetime.utcnow()
    # Create UTC timezone object
    utc_tz = pytz.UTC
    # Localize the UTC time
    utc_now = utc_tz.localize(utc_now)
    # Convert to IST
    ist_tz = pytz.timezone('Asia/Kolkata')
    ist_now = utc_now.astimezone(ist_tz)
    # Return naive datetime in IST
    return ist_now.replace(tzinfo=None)

def drop_tables():
    """Drop all tables"""
    Base.metadata.drop_all(bind=engine)

def recreate_tables():
    """Drop and recreate all tables"""
    print("Dropping all tables...")
    drop_tables()
    print("Creating tables...")
    create_tables()
    print("Tables recreated successfully")

class EmailRecord(Base):
    __tablename__ = "email_records"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False)
    company_name = Column(String(255))
    contact_person = Column(String(255))
    mobile_number = Column(String(20))
    profile = Column(Text)
    sector = Column(String(100))
    state = Column(String(100))
    sent_at = Column(DateTime, default=get_current_time_ist)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    attachment_name = Column(String(255), nullable=True)

class ScheduledEmail(Base):
    __tablename__ = 'scheduled_emails'

    id = Column(Integer, primary_key=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    recipient_csv_data = Column(Text, nullable=False)  # Store CSV data as JSON string
    ai_prompt = Column(Text)
    sector = Column(String(255))
    state = Column(String(255))
    attachment_path = Column(String(255))
    status = Column(String(50), default='pending')  # pending, completed, failed
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC))
    
    def to_dict(self):
        return {
            'id': self.id,
            'scheduled_time': self.scheduled_time.isoformat(),
            'sector': self.sector,
            'state': self.state,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

# Function to create database tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 