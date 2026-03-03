"""
Stripe Webhook Handler for CELPIP Webinar Email Delivery
Listens for Stripe checkout.session.completed events and sends confirmation emails via Gmail.

Setup:
1. Create a Gmail App Password: https://myaccount.google.com/apppasswords
   - Select Mail and Windows Computer
   - Copy the 16-character password
   
2. Set environment variables:
   - GMAIL_USER=your-email@gmail.com
   - GMAIL_PASSWORD=your-16-char-app-password
   - STRIPE_WEBHOOK_SECRET=your-webhook-signing-secret (from Stripe Dashboard)
   - STRIPE_API_KEY=your-stripe-api-key (from Stripe Dashboard)

3. Install dependencies:
   pip install flask stripe python-dotenv

4. Deploy this script and expose the webhook URL to Stripe
"""

import os
import json
import smtplib
import stripe
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
GOOGLE_MEET_LINK = "https://meet.google.com/hcf-iwcn-syx"

stripe.api_key = STRIPE_API_KEY


def send_email(customer_email: str, customer_name: str) -> bool:
    """Send confirmation email with Google Meet link."""
    try:
        # Compose email
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

        # Send via Gmail SMTP
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
        print(f"✗ Failed to send email to {customer_email}: {str(e)}")
        return False


def get_customer_details(checkout_session_id: str) -> dict:
    """Retrieve customer email and name from Stripe checkout session."""
    try:
        session = stripe.checkout.Session.retrieve(checkout_session_id)
        
        # Get customer email
        customer_email = session.customer_details.email if session.customer_details else None
        customer_name = session.customer_details.name if session.customer_details else "there"
        
        if not customer_email:
            print(f"✗ No customer email found in session {checkout_session_id}")
            return None
            
        return {
            "email": customer_email,
            "name": customer_name
        }
    except Exception as e:
        print(f"✗ Failed to retrieve session {checkout_session_id}: {str(e)}")
        return None


@app.route("/webhook", methods=["POST"])
def handle_webhook():
    """Handle Stripe webhook events."""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get("Stripe-Signature")

    try:
        # Verify webhook signature (security check)
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        print("✗ Invalid payload")
        return {"status": "error", "message": "Invalid payload"}, 400
    except stripe.error.SignatureVerificationError:
        print("✗ Invalid signature")
        return {"status": "error", "message": "Invalid signature"}, 400

    # Handle checkout.session.completed event
    if event["type"] == "checkout.session.completed":
        checkout_session = event["data"]["object"]
        
        print(f"\n--- New Webinar Registration ---")
        print(f"Checkout Session ID: {checkout_session['id']}")
        print(f"Payment Status: {checkout_session['payment_status']}")
        
        # Only process if payment was successful
        if checkout_session["payment_status"] == "paid":
            # Get customer details
            customer_info = get_customer_details(checkout_session["id"])
            
            if customer_info:
                # Send confirmation email
                success = send_email(customer_info["email"], customer_info["name"])
                
                if success:
                    return {"status": "success", "message": "Email sent"}, 200
                else:
                    return {"status": "error", "message": "Failed to send email"}, 500
            else:
                return {"status": "error", "message": "Could not retrieve customer info"}, 400
        else:
            return {"status": "skipped", "message": "Payment not completed"}, 200

    # Ignore other event types
    return {"status": "received"}, 200


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return {"status": "ok"}, 200


if __name__ == "__main__":
    # Run locally for testing
    print("Starting Stripe Webhook Server...")
    print(f"Listening at http://localhost:5000/webhook")
    app.run(debug=True, port=5000)
