# Webinar System Setup Guide

This guide walks you through setting up the complete webinar payment and automation system for **$12 weekly CELPIP Writing Workshops**.

---

## Table of Contents

1. [Overview](#overview)
2. [Stripe Setup (Payment Processing)](#stripe-setup-payment-processing)
3. [Google Meet Setup (Webinar Platform)](#google-meet-setup-webinar-platform)
4. [Email Automation (Link Delivery)](#email-automation-link-delivery)
5. [Calendar File Generation](#calendar-file-generation)
6. [Admin Notifications](#admin-notifications)
7. [Testing Checklist](#testing-checklist)
8. [Week-by-Week Maintenance](#week-by-week-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

**System Workflow:**
1. Student clicks "Register Now" → Stripe Checkout page
2. Student pays $12 → Stripe confirms payment
3. Stripe webhook triggers automation (Zapier/Make/Netlify Function)
4. Email sent to student with:
   - Google Meet link
   - Calendar invite (.ics file)
   - Session details
5. Admin notification sent (registration tracking)
6. Student redirected to thank-you page

**What You Need:**
- Stripe account (free)
- Google account (for Meet)
- Email automation tool (Zapier, Make.com, or Netlify Functions)
- 2-3 hours for initial setup

---

## Stripe Setup (Payment Processing)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business profile:
   - Business name: "IELTS Corner"
   - Country: Canada
   - Currency: USD (recommended for consistency with YouTube/AdSense)
3. Verify email and activate account

### Step 2: Create Product

1. In Stripe Dashboard, go to **Products** → **Add Product**
2. Fill in details:
   - **Name:** "Weekly CELPIP Writing Workshop"
   - **Description:** "60-minute live CELPIP CLB 9+ writing strategy session. Every Sunday at 11:00 AM EST."
   - **Pricing:** $12 USD (one-time payment)
   - **Tax:** Set tax category if required (digital product)
3. Click **Save product**

### Step 3: Create Payment Link

**Option A: Simple Payment Link (Easiest)**

1. Go to **Payment links** → **New**
2. Select your "Weekly CELPIP Writing Workshop" product
3. Set quantity to 1 (non-adjustable)
4. Configure:
   - **Success URL:** `https://ieltscorner.ca/webinar/thank-you?session_id={CHECKOUT_SESSION_ID}`
   - **Cancel URL:** `https://ieltscorner.ca/webinar`
   - **Collect customer email:** Yes (required for sending link)
   - **Collect customer name:** Yes
5. Copy the payment link (looks like `https://buy.stripe.com/XXXXXXXXXXXX`)
6. Update `src/pages/webinar.astro`:
   ```astro
   <a 
     href="https://buy.stripe.com/YOUR_PAYMENT_LINK_HERE"
     class="btn btn-primary"
   >
     Register Now →
   </a>
   ```

**Option B: Checkout Session (More Control - Requires API)**

If you want more customization (like passing metadata), you'll need to create an API endpoint. See "Advanced: Netlify Function Integration" at the end.

### Step 4: Enable Webhooks

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL (depends on your automation tool):
   - **Zapier:** `https://hooks.zapier.com/hooks/catch/XXXXX/` (get from Zapier Stripe trigger)
   - **Make.com:** `https://hook.make.com/XXXXXXXXXXXXX` (get from Make webhook module)
   - **Netlify Function:** `https://ieltscorner.ca/.netlify/functions/stripe-webhook` (if you build custom function)
4. Select events to listen to:
   - ✓ `checkout.session.completed` (required)
   - ✓ `payment_intent.succeeded` (optional, for extra confirmation)
5. Save and copy **Signing secret** (starts with `whsec_...`)

### Step 5: Test Mode First

**IMPORTANT:** Start in **Test Mode** (toggle in Stripe Dashboard)

1. Use test payment link
2. Test with card: `4242 4242 4242 4242` (any future date, any 3-digit CVC)
3. Verify webhook fires correctly
4. Once everything works, switch to **Live Mode** and repeat product/webhook setup

---

## Google Meet Setup (Webinar Platform)

### Step 1: Create Recurring Google Calendar Event

1. Go to [calendar.google.com](https://calendar.google.com)
2. Click **Create** → **Event**
3. Fill in details:
   - **Event name:** "CELPIP Writing Workshop (Live Session)"
   - **Date:** Next Sunday
   - **Time:** 11:00 AM - 12:00 PM EST
   - **Repeat:** Weekly on Sunday (or "Custom" → every Sunday)
   - **Add Google Meet video conferencing:** Click "Add Google Meet video conferencing"
4. Click **Save**

### Step 2: Extract Meet Link

1. Open the event you just created
2. Copy the Google Meet link (looks like `https://meet.google.com/abc-defg-hij`)
3. **Save this link—it's your permanent weekly webinar link**

**Important Notes:**
- This same Meet link works for all weekly sessions (no need to regenerate)
- You control who enters via the waiting room (soft enforcement)
- Free Google Meet tier allows up to 100 participants for 60 minutes

### Step 3: Meeting Settings

1. Click the Meet link before your first session
2. Go to meeting settings (gear icon)
3. Configure:
   - **Host controls:** On (so you can admit from waiting room)
   - **Quick access:** Off (forces waiting room for everyone)
   - **Video/audio defaults:** Your preference

---

## Email Automation (Link Delivery)

You have 3 options for automation. **Option A (Zapier) is recommended** for beginners.

### Option A: Zapier (Easiest, $20/month after free tier)

**Step 1: Create Zap**

1. Sign up at [zapier.com](https://zapier.com) (free tier: 100 tasks/month)
2. Click **Create Zap**

**Step 2: Trigger (Stripe Payment)**

1. Choose app: **Stripe**
2. Event: **New Successful Payment** (or "Checkout Session Completed")
3. Connect your Stripe account
4. Test trigger with a test payment

**Step 3: Action (Send Email)**

1. Choose app: **Gmail** (or Email by Zapier)
2. Event: **Send Email**
3. Configure email:
   - **To:** `{{Customer Email}}` (from Stripe trigger)
   - **Subject:** "Your CELPIP Writing Workshop Link – This Sunday"
   - **Body:** (See email template below)
4. Test email send

**Step 4: Add Calendar File (Optional Advanced Step)**

- Use **Code by Zapier** to generate .ics file
- Attach to email (requires Zapier Code or external service like Cal.com)

**Step 5: Turn on Zap**

---

### Option B: Make.com (More Powerful, Free Tier Available)

1. Sign up at [make.com](https://make.com) (free tier: 1,000 operations/month)
2. Create scenario:
   - **Trigger:** Webhooks → Custom webhook (paste URL in Stripe webhooks)
   - **Module 1:** Parse Stripe webhook JSON
   - **Module 2:** Gmail → Send an email
   - **Module 3:** HTTP → Generate .ics calendar file (advanced)
3. Similar configuration to Zapier

---

### Option C: Netlify Functions (Custom Code, Free)

If you want full control and no monthly fees:

**Create `netlify/functions/stripe-webhook.js`:**

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const customerEmail = session.customer_details.email;
      const customerName = session.customer_details.name;

      // Send email with Meet link
      await sendWebinarEmail(customerEmail, customerName);

      return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
      };
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};

async function sendWebinarEmail(to, name) {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'kara.abdolmaleki@gmail.com',
    to: to,
    subject: 'Your IELTS Writing Workshop Link – This Sunday',
    html: `
      <h1>You're registered for this Sunday!</h1>
      <p>Hi ${name},</p>
      <p><strong>Google Meet Link:</strong> <a href="YOUR_MEET_LINK_HERE">Click here to join</a></p>
      <p><strong>Time:</strong> Sunday, 11:00 AM EST</p>
      <p>See you there!</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
```

**Setup:**
1. Install dependencies: `npm install stripe nodemailer`
2. Add Netlify environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD` (generate from Google Account → App Passwords)
3. Deploy to Netlify

---

### Email Template (Use This)

**Subject:** Your CELPIP Writing Workshop Link – This Sunday

**Body:**

```
Hi [Customer Name],

You're all set for this Sunday's workshop!

🎯 SESSION DETAILS

Topic: Task 2 Structure That Gets CLB 9
Date: Sunday, [Date]
Time: 11:00 AM EST (8:00 AM PST, 4:00 PM GMT)
Duration: 60 minutes (45 min teaching + 15 min Q&A)

🔗 GOOGLE MEET LINK

Click here to join: [YOUR_MEET_LINK_HERE]

No account needed. Just click and join 2-3 minutes before 11:00 AM.

📅 ADD TO CALENDAR

Download calendar invite: [Attach .ics file OR link to .ics]

📝 WHAT TO BRING

- Notebook or device for notes
- Your writing questions
- Optional: A sample essay you've written

🔔 REMINDER

We'll send you another reminder 24 hours before the session.

Need help? Reply to this email or WhatsApp us at +1 647-931-7537.

See you Sunday!

– IELTS Corner Team
https://ieltscorner.ca
```

---

## Calendar File Generation

### Method 1: Manual .ics File (Simplest)

Create a file `webinar-invite.ics`:

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IELTS Corner//Webinar//EN
BEGIN:VEVENT
UID:ielts-webinar-[UNIQUE_ID]@ieltscorner.ca
DTSTAMP:20260308T120000Z
DTSTART:20260309T160000Z
DTEND:20260309T170000Z
SUMMARY:IELTS Writing Workshop – Band 7+ Strategies
DESCRIPTION:60-minute live workshop on CELPIP writing. Google Meet link: [YOUR_MEET_LINK]
LOCATION:[YOUR_MEET_LINK]
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: IELTS workshop tomorrow at 11 AM
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR
```

**Host this file** at `/public/webinar-invite.ics` and link in email:
```
Download calendar invite: https://ieltscorner.ca/webinar-invite.ics
```

### Method 2: Dynamic Generation (Advanced)

Use Zapier Code or Make.com HTTP module to generate unique .ics files per registration with correct date/time.

---

## Admin Notifications

**Option 1: Zapier/Make Multi-Step**

Add a second action in your Zap/scenario:
- **Send Email** to yourself (`kara.abdolmaleki@gmail.com`)
- **Subject:** "New webinar registration"
- **Body:**
  ```
  New registration:
  - Name: {{Customer Name}}
  - Email: {{Customer Email}}
  - Amount: $12
  - Date: {{Current Date}}
  ```

**Option 2: Stripe Dashboard**

Enable email notifications in Stripe:
- Go to **Settings** → **Notifications**
- Enable "Successful payments" notifications

**Option 3: Slack/Discord Webhook**

In Zapier/Make, add:
- **Slack** action → Send channel message
- Or **Webhooks** action → Post to Discord webhook

---

## Testing Checklist

### Before Going Live

- [ ] Stripe test payment completes successfully
- [ ] Webhook fires and reaches automation tool
- [ ] Email arrives within 2 minutes of payment
- [ ] Email contains correct Meet link
- [ ] Calendar file downloads (if implemented)
- [ ] Thank-you page displays correctly
- [ ] Admin notification received
- [ ] Mobile: Payment flow works on phone
- [ ] Mobile: Email displays correctly
- [ ] Test Meet link: Can join waiting room
- [ ] Host controls work (admit from waiting room)

### Test Payment Flow

1. Go to `/webinar` page
2. Click "Register Now" (use test mode link)
3. Enter test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify redirect to `/webinar/thank-you`
6. Check email inbox (2-5 minutes)
7. Click Meet link in email
8. Verify you can join meeting

### Switch to Live Mode

1. In Stripe, toggle to **Live Mode**
2. Create product again (products don't transfer from test to live)
3. Create new payment link (live mode)
4. Update `src/pages/webinar.astro` with live payment link
5. Update webhook URL to point to live automation
6. Test with real $12 payment
7. Refund yourself after successful test

---

## Week-by-Week Maintenance

### Sunday Morning (Session Day)

1. **Open Google Meet link** 10 minutes early
2. Test audio/video
3. Prepare screen share (slides/examples)
4. Wait in meeting for students to arrive (admit from waiting room)

### After Each Session

1. Send follow-up email to attendees:
   - Key takeaways
   - Practice task for the week
   - Link to next week's registration
2. Update webinar page with next week's topic:
   - Edit `src/pages/webinar.astro`
   - Change "Next Session: [Topic]" section
   - Update date to next Sunday
3. Optional: Edit recording → upload to YouTube (not immediate priority)

### Monthly Tasks

- Check Stripe dashboard for payment volume
- Review email deliverability (check spam reports)
- Update FAQ if students ask repeated questions
- Adjust curriculum if certain topics need more time

---

## Troubleshooting

### Email Not Delivered

**Issue:** Student paid but didn't receive email

**Solutions:**
1. Check Zapier/Make task history for errors
2. Check Stripe webhook logs (**Developers** → **Webhooks** → **Logs**)
3. Verify email isn't in spam folder (ask student)
4. Manually send email with Meet link
5. Check email automation tool's error logs

**Prevention:**
- Use a verified email sending domain (Gmail or authenticated SMTP)
- Add SPF/DKIM records if using custom domain

### Webhook Not Firing

**Issue:** Stripe payment completes but webhook doesn't trigger

**Solutions:**
1. Check Stripe webhook endpoint status (should be "active")
2. Test webhook manually in Stripe dashboard (send test event)
3. Verify webhook URL is correct and publicly accessible
4. Check webhook signing secret is correct in your automation tool
5. Review Stripe webhook logs for failed attempts

### Payment Link Not Working

**Issue:** "Register Now" button doesn't load Stripe Checkout

**Solutions:**
1. Verify payment link is in live mode (not test mode)
2. Check link format: `https://buy.stripe.com/...` or `https://checkout.stripe.com/...`
3. Test in incognito window (rule out browser cache)
4. Verify product is active in Stripe dashboard

### Meet Link Doesn't Work

**Issue:** Students can't join Google Meet

**Solutions:**
1. Test link yourself before session
2. Ensure waiting room is enabled (Quick Access = Off)
3. Verify recurring event in Google Calendar is set to "Weekly"
4. If link expired, create new recurring event and update email template

### Too Many Registrations

**Issue:** More than 20 students registered (capacity limit)

**Solutions:**
1. Create a second session (e.g., Sunday 2:00 PM EST)
2. Manually email excess students offering second session
3. Implement capacity limit in Stripe (set inventory tracking)

---

## Next Steps

### Immediate (Before First Session)

1. Complete Stripe setup (test mode → live mode)
2. Set up email automation (Zapier recommended)
3. Create Google Meet recurring event
4. Test full payment flow end-to-end
5. Update navigation to link `/webinar` page

### Week 1 (After First Session)

1. Collect feedback from students (quick survey)
2. Refine email template based on questions
3. Add FAQ items to webinar page
4. Schedule social media posts promoting webinar

### Month 1 (After 4 Sessions)

1. Evaluate revenue: 4 sessions × $12 × [# students]
2. Decide if pricing/timing/platform needs adjustment
3. Consider recording strategy (edit → YouTube)
4. Add testimonials from attendees to webinar page

### Future Enhancements

- **Subscription model:** $40/month for all 4 sessions (discount)
- **Replay access:** $$20 for recording of past sessions
- **Private Slack/Discord community** for monthly subscribers
- **Automated reminder sequence:** -24 hours, -1 hour email reminders

---

## Support

**Need help with setup?**

- **Stripe:** [stripe.com/docs](https://stripe.com/docs) or support@stripe.com
- **Zapier:** [zapier.com/help](https://zapier.com/help) or help@zapier.com
- **Make.com:** [make.com/help](https://make.com/help)
- **Google Meet:** [support.google.com/meet](https://support.google.com/meet)

**Custom development needed?**

If you want a fully custom Netlify Functions solution (no monthly Zapier fees), you can hire a developer or use the code template provided above.

---

## Summary Checklist

**Setup Phase:**
- [ ] Stripe account created
- [ ] Product created ($12 webinar)
- [ ] Payment link generated
- [ ] Webhook configured
- [ ] Google Meet recurring event created
- [ ] Meet link extracted and saved
- [ ] Email automation tool chosen (Zapier/Make/Netlify)
- [ ] Email template created
- [ ] Calendar file created (optional)
- [ ] Admin notification configured
- [ ] Full test payment completed
- [ ] Switched to live mode and tested again

**Pre-Launch:**
- [ ] Webinar page live at `/webinar`
- [ ] Navigation updated
- [ ] Payment link working (live mode)
- [ ] Email deliverability tested
- [ ] Meet link tested
- [ ] Thank-you page verified

**Weekly Operations:**
- [ ] Join Meet 10 min early
- [ ] Admit students from waiting room
- [ ] Deliver 45-min lesson + 15-min Q&A
- [ ] Send follow-up email with takeaways
- [ ] Update next week's topic on webinar page

---

**You're ready to launch! 🚀**

Once you've completed the setup checklist, you can start promoting your weekly webinars. Good luck with your first session!
