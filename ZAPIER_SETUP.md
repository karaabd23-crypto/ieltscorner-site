# Zapier Setup Guide for CELPIP Webinar Automation

This guide walks you through setting up automated email delivery after payment using **Zapier**.

**What happens:** When someone pays via Stripe, Zapier automatically sends them:
- Google Meet link
- Calendar invite
- Session details

---

## Your Webinar Details

**Google Meet Link:** `https://meet.google.com/hcf-iwcn-syx`

**Your Email:** `kara.abdolmaleki@gmail.com`

**Schedule:** Saturday 6:00 PM PST

---

## Step 1: Sign Up for Zapier

1. Go to [zapier.com](https://zapier.com)
2. Click **Sign Up** (free tier available)
3. Create account with your email
4. Verify email

---

## Step 2: Create a New Zap

1. Click **Create** (top left)
2. Name your Zap: `CELPIP Webinar Payment → Send Email`

---

## Step 3: Set Trigger (When Payment Happens)

### 3.1 Choose Trigger App

1. Search for **Stripe**
2. Select it

### 3.2 Configure Trigger

1. **Event:** `Successful Charge` (or `Checkout Session Completed` if available)
2. **Connect Stripe:** Click **Sign In** and authenticate your Stripe account
3. **Test Trigger:** Click **Test Trigger**
   - Make a test payment in Stripe (card: `4242 4242 4242 4242`)
   - Zapier should detect it and show "Success ✓"

---

## Step 4: Set Action (Send Email)

### 4.1 Choose Action App

1. Click **Add Step**
2. Search for **Gmail**
3. Select **Gmail**

### 4.2 Configure Email

1. **Event:** `Send Email`
2. **Gmail Account:** Connect your Gmail (you'll use this to send emails to students)
3. **Fill in fields:**

**To:** `{{Customer Email}}`  
(This pulls the student's email from the Stripe payment)

**From:** Your Gmail address

**Subject:** 
```
Your CELPIP Writing Workshop Link – Saturday 6:00 PM PST
```

**Body (Plain Text or HTML):**

```
Hi {{Customer Name}},

You're registered! 🎉

Here's everything you need for Saturday's session:

📌 SESSION DETAILS
Date: Saturday, {{Session Date}}
Time: 6:00 PM PST
Duration: 60 minutes (45 min teaching + 15 min Q&A)

🎥 GOOGLE MEET LINK
https://meet.google.com/hcf-iwcn-syx

Click the link above to join. No special software needed—just click and join!

📅 ADD TO CALENDAR
Download your calendar invite (calendar_invite.ics) by clicking the attachment below.

📧 WHAT HAPPENS NEXT
- 24 hours before session: You'll get a reminder with the Meet link
- Saturday 6 PM PST: Join the Meet room (arrive 2-3 minutes early)
- After session: You'll get session materials and practice tasks

📝 THIS WEEK'S TOPIC
{{Session Topic}}

{{Session Description}}

Need help?
Reply to this email or contact me: kara.abdolmaleki@gmail.com
WhatsApp: (if you have one)

See you Saturday! 🚀

– IELTS Corner
```

---

## Step 5: Test Your Zap

### 5.1 Send Test Email

1. Click **Test & Continue**
2. Zapier will send a test email to {{Customer Email}}
3. Check your inbox (may take 2-5 minutes)
4. Verify the email looks good

### 5.2 Turn On the Zap

1. Click **Publish**
2. Toggle ON (switch to active)

---

## Step 6: Admin Notification (Optional But Recommended)

**Add a second action** so you know when someone registers:

### 6.1 Add Another Action

1. Click **Add Step** (in the Zap)
2. Search for **Gmail** again
3. Send email **to:** `kara.abdolmaleki@gmail.com`

**Subject:**
```
New CELPIP Webinar Registration
```

**Body:**
```
New registration received:

Customer Name: {{Customer Name}}
Customer Email: {{Customer Email}}
Payment Amount: {{Amount}} CAD
Timestamp: {{Timestamp}}

---
Check your Stripe dashboard for payment details.
```

---

## Testing the Full Flow

### Test Payment:

1. Go to your Stripe payment link: `https://buy.stripe.com/4gM7sK3Gm4dC26l23ygMw01`
2. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/27)
   - CVC: Any 3 digits (e.g., 123)
3. Billing info: Use any name/email you want
4. Click **Pay**

### What Should Happen:

1. ✅ Payment confirmed on Stripe
2. ✅ Redirect to `/webinar/thank-you` page
3. ✅ Email arrives (check spam if not in inbox)
4. ✅ Email contains Google Meet link
5. ✅ Admin notification arrive at your email

**If anything fails:**
- Check Zapier task history (in your Zap, click "Runs")
- Check Stripe webhook logs
- Re-read steps above for any missed configuration

---

## Switch to Live Mode

Once testing is complete:

1. **In Stripe Dashboard:**
   - Toggle from Test Mode to Live Mode
   - Your real product "Weekly CELPIP Webinar" is already live

2. **In Zapier:**
   - The same Zap works for both test and live (if same Stripe account)
   - Just make sure it's toggled ON

3. **Test with real payment:**
   - Have a friend or family member pay the $12
   - Verify email arrives correctly

---

## Email Template Customization

Feel free to modify the email body to match your voice:

- Add a personal greeting
- Include your name/credentials
- Add testimonials
- Include links to other resources
- Customize the tone (formal vs casual)

**Just keep these variables:**
- `{{Customer Name}}`
- `{{Customer Email}}`
- `{{Session Date}}`
- `{{Session Topic}}`
- `{{Session Description}}`

---

## Troubleshooting

### Email Not Sending

**Problem:** Zap is ON but email not being sent after payment

**Solutions:**
1. Check Zapier task history (click the Zap → "Runs" tab)
2. Look for error message
3. Common fixes:
   - Gmail account not properly connected
   - Stripe webhook not set up (see below)
   - Zap not actually published/ON

### Webhook Not Firing

**Problem:** Zapier trigger doesn't detect Stripe payments

**Solution:**
1. In Zapier, open your Zap
2. Click on the Stripe trigger
3. Check "Webhook URL" section
4. Copy the URL
5. Go to Stripe Dashboard → **Developers** → **Webhooks**
6. Make sure webhook endpoint is listed and "active"
7. If not, add new endpoint with Zapier's URL

---

## What's NOT Automated Yet

These still need manual steps:

- **Calendar file (.ics):** Send separately or use Zapier Code (advanced)
- **Reminders:** Schedule 24-hour reminder separately (or use another Zap)
- **Session approval:** You still manually admit students from Google Meet waiting room

---

## Next Steps

1. ✅ Follow steps above to set up Zapier
2. ✅ Test with payment
3. ✅ Switch to Live Mode
4. ✅ Announce webinar and collect registrations
5. ✅ Join first session and admit students manually

---

## Support

**Zapier Help:** [help.zapier.com](https://help.zapier.com)  
**Gmail API Issues:** [support.google.com/mail](https://support.google.com/mail)  
**Stripe Webhooks:** [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)

---

**You're all set! 🚀 Automation is ready to go.**
