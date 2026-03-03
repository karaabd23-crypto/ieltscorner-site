# Netlify Webhook Setup Guide

Your webhook handler is now a Netlify Function that deploys automatically with your site. No separate hosting needed!

## Step 1: Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Make sure 2-factor authentication is enabled
3. Select:
   - **App:** Mail
   - **Device:** Windows Computer
4. Click **Generate**
5. Copy the 16-character password

## Step 2: Get Stripe API Keys

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Click **Developers** → **API Keys**
3. Copy:
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Go to **Developers** → **Webhooks**
5. Click **Add endpoint**
   - **Endpoint URL:** `https://ieltscorner.ca/.netlify/functions/stripe-webhook`
   - **Events to send:** Select `checkout.session.completed`
   - Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 3: Add Environment Variables to Netlify

1. Go to Netlify Dashboard: https://app.netlify.com
2. Select your site (ieltscorner-site)
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable** and add each of these:

**Variable 1:**
- **Key:** `GMAIL_USER`
- **Value:** `kara.abdolmaleki@gmail.com`

**Variable 2:**
- **Key:** `GMAIL_PASSWORD`
- **Value:** Your 16-character Gmail App Password from Step 1

**Variable 3:**
- **Key:** `STRIPE_API_KEY`
- **Value:** Your Stripe Secret Key from Step 2

**Variable 4:**
- **Key:** `STRIPE_WEBHOOK_SECRET`
- **Value:** Your Stripe Webhook Signing Secret from Step 2

5. Click **Save**

## Step 4: Deploy

The webhook function will deploy automatically when you push to GitHub (already set up).

Your webhook URL will be:
```
https://ieltscorner.ca/.netlify/functions/stripe-webhook
```

## Step 5: Update Stripe Webhook URL

1. Go back to Stripe Dashboard → **Developers** → **Webhooks**
2. Find your webhook endpoint
3. Update the URL to: `https://ieltscorner.ca/.netlify/functions/stripe-webhook`
4. Make sure `checkout.session.completed` event is selected
5. Save

## Step 6: Test

1. Go to your payment link: https://buy.stripe.com/4gM7sK3Gm4dC26l23ygMw01
2. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/28)
   - CVC: Any 3 digits (e.g., 123)
3. Complete payment
4. Check your email (the one you entered) for the Google Meet link

## Monitoring

To see webhook logs:
1. Go to Netlify Dashboard → **Functions**
2. Click on `stripe-webhook`
3. View logs to see successful/failed attempts

## Switch to Live Mode

Once testing works:
1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Update your webhook endpoint with the live signing secret in Netlify
3. Done!

## Troubleshooting

**Email not sending:**
- Check Netlify function logs for errors
- Verify Gmail App Password is correct (16 chars, no spaces)
- Make sure 2FA is enabled on Gmail account

**Webhook not firing:**
- Verify webhook URL in Stripe is correct: `https://ieltscorner.ca/.netlify/functions/stripe-webhook`
- Check that `checkout.session.completed` event is selected
- Check Stripe webhook logs in Stripe Dashboard

**Function not deploying:**
- Check Netlify build logs for Python errors
- Verify `requirements.txt` is in `netlify/functions/` folder

---

✅ **That's it!** Your automation is now fully integrated with your Netlify site. No separate server needed, no monthly costs, completely automated.
