from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import time
import traceback
import smtplib
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
import io
from email.mime.base import MIMEBase
from email import encoders
from models import EmailRecord, ScheduledEmail, get_db, create_tables, get_current_time_ist
from sqlalchemy.orm import Session
from datetime import datetime
import json
import pytz
from flask_apscheduler import APScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore

print("Starting Flask API server initialization...")

# Load environment variables
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
sender_email = os.getenv("ZOHO_EMAIL")
sender_password = os.getenv("ZOHO_APP_PASSWORD")

# Debug environment variables
print(f"GROQ_API_KEY loaded: {'Yes' if groq_api_key else 'No'}")
print(f"ZOHO_EMAIL loaded: {'Yes' if sender_email else 'No'}")
print(f"ZOHO_APP_PASSWORD loaded: {'Yes' if sender_password else 'No'}")

# Create database tables if they don't exist
print("Creating database tables if they don't exist...")
create_tables()
print("Database tables created successfully")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

print("Loading email template...")
# Load email template
try:
    # Try different encodings in order of likelihood
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
    template = None
    last_error = None
    
    for encoding in encodings:
        try:
            with open("email_template_prompt.txt", "r", encoding=encoding) as f:
                template = f.read()
            print(f"Email template loaded successfully with {encoding} encoding")
            break
        except UnicodeDecodeError as e:
            last_error = e
            continue
    
    if template is None:
        raise last_error or Exception("Failed to read file with any encoding")

except Exception as e:
    print(f"Error loading email template: {e}")
    template = "Write a business development email to {company_name}. The contact person is {contact_person}. They are in the {sector} sector. Here is their profile: {profile}"

# Function to generate personalized email using Groq
def generate_email(row, custom_prompt=""):
    try:
        print(f"Generating email for: {row.get('Contact Person', 'Unknown contact')}")
        prompt = template.format(
            company_name=row.get("Name of the Exhibitor", "your company"),
            contact_person=row.get("Contact Person", "there"),
            sector=row.get("Sector", "your industry"),
            profile=row.get("Profile", "your company profile")
        )
        
        # Add custom prompt if provided
        if custom_prompt:
            prompt += f"\n\nAdditional instructions: {custom_prompt}"

        messages = [
            SystemMessage(content="You are an expert email writer for business communication."),
            HumanMessage(content=prompt)
        ]

        # Initialize Groq Chat model
        print("Initializing Groq Chat model...")
        chat = ChatGroq(api_key=groq_api_key, model_name="llama3-70b-8192")
        print("Calling Groq API...")
        response = chat(messages)
        email_text = response.content.strip()

        # Clean generic intro line if present
        lines = email_text.splitlines()
        if lines and "business development email" in lines[0].lower():
            email_text = "\n".join(lines[1:]).strip()

        print("Email generated successfully")
        return email_text

    except Exception as e:
        print(f"❌ Error generating email: {e}")
        traceback.print_exc()
        return "Hi, I wanted to reach out regarding a potential collaboration opportunity."

# Function to append Calendly link to email message
def append_calendly_link(message_body, contact_person):
    calendly_link = "https://calendly.com/scalixitydevops/meet"
    friendly_line = (
        f"\n\nIf you're interested in scheduling a meeting, please use this link to book a time that works for you: "
        f"{calendly_link}\n\nLooking forward to connecting, {contact_person}!"
    )
    
    # Split the message into body and closing
    if "Warm regards," in message_body:
        parts = message_body.split("Warm regards,")
        message_body = parts[0].strip() + friendly_line + "\n\nWarm regards," + parts[1]
    else:
        message_body = message_body.strip() + friendly_line
    
    return message_body

