# Tutoring Payment Security Setup Guide

## Problem Fixed

**Issue**: Users who paid once could bookmark the Google Calendar booking link and reuse it to book multiple sessions without paying again.

**Solution**: Created a protected tutoring success page that validates each payment before showing the booking calendar link.

## How It Works Now

1. User clicks "Pay CA$30" button on `/tutoring` page
2. Stripe processes payment and redirects to `/tutoring/success?session_id=...`
3. Success page validates the Stripe session via Netlify function
4. If valid, shows one-time booking instructions and calendar link
5. Each new booking requires a new payment

## Setup Instructions

### 1. Configure Stripe Payment Link

In your Stripe Dashboard:

1. Go to **Products** → Find your **Private Tutoring** product
2. Click on the payment link (e.g., `https://buy.stripe.com/7sYfZg90GcK826lgYsgMw00`)
3. Click **Edit** → **After payment**
4. Set the success URL to:
   ```
   https://ieltscorner.ca/tutoring/success?session_id={CHECKOUT_SESSION_ID}
   ```
5. **Important**: Use the exact format above with `{CHECKOUT_SESSION_ID}` - Stripe will replace this with the actual session ID

### 2. Add Environment Variables to Netlify

Go to Netlify Dashboard → Your site → **Site settings** → **Environment variables**

Add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `STRIPE_API_KEY` | `sk_live_...` or `sk_test_...` | Your Stripe secret key |
| `TUTORING_CALENDAR_URL` | `https://calendar.google.com/calendar/appointments/schedules/YOUR_SCHEDULE_ID` | Your Google Calendar booking link |
| `TUTORING_PRICE_ID` | `price_...` (optional) | Your tutoring product price ID from Stripe |

**To find your Google Calendar booking link:**
1. Go to Google Calendar → Settings → Appointment schedules
2. Find your tutoring appointment schedule
3. Click "Copy link" - use this full URL

### 3. Install Dependencies

Run in your project:
```bash
npm install stripe
```

This has already been added to package.json.

### 4. Deploy to Netlify

After setting environment variables:

1. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "Add tutoring payment security validation"
   git push origin main
   ```

2. Netlify will automatically rebuild and deploy

3. Verify the deploy succeeded in Netlify Dashboard → **Deploys**

### 5. Test the Flow

**Test Mode (Recommended First):**

1. Use Stripe test mode keys in Netlify environment variables
2. Create a test payment link in Stripe Dashboard (test mode)
3. Update `STRIPE_PRIVATE_PAY_URL` in `src/pages/tutoring/index.astro` to the test link
4. Complete a test payment with card: `4242 4242 4242 4242`
5. Verify you're redirected to `/tutoring/success` with session validation
6. Verify the calendar booking link appears

**Live Mode:**

1. Switch to live Stripe keys in Netlify
2. Update payment link in `src/pages/tutoring/index.astro` to live link  
3. Test with a real payment (you can refund it after)

## Security Features

### Session Validation

The validation function (`netlify/functions/validate-tutoring-session.mjs`) checks:

- ✅ Session ID is valid and exists in Stripe
- ✅ Payment status is "paid"
- ✅ Session status is "complete"
- ✅ Session is less than 24 hours old (prevents old session reuse)

### What This Prevents

- ❌ Bookmarking the calendar link for reuse
- ❌ Sharing the calendar link with others
- ❌ Using old session IDs after expiration
- ❌ Direct access to success page without payment

## Maintenance

### Updating Calendar Link

If you change your Google Calendar booking link:

1. Go to Netlify → Site settings → Environment variables
2. Update `TUTORING_CALENDAR_URL` with new link
3. Trigger a new deploy (or wait for next deploy)

### Adjusting Session Validity Period

By default, sessions are valid for 24 hours. To change this:

Edit `netlify/functions/validate-tutoring-session.mjs`:

```javascript
// Change from 24 hours to desired duration
const SESSION_VALIDITY_PERIOD = 24 * 60 * 60 * 1000; // milliseconds
```

Examples:
- 12 hours: `12 * 60 * 60 * 1000`
- 1 hour: `60 * 60 * 1000`
- 48 hours: `48 * 60 * 60 * 1000`

## Troubleshooting

### "Payment validation failed" error

**Possible causes:**
- Stripe API key not set or invalid
- Session ID expired (>24 hours old)
- Payment not completed
- Wrong environment (test vs live keys)

**Fix:**
- Check Netlify environment variables are set correctly
- Check Netlify Functions logs: Netlify Dashboard → Functions → validate-tutoring-session
- Verify session in Stripe Dashboard → Payments → Search by session ID

### Calendar link not showing

**Possible causes:**
- `TUTORING_CALENDAR_URL` not set in Netlify
- Validation function returning error

**Fix:**
- Check browser console for error messages
- Verify environment variable is set
- Check Netlify Functions logs

### Users seeing old booking instructions

**Fix:**
- Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Make sure latest deploy succeeded

## Support

If you encounter issues:

1. Check Netlify Functions logs
2. Test with Stripe test mode first
3. Verify all environment variables are set
4. Check browser console for JavaScript errors

## Files Modified

- ✅ `src/pages/tutoring/success.astro` - New success page with validation
- ✅ `src/pages/tutoring/index.astro` - Updated messaging and payment policy
- ✅ `netlify/functions/validate-tutoring-session.mjs` - New validation function
- ✅ `package.json` - Added Stripe dependency

---

**Last Updated**: March 2026  
**Status**: ✅ Ready for deployment
