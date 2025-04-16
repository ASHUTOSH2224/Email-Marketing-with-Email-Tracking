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
from models import EmailRecord, get_db, create_tables
from sqlalchemy.orm import Session
from datetime import datetime
import json

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

# Create database tables
print("Creating database tables...")
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
        email_record = EmailRecord(
            recipient_email=to_email,
            company_name=company_name,
            contact_person=contact_person,
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
        if 'file' in request.files and request.files['file'].filename:
            file = request.files['file']
            print(f"Reading uploaded CSV file: {file.filename}")
            df = pd.read_csv(file).dropna(subset=["Email"])
            print(f"CSV file loaded with {len(df)} rows")
        else:
            print("Using default CSV file...")
            df = pd.read_csv("companies_data.csv").dropna(subset=["Email", "Profile", "Sector", "State"])
            print(f"Default CSV file loaded with {len(df)} rows")
        
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
            # Convert dates to datetime objects
            if start_date:
                start_date = datetime.fromisoformat(start_date)
            else:
                start_date = datetime.min
                
            if end_date:
                end_date = datetime.fromisoformat(end_date)
            else:
                end_date = datetime.max
                
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
                'sector': record.sector,
                'state': record.state,
                'sent_at': record.sent_at.isoformat(),
                'success': record.success,
                'error_message': record.error_message,
                'attachment_name': record.attachment_name
            }
            for record in records
        ]

        print("Returning email records:", result)
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
        record = EmailRecord(
            recipient_email=data['recipient_email'],
            company_name=data.get('company_name'),
            contact_person=data.get('contact_person'),
            sector=data.get('sector'),
            state=data.get('state'),
            success=data.get('success', True),
            error_message=data.get('error_message'),
            attachment_name=data.get('attachment_name')
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return jsonify({
            'id': record.id,
            'recipient_email': record.recipient_email,
            'company_name': record.company_name,
            'contact_person': record.contact_person,
            'sector': record.sector,
            'state': record.state,
            'sent_at': record.sent_at.isoformat(),
            'success': record.success,
            'error_message': record.error_message,
            'attachment_name': record.attachment_name
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

print("Flask API setup complete, starting server...")
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True) 