# Email sending function (Zoho-compatible)
def send_email(to_email, contact_person, generated_message, sender_email, sender_password, attachment=None, row=None):
    db = None
    try:
        print(f"Sending email to {to_email}...")
        smtp_server = "smtp.zoho.in"
        smtp_port = 587
        company_name = row.get("Name of the Exhibitor", "your company")
        sector_name = row.get("Sector", "your sector")
        subject = f"Scalixity can help {company_name} scale faster in {sector_name}"

        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(generated_message, 'plain'))

        # Attach file if provided
        attachment_name = None
        if attachment:
            try:
                print(f"Processing attachment: {attachment.filename}")
                # Read the file content first to check if it's valid
                file_content = attachment.read()
                if not file_content:
                    print(f"Warning: Empty attachment file {attachment.filename}")
                
                # Reset file pointer after reading
                attachment.seek(0)
                
                # Get file extension and determine content type
                filename = attachment.filename
                file_ext = filename.split('.')[-1].lower()
                
                # Map common file extensions to MIME types
                mime_types = {
                    'pdf': 'application/pdf',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'xls': 'application/vnd.ms-excel',
                    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png'
                }
                
                content_type = mime_types.get(file_ext, 'application/octet-stream')
                
                part = MIMEBase(content_type.split('/')[0], content_type.split('/')[1])
                part.set_payload(file_content)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                msg.attach(part)
                attachment_name = filename
                print(f"Successfully attached {filename}")
                
            except Exception as e:
                print(f"Error processing attachment: {e}")
                # Continue sending email without attachment rather than failing completely
                traceback.print_exc()

        print(f"Connecting to SMTP server {smtp_server}:{smtp_port}...")
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            print("Logging in to SMTP server...")
            server.login(sender_email, sender_password)
            print("Sending email...")
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f"✅ Email sent to {contact_person} ({to_email})")
        
        # Save successful email record to database
        db = next(get_db())
        # Map CSV columns to database fields
        mobile_value = None
        profile_value = None
        
        # Try different possible column names for mobile
        for mobile_col in ["Mobile", "Mobile Number", "mobile", "Contact No", "Phone"]:
            if mobile_col in row:
                mobile_value = row[mobile_col]
                break
                
        # Try different possible column names for profile
        for profile_col in ["Profile", "Company Profile", "profile", "Description", "About"]:
            if profile_col in row:
                profile_value = row[profile_col]
                break
                
        print("DEBUG: Creating email record with data:", {
            'recipient_email': to_email,
            'company_name': company_name,
            'contact_person': contact_person,
            'mobile_number': mobile_value,
            'profile': profile_value,
            'sector': sector_name,
            'state': row.get("State", None)
        })
        
        email_record = EmailRecord(
            recipient_email=to_email,
            company_name=company_name,
            contact_person=contact_person,
            mobile_number=mobile_value,
            profile=profile_value,
            sector=sector_name,
            state=row.get("State", None),
            success=True,
            attachment_name=attachment_name
        )
        db.add(email_record)
        db.commit()
        print(f"✅ Email record saved to database")
        return True

    except Exception as e:
        error_message = str(e)
        print(f"❌ Failed to send email to {contact_person} ({to_email}): {error_message}")
        traceback.print_exc()
        
        # Save failed email record to database
        try:
            if db is None:
                db = next(get_db())
            email_record = EmailRecord(
                recipient_email=to_email,
                company_name=company_name,
                contact_person=contact_person,
                mobile_number=mobile_value,
                profile=profile_value,
                sector=sector_name,
                state=row.get("State", None),
                success=False,
                error_message=error_message,
                attachment_name=attachment_name
            )
            db.add(email_record)
            db.commit()
            print(f"✅ Failed email record saved to database")
        except Exception as db_error:
            print(f"❌ Failed to save failed email record: {db_error}")
            traceback.print_exc()
            if db:
                db.rollback()
        return False
            
    finally:
        if db:
            db.close()

