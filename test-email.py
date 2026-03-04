"""
Test script to send a sample webinar confirmation email
Run with: python test-email.py
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Get credentials from environment
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_PASSWORD = os.environ.get("GMAIL_PASSWORD")
GOOGLE_MEET_LINK = "https://meet.google.com/hcf-iwcn-syx"

# Test recipient
TEST_EMAIL = "kara.abdolmaleki@gmail.com"
TEST_NAME = "Kara"

def send_test_email():
    """Send test confirmation email."""
    if not GMAIL_USER or not GMAIL_PASSWORD:
        print("❌ Error: GMAIL_USER and GMAIL_PASSWORD environment variables must be set")
        print("\nTo set them, run:")
        print('  $env:GMAIL_USER="your-email@gmail.com"')
        print('  $env:GMAIL_PASSWORD="your-app-password"')
        return False
    
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
                            <p style="margin: 0 0 10px; color: #1d1d1d; font-size: 19px; font-weight: 700;">Dear {TEST_NAME},</p>
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

        # Plain text fallback
        plain_text = f"""IELTS Corner — CELPIP Weekly Webinars

REGISTRATION CONFIRMED ✓

Dear {TEST_NAME},

Your payment has been processed and your registration is confirmed. You are now registered for this week's CELPIP Online Webinar Session.

SESSION INFORMATION
───────────────────
Date: Saturday
Time: 6:00 PM PST
Duration: 60 Minutes
Platform: Google Meet

JOIN YOUR WEBINAR
─────────────────
{GOOGLE_MEET_LINK}

Copy and paste this link into your browser. No account or password required.

WHAT TO EXPECT
───────────────
• 45 minutes of expert CELPIP instruction
• 15 minutes of live Q&A
• Practical, immediately applicable strategies

Please join 5 minutes early to verify your audio and video settings. This ensures a smooth experience for all participants.

IELTS Corner
{GMAIL_USER}
https://ieltscorner.ca

This email confirms your registration for the CELPIP Weekly Webinar. Your payment has been securely processed via Stripe. For any questions, reply to this email."""

        msg = MIMEMultipart("alternative")
        msg["From"] = f"IELTS Corner <{GMAIL_USER}>"
        msg["To"] = TEST_EMAIL
        msg["Subject"] = subject
        
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        print(f"✅ Test email sent successfully to {TEST_EMAIL}")
        print(f"📧 From: {GMAIL_USER}")
        print(f"\nCheck your inbox at {TEST_EMAIL}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Sending test webinar confirmation email...\n")
    send_test_email()
