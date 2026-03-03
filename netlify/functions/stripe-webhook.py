"""
Stripe Webhook Handler for CELPIP Webinar Email Delivery
Netlify Function version - deployed automatically with your site

Environment variables needed in Netlify dashboard:
- GMAIL_USER
- GMAIL_PASSWORD (16-char Gmail App Password)
- STRIPE_WEBHOOK_SECRET
- STRIPE_API_KEY
"""

import os
import json
import smtplib
import stripe
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_PASSWORD = os.environ.get("GMAIL_PASSWORD")
GOOGLE_MEET_LINK = "https://meet.google.com/hcf-iwcn-syx"

stripe.api_key = STRIPE_API_KEY


def send_email(customer_email: str, customer_name: str) -> bool:
    """Send confirmation email with Google Meet link."""
    try:
        subject = "Your CELPIP Weekly Webinar Link – Saturday 6:00 PM PST"
        
        body = f"""Hi {customer_name},

Thank you for registering for CELPIP Weekly Webinars!

🗓️ **Session Details:**
Saturday at 6:00 PM PST

📹 **Join on Google Meet:**
{GOOGLE_MEET_LINK}

No account needed—just click the link and join!

**What to expect:**
- 45 minutes of focused CELPIP teaching
- 15 minutes of live Q&A
- Practical strategies you can use immediately

See you Saturday!

—IELTS Corner
hello@ieltscorner.ca"""

        msg = MIMEMultipart()
        msg["From"] = GMAIL_USER
        msg["To"] = customer_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        print(f"✓ Email sent to {customer_email}")
        return True

    except Exception as e:
        print(f"✗ Failed to send email: {str(e)}")
        return False


def get_customer_details(checkout_session_id: str):
    """Retrieve customer email and name from Stripe checkout session."""
    try:
        session = stripe.checkout.Session.retrieve(checkout_session_id)
        
        customer_email = session.customer_details.email if session.customer_details else None
        customer_name = session.customer_details.name if session.customer_details else "there"
        
        if not customer_email:
            return None
            
        return {
            "email": customer_email,
            "name": customer_name
        }
    except Exception as e:
        print(f"✗ Failed to retrieve session: {str(e)}")
        return None


def handler(event, context):
    """Netlify Function handler for Stripe webhooks."""
    
    # Only accept POST requests
    if event["httpMethod"] != "POST":
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }
    
    # Get webhook payload and signature
    payload = event["body"]
    sig_header = event["headers"].get("stripe-signature")
    
    if not sig_header:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing Stripe signature"})
        }
    
    try:
        # Verify webhook signature
        stripe_event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid payload"})
        }
    except stripe.error.SignatureVerificationError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid signature"})
        }
    
    # Handle checkout.session.completed event
    if stripe_event["type"] == "checkout.session.completed":
        checkout_session = stripe_event["data"]["object"]
        
        print(f"New registration: {checkout_session['id']}")
        
        # Only process if payment was successful
        if checkout_session["payment_status"] == "paid":
            customer_info = get_customer_details(checkout_session["id"])
            
            if customer_info:
                success = send_email(customer_info["email"], customer_info["name"])
                
                if success:
                    return {
                        "statusCode": 200,
                        "body": json.dumps({"status": "success", "message": "Email sent"})
                    }
                else:
                    return {
                        "statusCode": 500,
                        "body": json.dumps({"error": "Failed to send email"})
                    }
            else:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "Could not retrieve customer info"})
                }
    
    # Acknowledge receipt of other event types
    return {
        "statusCode": 200,
        "body": json.dumps({"status": "received"})
    }