@app.route('/send-emails', methods=['POST'])
def send_emails():
    print(f"Received request with form data: {request.form}")
    print(f"Files: {request.files}")
    
    prompt = request.form.get('prompt', '')
    sector = request.form.get('sector', '')
    state = request.form.get('state', '')
    
    print(f"Parsed parameters: prompt='{prompt}', sector='{sector}', state='{state}'")
    
    # Validate environment variables
    if not all([groq_api_key, sender_email, sender_password]):
        error_msg = "Missing environment variables. Please check your .env file."
        print(f"Error: {error_msg}")
        return jsonify({"detail": error_msg}), 500
    
    try:
        # Process the uploaded CSV file or use the default one
        if 'recipients_csv' in request.files and request.files['recipients_csv'].filename:
            file = request.files['recipients_csv']
            print(f"Reading uploaded CSV file: {file.filename}")
            df = pd.read_csv(file)
            print("DEBUG: CSV columns found:", df.columns.tolist())
            print("DEBUG: Column dtypes:", df.dtypes.to_dict())
            print("DEBUG: First row data:", df.iloc[0].to_dict())
            print("DEBUG: Sample of mobile and profile data:")
            for idx, row in df.head().iterrows():
                print(f"Row {idx}:")
                print(f"  Mobile: {row.get('Mobile', 'Not found')} (type: {type(row.get('Mobile', None))})")
                print(f"  Profile: {row.get('Profile', 'Not found')} (type: {type(row.get('Profile', None))})")
            df = df.dropna(subset=["Email"])
            print(f"CSV file loaded with {len(df)} rows after dropna")
        else:
            print("Using default CSV file...")
            df = pd.read_csv("companies_data.csv").dropna(subset=["Email", "Profile", "Sector", "State"])
            print(f"Default CSV file loaded with {len(df)} rows")
            print("CSV columns:", df.columns.tolist())  # Debug: Print column names
            print("First row of data:", df.iloc[0].to_dict())  # Debug: Print first row
        
        # Check for attachment
        attachment = request.files.get('attachment')

        # Apply filters if provided
        if sector:
            print(f"Filtering by sector: {sector}")
            df = df[df["Sector"].str.lower() == sector.lower()]
        if state:
            print(f"Filtering by state: {state}")
            df = df[df["State"].str.lower() == state.lower()]

        print(f"After filtering: {len(df)} rows remaining")
        if df.empty:
            error_msg = "No matching records found with the given filters."
            print(f"Error: {error_msg}")
            return jsonify({"detail": error_msg}), 404
        
        # Process emails
        results = []
        for _, row in df.iterrows():
            to_email = row.get("Email")
            contact_person = row.get("Contact Person", "there")
            print(f"Processing email for {contact_person} ({to_email})")
            
            generated_msg = generate_email(row, prompt)
            print(f"Generated message before Calendly link:\n{generated_msg}")
            
            # Add Calendly booking link
            final_message = append_calendly_link(generated_msg, contact_person)
            print(f"Final message with Calendly link:\n{final_message}")
            
            success = send_email(to_email, contact_person, final_message, sender_email, sender_password, attachment, row)
            results.append({
                "email": to_email,
                "contact": contact_person,
                "success": success
            })
            time.sleep(1.5)  # Prevent SMTP rate-limiting
        
        response_msg = f"Processed {len(results)} emails"
        print(f"Success: {response_msg}")
        return jsonify({"message": response_msg, "results": results})
    
    except Exception as e:
        error_msg = f"An error occurred: {str(e)}"
        print(f"Error: {error_msg}")
        traceback.print_exc()
        return jsonify({"detail": error_msg}), 500

# Helper function to format datetime in IST
def format_ist_time(dt):
    if dt is None:
        return None
    
    try:
        # Create timezone objects
        utc_tz = pytz.UTC
        ist_tz = pytz.timezone('Asia/Kolkata')
        
        # If datetime is naive, assume it's already in IST
        # (since we store it as naive IST in the database)
        if dt.tzinfo is None:
            dt = ist_tz.localize(dt)
        else:
            # If it has timezone info, convert to IST
            dt = dt.astimezone(ist_tz)
        
        # Format in desired format
        return dt.strftime("%m/%d/%Y, %I:%M:%S %p")
    except Exception as e:
        print(f"Error formatting time: {e}")
        return str(dt)

