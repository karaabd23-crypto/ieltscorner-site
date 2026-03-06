/**
 * Netlify Function: Validate Tutoring Payment Session
 * 
 * This function validates a Stripe checkout session for tutoring payments.
 * It ensures users can only access the booking calendar after paying.
 * 
 * Environment variables needed:
 * - STRIPE_API_KEY
 * - TUTORING_CALENDAR_URL (Google Calendar booking link)
 */

import Stripe from 'stripe';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const TUTORING_CALENDAR_URL = process.env.TUTORING_CALENDAR_URL || 'https://calendar.google.com/calendar/appointments/schedules/YOUR_SCHEDULE_ID';
const TUTORING_AMOUNT_CENTS = Number.parseInt(process.env.TUTORING_AMOUNT_CENTS || '3000', 10);

// Session validity period (24 hours in milliseconds)
const SESSION_VALIDITY_PERIOD = 24 * 60 * 60 * 1000;

export async function handler(event, context) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { sessionId } = JSON.parse(event.body);

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Session ID is required', reason: 'Missing session_id query parameter' })
      };
    }

    if (!STRIPE_API_KEY) {
      console.error('Missing STRIPE_API_KEY environment variable');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error', reason: 'Missing STRIPE_API_KEY in Netlify environment variables' })
      };
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_API_KEY);

    // Retrieve the checkout session
    const session = await stripe.checkout.Session.retrieve(sessionId);

    // Validate the session
    const now = Date.now();
    const sessionCreatedAt = session.created * 1000; // Convert to milliseconds
    const sessionAge = now - sessionCreatedAt;

    // Check if session is valid
    // Use minimum threshold (not exact equality) so taxes/fees/currency adjustments do not break valid payments.
    const amountTotal = Number(session.amount_total ?? 0);
    const amountMatches = amountTotal >= TUTORING_AMOUNT_CENTS;
    const isValid = 
      session.payment_status === 'paid' &&
      session.status === 'complete' &&
      amountMatches &&
      sessionAge <= SESSION_VALIDITY_PERIOD;

    if (!isValid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          valid: false, 
          reason: sessionAge > SESSION_VALIDITY_PERIOD
            ? 'Session expired (older than 24 hours)'
            : !amountMatches
              ? `Invalid session amount for tutoring (expected at least ${TUTORING_AMOUNT_CENTS}, got ${amountTotal})`
              : `Payment not confirmed (payment_status=${session.payment_status}, status=${session.status})`
        })
      };
    }

    // Session is valid - return booking URL
    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        bookingUrl: TUTORING_CALENDAR_URL,
        customerEmail: session.customer_details?.email || null,
        customerName: session.customer_details?.name || null
      })
    };

  } catch (error) {
    console.error('Session validation error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid session ID', reason: 'Session ID not found in the Stripe account for this API key (possible live/test key mismatch)' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Validation failed', reason: error?.message || 'Unknown server error' })
    };
  }
}
