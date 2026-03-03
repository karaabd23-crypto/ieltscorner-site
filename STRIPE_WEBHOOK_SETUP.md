# Python Stripe Webhook Setup Guide

## Overview
This script replaces Zapier entirely. When a customer pays for the webinar, Stripe sends a webhook event to your server, which automatically sends them the Google Meet link via email.

**Key benefits:**
- Free (no Zapier subscription)
- Instant email delivery
- Full control over the code
- Can be deployed anywhere (Vercel, Railway, your own server, etc.)

---

## Step 1: Set Up Gmail App Password

Your Python script will send emails through Gmail's SMTP server. You need an "App Password" (not your regular Gmail password).

1. Go to: https://myaccount.google.com/apppasswords
2. You must have 2-factor authentication enabled. If not, enable it first.
3. Select:
   - **Select the app:** Mail
   - **Select the device:** Windows Computer (or your OS)
4. Click **Generate**
5. Google will show a 16-character password. **Copy it exactly.**
6. Save this password somewhere safe—you'll need it in Step 3.

---

## Step 2: Get Stripe API Keys

1. Go to your Stripe Dashboard: https://dashboard.stripe.com
2. Click **Developers** (bottom left) → **API Keys**
3. Make sure you're in **Test mode** or **Live mode** (pick one—test for development, live for production)
4. Copy your:
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)

5. Now go to **Webhooks** (under Developers)
6. Click **Add endpoint**
   - **Endpoint URL:** (we'll get this in Step 4)
   - **Events to send:** Select only `checkout.session.completed`
   - Click **Add endpoint**
7. After creating the endpoint, click on it and copy:
   - **Signing secret** (starts with `whsec_`)

Save all three keys.

---

## Step 3: Create `.env` File

1. In your project root (`ieltscorner-site/`), create a file named `.env` (not `.env.webhook.example`)
2. Copy this and fill in your values:

```
GMAIL_USER=kara.abdolmaleki@gmail.com
GMAIL_PASSWORD=your-16-char-app-password-here
STRIPE_API_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here
```

Replace:
- `GMAIL_USER` with your Gmail address
- `GMAIL_PASSWORD` with the 16-char App Password from Step 1
- `STRIPE_API_KEY` with your Stripe Secret Key from Step 2
- `STRIPE_WEBHOOK_SECRET` with your webhook signing secret from Step 2

**Important:** Never commit `.env` to Git. It's already in `.gitignore`.

---

## Step 4: Install Dependencies

In your project terminal:

```bash
pip install flask stripe python-dotenv
```

---

## Step 5: Run Locally to Test

1. Start the script:
```bash
python stripe_webhook_handler.py
```

You should see:
```
Starting Stripe Webhook Server...
Listening at http://localhost:5000/webhook
```

2. Keep this running in one terminal.

3. In another terminal, trigger a test webhook from Stripe:
   - Go to https://dashboard.stripe.com → Developers → Webhooks
   - Find your endpoint
   - Click **Send test event**
   - Select one of the events (it doesn't matter which for now)
   - Click **Send test event**

4. Watch your script output. You should see something like:
```
--- New Webinar Registration ---
Checkout Session ID: cs_test_xxxxx
Payment Status: paid
✓ Email sent to test@example.com
```

5. Check your email—you should receive the webinar confirmation!

---

## Step 6: Deploy to Production

Once verified locally, you need to deploy this script to a public URL so Stripe can reach it.

### Option A: Deploy to Railway.app (Recommended - easy & free tier)

1. Create a `requirements.txt` in your project:
```
Flask==2.3.3
stripe==5.14.0
python-dotenv==1.0.0
```

2. Create a `railway.json` in your project root:
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "python stripe_webhook_handler.py"
  }
}
```

3. Sign up at https://railway.app
4. Connect your GitHub repo
5. Add environment variables:
   - In Railway dashboard, go to your project
   - Click **Variables**
   - Add all four from your `.env` file
6. Railway will auto-deploy and give you a public URL like `https://yourproject-production.up.railway.app`
7. Go back to Stripe Webhooks and update the endpoint URL to:
   ```
   https://yourproject-production.up.railway.app/webhook
   ```

### Option B: Deploy to Vercel (Node/Python support)

Similar to Railway—connect your repo, add environment variables, deploy. Vercel will handle it.

### Option C: Use Your Own Server

If you have hosting already, SSH in and:
```bash
git clone your-repo
cd ieltscorner-site
pip install -r requirements.txt
python stripe_webhook_handler.py &  # Run in background
```

---

## Step 7: Test with Real Payment

1. Go to your webinar page: `/webinar`
2. Click **Register for this Saturday**
3. Use a Stripe test card (if in test mode):
   - Card: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
4. Complete the checkout
5. Check your email—you should receive the confirmation with the Google Meet link

---

## Step 8: Go Live

When ready:

1. Update your Stripe webhook signing secret to **Live mode**
2. Update your `.env` to use **Live mode** Stripe keys (`sk_live_...`)
3. Redeploy (Railway auto-deploys on push; others may need manual restart)
4. Move Stripe from Test to Live mode
5. Test with a real payment using your $12 price

---

## Troubleshooting

### Email not sending?
- Check that your Gmail App Password is exactly 16 characters
- Make sure 2-factor authentication is enabled on Gmail
- Check the script output for error messages

### Webhook not reaching your server?
- Check Stripe Dashboard → Developers → Webhooks → your endpoint
- Click the endpoint and scroll down to see recent events (should show `200`)
- If showing errors, check the deployed server logs

### Customer email is empty?
- Make sure you're collecting email on your checkout form
- In your Stripe Checkout session, set `customer_creation` to enforce email collection

### Script crashes on startup?
- Make sure `.env` exists and has all 4 variables
- Check that `python-dotenv` is installed: `pip install python-dotenv`
- Run `python stripe_webhook_handler.py` to see the exact error

---

## Next Steps

After this is working:

1. **Test a few payments** to ensure emails arrive instantly
2. **Monitor the script logs** for the first week
3. **Optional:** Add an admin notification (send a copy to yourself)
   - Uncomment lines in `stripe_webhook_handler.py` and add another `send_email()` call
4. **Optional:** Add a 24-hour reminder email (requires a cron job or scheduled task)

---

## How It Works (Summary)

1. Customer clicks "Register for this Saturday" on `/webinar`
2. They pay $12 via Stripe Checkout
3. Stripe sends a webhook event to your deployed server
4. Your Python script receives it and verifies the signature
5. Script queries Stripe for the customer's email and name
6. Script sends an email with the Google Meet link
7. Customer receives email instantly (usually within 10 seconds)

Done. No Zapier. No subscriptions. Just code.
