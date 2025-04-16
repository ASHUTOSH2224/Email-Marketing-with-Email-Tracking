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