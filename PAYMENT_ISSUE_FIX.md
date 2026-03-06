# Payment Issue Fix Guide

## Problem
User paid $12 for webinar but didn't receive confirmation email or Google Meet link.

## Root Causes (Check all 4)

### 1. Stripe Payment Link Missing Success URL

**Check:** Go to Stripe Dashboard → Payment Links → Find your webinar link  
**Expected:** Success URL should be `https://ieltscorner.ca/webinar/thank-you`  
**If missing or wrong:**
1. Click on the payment link
2. Click "Update link"
3. Under "After payment" section:
   - **Success page:** Custom URL
   - **URL:** `https://ieltscorner.ca/webinar/thank-you`
4. Save changes

### 2. Webhook Not Configured in Stripe

**Check:** Stripe Dashboard → Developers → Webhooks  
**Expected:** Endpoint `https://ieltscorner.ca/.netlify/functions/stripe-webhook` should exist and be active  
**If missing:**
1. Click "Add endpoint"
2. Endpoint URL: `https://ieltscorner.ca/.netlify/functions/stripe-webhook`
3. Events to send: Select `checkout.session.completed`
4. Click "Add endpoint"
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Netlify environment variables (see #3)

### 3. Missing Netlify Environment Variables

**Check:** Netlify Dashboard → Site configuration → Environment variables  
**Required variables:**
- `GMAIL_USER` = kara.abdolmaleki@gmail.com
- `GMAIL_PASSWORD` = 16-character Gmail App Password
- `STRIPE_API_KEY` = Your Stripe Secret Key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET` = Webhook signing secret from Stripe (whsec_...)

**To get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Must have 2-factor authentication enabled
3. Select App: Mail, Device: Windows Computer
4. Click Generate
5. Copy the 16-character password
6. Add to Netlify: `GMAIL_PASSWORD`

### 4. Webhook Not Receiving Events

**Check:** Stripe Dashboard → Developers → Webhooks → [Your endpoint] → Logs  
**Expected:** Should see events when test payments are made  
**If no events showing:**
- Webhook URL might be wrong
- Webhook might be in test mode but payment link is in live mode (or vice versa)
- Check that event type `checkout.session.completed` is selected

---

## Immediate Fix (Send Email Manually)

If someone paid and needs their link RIGHT NOW:

```bash
cd c:\Users\Karaa\Documents\ieltscorner-site
node scripts/send-manual-webinar-email.mjs customer@email.com "Customer Name"
```

**Example:**
```bash
node scripts/send-manual-webinar-email.mjs john@example.com "John Smith"
```

This sends the confirmation email with the Google Meet link immediately.

---

## Testing the Fix

### Test 1: Check if webhook responds

```bash
node scripts/test-webhook-email.mjs
```

Expected: Should get 200 or 400 response (400 is ok for test, means webhook is deployed)

### Test 2: Make a test payment

1. In Stripe Dashboard, switch to **Test mode**
2. Create a test Payment Link (or use existing test link)
3. Use test card: `4242 4242 4242 4242`, any future date, any CVC
4. Complete checkout
5. Check email inbox for confirmation
6. Check Stripe webhook logs for activity

### Test 3: Check Netlify function logs

1. Go to Netlify Dashboard → Functions → `stripe-webhook`
2. Look for recent invocations
3. Check for errors in logs
4. Common errors:
   - "Missing Stripe signature" = webhook not getting requests from Stripe
   - "Invalid signature" = STRIPE_WEBHOOK_SECRET is wrong
   - "Failed to send email" = Gmail credentials issue

---

## Verification Checklist

- [ ] Stripe Payment Link has success URL: `https://ieltscorner.ca/webinar/thank-you`
- [ ] Webhook endpoint exists in Stripe and is active
- [ ] Webhook listens for `checkout.session.completed` event
- [ ] All 4 environment variables set in Netlify
- [ ] Gmail App Password is generated and correct
- [ ] Webhook signing secret matches between Stripe and Netlify
- [ ] Test payment sends email successfully
- [ ] Webhook logs show successful event processing

---

## Quick Reference

**Google Meet Link (for manual sending):**  
https://meet.google.com/hcf-iwcn-syx

**Webinar Schedule:**  
Every Saturday at 6:00 PM PST

**Thank You Page:**  
https://ieltscorner.ca/webinar/thank-you

**Webhook URL:**  
https://ieltscorner.ca/.netlify/functions/stripe-webhook

**Stripe Payment Link (Current):**  
https://buy.stripe.com/4gM7sK3Gm4dC26l23ygMw01
