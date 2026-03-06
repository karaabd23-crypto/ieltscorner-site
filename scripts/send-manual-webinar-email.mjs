/**
 * Manual Webinar Confirmation Email Sender
 * USE THIS: If someone pays but doesn't receive the automated email
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const GMAIL_USER = process.env.GMAIL_USER || 'kara.abdolmaleki@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
const GOOGLE_MEET_LINK = 'https://meet.google.com/hcf-iwcn-syx';

async function sendManualEmail(customerEmail, customerName) {
  if (!GMAIL_PASSWORD) {
    console.error('❌ GMAIL_PASSWORD not set in .env file');
    console.log('\nTo fix:');
    console.log('1. Go to https://myaccount.google.com/apppasswords');
    console.log('2. Generate a new App Password (must have 2FA enabled)');
    console.log('3. Add to .env file: GMAIL_PASSWORD=your-16-char-password');
    return false;
  }

  const subject = '✅ Your CELPIP Webinar Registration — Saturday 6:00 PM PST';
  
  const htmlBody = `<!DOCTYPE html>
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
                            <p style="margin: 0 0 10px; color: #1d1d1d; font-size: 19px; font-weight: 700;">Dear ${customerName},</p>
                            <p style="margin: 0 0 12px; color: #2b2b2b; font-size: 15px; line-height: 1.55;">
                                Your payment has been processed and your webinar registration is confirmed.
                            </p>

                            <div style="background: #f3f3f3; border-left: 4px solid #d94848; padding: 12px; margin: 0 0 12px; border-radius: 5px;">
                                <p style="margin: 0 0 6px; color: #333333; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">Join Your Webinar</p>
                                <p style="margin: 0; color: #d94848; font-size: 16px; font-family: 'Courier New', monospace; font-weight: 700; word-break: break-all;">${GOOGLE_MEET_LINK}</p>
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
                                <a href="mailto:${GMAIL_USER}" style="color: #d94848; text-decoration: none; font-weight: 600;">${GMAIL_USER}</a> |
                                <a href="https://ieltscorner.ca" style="color: #d94848; text-decoration: none; font-weight: 600;">ieltscorner.ca</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const plainText = `IELTS Corner — CELPIP Weekly Webinars

Registration Confirmed ✓

Hi ${customerName},

You're all set! Thank you for registering for this week's CELPIP webinar.

SESSION DETAILS
───────────────
When: Saturday, 6:00 PM PST
Duration: 60 minutes
Format: Live on Google Meet

JOIN WEBINAR
────────────
${GOOGLE_MEET_LINK}

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
${GMAIL_USER}
https://ieltscorner.ca

This email confirms your registration for the CELPIP Weekly Webinar. Your payment has been securely processed via Stripe.`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: `IELTS Corner <${GMAIL_USER}>`,
      to: customerEmail,
      subject: subject,
      text: plainText,
      html: htmlBody
    };

    console.log(`📧 Sending webinar confirmation to ${customerEmail}...`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return false;
  }
}

// Get email and name from command line arguments
const email = process.argv[2];
const name = process.argv[3] || 'there';

if (!email) {
  console.log('Usage: node send-manual-webinar-email.mjs <email> [name]');
  console.log('Example: node send-manual-webinar-email.mjs customer@example.com "John Smith"');
  process.exit(1);
}

sendManualEmail(email, name);