@app.route('/api/email-records', methods=['GET'])
def get_email_records():
    print("Received request for email records")
    db: Session = next(get_db())
    try:
        # Get query parameters with defaults
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        sector = request.args.get('sector')
        state = request.args.get('state')

        print(f"Query parameters: start_date={start_date}, end_date={end_date}, sector={sector}, state={state}")

        # Build query
        query = db.query(EmailRecord)

        # If no dates provided, get all records
        if not start_date and not end_date:
            print("No date range provided, fetching all records")
        else:
            # Convert dates to IST datetime objects
            ist = pytz.timezone('Asia/Kolkata')
            if start_date:
                start_date = datetime.fromisoformat(start_date)
                start_date = ist.localize(start_date)
            else:
                start_date = ist.localize(datetime.min)
                
            if end_date:
                end_date = datetime.fromisoformat(end_date)
                end_date = ist.localize(end_date)
            else:
                end_date = ist.localize(datetime.max)
                
            query = query.filter(EmailRecord.sent_at >= start_date, EmailRecord.sent_at <= end_date)

        if sector:
            query = query.filter(EmailRecord.sector == sector)
        if state:
            query = query.filter(EmailRecord.state == state)

        # Execute query
        records = query.all()
        print(f"Found {len(records)} email records")

        # Convert to list of dictionaries
        result = [
            {
                'id': record.id,
                'recipient_email': record.recipient_email,
                'company_name': record.company_name,
                'contact_person': record.contact_person,
                'mobile_number': record.mobile_number,
                'profile': record.profile,
                'sector': record.sector,
                'state': record.state,
                'sent_at': format_ist_time(record.sent_at),
                'success': record.success,
                'error_message': record.error_message,
                'attachment_name': record.attachment_name
            }
            for record in records
        ]

        print("DEBUG: Returning email records:", result)
        return jsonify(result)
    except Exception as e:
        print(f"Error getting email records: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/email-records', methods=['POST'])
def create_email_record():
    db: Session = next(get_db())
    try:
        data = request.json
        print("DEBUG: Received data for record creation:", data)
        
        # Create record with current IST time
        current_time = get_current_time_ist()
        print(f"DEBUG: Current UTC time: {datetime.utcnow()}")
        print(f"DEBUG: Current server time: {datetime.now()}")
        print(f"DEBUG: Generated IST time: {current_time}")
        print(f"DEBUG: Formatted IST time: {format_ist_time(current_time)}")
        
        record = EmailRecord(
            recipient_email=data['recipient_email'],
            company_name=data.get('company_name'),
            contact_person=data.get('contact_person'),
            mobile_number=data.get('mobile_number'),
            profile=data.get('profile'),
            sector=data.get('sector'),
            state=data.get('state'),
            success=data.get('success', True),
            error_message=data.get('error_message'),
            attachment_name=data.get('attachment_name'),
            sent_at=current_time
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        result = {
            'id': record.id,
            'recipient_email': record.recipient_email,
            'company_name': record.company_name,
            'contact_person': record.contact_person,
            'mobile_number': record.mobile_number,
            'profile': record.profile,
            'sector': record.sector,
            'state': record.state,
            'sent_at': format_ist_time(record.sent_at),
            'success': record.success,
            'error_message': record.error_message,
            'attachment_name': record.attachment_name
        }
        return jsonify(result), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# Configure APScheduler
app.config['SCHEDULER_API_ENABLED'] = True
app.config['SCHEDULER_JOBSTORES'] = {
    'default': SQLAlchemyJobStore(url='sqlite:///scheduler.db')
}

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

def process_scheduled_email(task_id):
    """Process a scheduled email task"""
    db = next(get_db())
    try:
        task = db.query(ScheduledEmail).filter_by(id=task_id).first()
        if not task:
            print(f"❌ Scheduled task {task_id} not found")
            return
        
        # Parse CSV data from stored JSON
        df = pd.read_json(task.recipient_csv_data)
        
        # Apply filters if provided
        if task.sector:
            df = df[df["Sector"].str.lower() == task.sector.lower()]
        if task.state:
            df = df[df["State"].str.lower() == task.state.lower()]
            
        # Handle attachment if present
        attachment = None
        if task.attachment_path:
            try:
                print(f"Opening attachment: {task.attachment_path}")
                attachment = open(task.attachment_path, 'rb')
                # Create a FileStorage-like object
                class FileStorage:
                    def __init__(self, file, filename):
                        self.file = file
                        self.filename = filename
                    def read(self):
                        return self.file.read()
                    def seek(self, pos):
                        return self.file.seek(pos)
                
                attachment = FileStorage(attachment, os.path.basename(task.attachment_path))
                print(f"✅ Attachment loaded successfully")
            except Exception as e:
                print(f"❌ Error opening attachment: {e}")
                traceback.print_exc()
            
        for _, row in df.iterrows():
            to_email = row.get("Email")
            contact_person = row.get("Contact Person", "there")
            
            # Generate email with custom prompt if provided
            generated_msg = generate_email(row, task.ai_prompt)
            final_message = append_calendly_link(generated_msg, contact_person)
            
            # Send email
            success = send_email(
                to_email, 
                contact_person, 
                final_message, 
                sender_email, 
                sender_password, 
                attachment,
                row
            )
            
            time.sleep(1.5)  # Prevent SMTP rate-limiting
        
        # Update task status
        task.status = 'completed'
        db.commit()
        
    except Exception as e:
        print(f"❌ Error processing scheduled task {task_id}: {e}")
        traceback.print_exc()
        task.status = 'failed'
        db.commit()
    finally:
        # Close attachment if it was opened
        if attachment and hasattr(attachment, 'file'):
            attachment.file.close()
        db.close()

@app.route('/schedule-emails', methods=['POST'])
def schedule_emails():
    """Schedule emails for future sending"""
    try:
        # Get form data
        csv_file = request.files.get('recipients_csv')
        attachment = request.files.get('attachment')
        ai_prompt = request.form.get('ai_prompt', '')
        sector = request.form.get('sector', '')
        state = request.form.get('state', '')
        scheduled_time = request.form.get('scheduled_time')  # Expected in ISO format
        
        if not csv_file or not scheduled_time:
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Read and validate CSV
        df = pd.read_csv(csv_file)
        if 'Email' not in df.columns:
            return jsonify({'error': 'CSV must contain an Email column'}), 400
            
        # Save attachment if provided
        attachment_path = None
        if attachment:
            attachment_path = os.path.join('uploads', attachment.filename)
            os.makedirs('uploads', exist_ok=True)
            attachment.save(attachment_path)
        
        # Parse the scheduled time
        try:
            # Remove 'Z' and handle timezone
            if scheduled_time.endswith('Z'):
                scheduled_time = scheduled_time[:-1]  # Remove 'Z'
                dt = datetime.fromisoformat(scheduled_time)
                dt = dt.replace(tzinfo=pytz.UTC)  # Set as UTC
            else:
                dt = datetime.fromisoformat(scheduled_time)
                if dt.tzinfo is None:
                    dt = pytz.UTC.localize(dt)
        except ValueError as e:
            return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
        
        # Create scheduled task record
        db = next(get_db())
        scheduled_task = ScheduledEmail(
            scheduled_time=dt,
            recipient_csv_data=df.to_json(),
            ai_prompt=ai_prompt,
            sector=sector,
            state=state,
            attachment_path=attachment_path,
            status='pending'
        )
        db.add(scheduled_task)
        db.commit()
        
        # Schedule the job
        scheduler.add_job(
            func=process_scheduled_email,
            trigger='date',
            run_date=dt,
            args=[scheduled_task.id],
            id=f'email_task_{scheduled_task.id}'
        )
        
        return jsonify({
            'message': 'Email task scheduled successfully',
            'task_id': scheduled_task.id,
            'scheduled_time': dt.isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error scheduling emails: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/scheduled-tasks', methods=['GET'])
def get_scheduled_tasks():
    """Get list of scheduled email tasks"""
    try:
        db = next(get_db())
        tasks = db.query(ScheduledEmail).all()
        return jsonify([task.to_dict() for task in tasks])
    except Exception as e:
        print(f"❌ Error fetching scheduled tasks: {e}")
        return jsonify({'error': str(e)}), 500

print("Flask API setup complete, starting server...")
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True) 