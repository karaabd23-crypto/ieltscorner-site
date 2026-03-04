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
GMAIL_USER = os.environ.get("GMAIL_USER", "kara.abdolmaleki@gmail.com")
GMAIL_PASSWORD = os.environ.get("GMAIL_PASSWORD")
GOOGLE_MEET_LINK = "https://meet.google.com/hcf-iwcn-syx"

stripe.api_key = STRIPE_API_KEY


def send_email(customer_email: str, customer_name: str) -> bool:
    """Send confirmation email with Google Meet link."""
    try:
        subject = "✅ Your CELPIP Webinar Registration — Saturday 6:00 PM PST"
        
        # Professional HTML email template - compact, above-the-fold, formal
        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background: #f6f4f3;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 12px;">
                <table role="presentation" style="width: 100%; max-width: 640px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e9e1dc; overflow: hidden;">
                    <tr>
                        <td style="background: #d94848; padding: 18px 24px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.3px;">REGISTRATION CONFIRMED</h1>
                            <p style="margin: 4px 0 0; color: #ffeaea; font-size: 14px;">CELPIP Weekly Webinar</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 18px 22px 14px; background: #ffffff;">
                            <p style="margin: 0 0 10px; color: #1d1d1d; font-size: 19px; font-weight: 700;">Dear {customer_name},</p>
                            <p style="margin: 0 0 12px; color: #2b2b2b; font-size: 15px; line-height: 1.55;">
                                Your payment has been processed and your webinar registration is confirmed.
                            </p>

                            <div style="background: #f3f3f3; border-left: 4px solid #d94848; padding: 12px; margin: 0 0 12px; border-radius: 5px;">
                                <p style="margin: 0 0 6px; color: #333333; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">Join Your Webinar</p>
                                <p style="margin: 0; color: #d94848; font-size: 16px; font-family: 'Courier New', monospace; font-weight: 700; word-break: break-all;">{GOOGLE_MEET_LINK}</p>
                                <p style="margin: 6px 0 0; color: #666666; font-size: 12px;">Copy and paste this link into your browser.</p>
                            </div>

                            <div style="background: #fcfbfa; border: 1px solid #eadfda; border-radius: 7px; padding: 12px; margin: 0 0 10px;">
                                <p style="margin: 0 0 8px; color: #d94848; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">Session Information</p>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr><td style="padding: 4px 0; color: #555; font-size: 14px; font-weight: 600; width: 28%;">Date:</td><td style="padding: 4px 0; color: #1a1a1a; font-size: 15px; font-weight: 700;">Saturday</td></tr>
                                    <tr><td style="padding: 4px 0; color: #555; font-size: 14px; font-weight: 600;">Time:</td><td style="padding: 4px 0; color: #1a1a1a; font-size: 15px; font-weight: 700;">6:00 PM PST</td></tr>
                                    <tr><td style="padding: 4px 0; color: #555; font-size: 14px; font-weight: 600;">Duration:</td><td style="padding: 4px 0; color: #1a1a1a; font-size: 15px; font-weight: 700;">60 Minutes</td></tr>
                                    <tr><td style="padding: 4px 0; color: #555; font-size: 14px; font-weight: 600;">Platform:</td><td style="padding: 4px 0; color: #1a1a1a; font-size: 15px; font-weight: 700;">Google Meet</td></tr>
                                </table>
                            </div>

                            <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">Please join 5 minutes early for audio/video setup.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #f4f1ef; padding: 12px 22px; border-top: 1px solid #e6ddd7; text-align: center;">
                            <p style="margin: 0 0 4px; color: #1f1f1f; font-size: 14px; font-weight: 700;">IELTS Corner</p>
                            <p style="margin: 0; color: #666; font-size: 12px;">
                                <a href="mailto:{GMAIL_USER}" style="color: #d94848; text-decoration: none; font-weight: 600;">{GMAIL_USER}</a> |
                                <a href="https://ieltscorner.ca" style="color: #d94848; text-decoration: none; font-weight: 600;">ieltscorner.ca</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

        msg = MIMEMultipart("alternative")
        msg["From"] = f"IELTS Corner <{GMAIL_USER}>"
        msg["To"] = customer_email
        msg["Subject"] = subject
        
        # Plain text fallback
        plain_text = f"""IELTS Corner — CELPIP Weekly Webinars

Registration Confirmed ✓

Hi {customer_name},

You're all set! Thank you for registering for this week's CELPIP webinar.

SESSION DETAILS
───────────────
When: Saturday, 6:00 PM PST
Duration: 60 minutes
Format: Live on Google Meet

JOIN WEBINAR
────────────
{GOOGLE_MEET_LINK}

No account needed — just click and join!

WHAT TO EXPECT
──────────────
• 45 minutes of focused CELPIP instruction
• Real strategies from a certified instructor
• 15 minutes of live Q&A for your questions
• Practical techniques you can use immediately

PRO TIPS
────────
• Join 5 minutes early to test your audio/video
• Have a notebook ready to take notes
• Prepare questions for the Q&A session
• Use headphones for better audio quality

See you Saturday!

IELTS Corner
{GMAIL_USER}
https://ieltscorner.ca

This email confirms your registration for the CELPIP Weekly Webinar. Your payment has been securely processed via Stripe."""

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

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
