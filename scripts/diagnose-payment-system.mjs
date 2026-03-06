/**
 * Comprehensive Webinar Payment System Diagnostic
 * Checks all components of the payment → email delivery flow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 WEBINAR PAYMENT SYSTEM DIAGNOSTIC\n');
console.log('Checking all components of the payment flow...\n');

// 1. Check environment variables (local .env)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1️⃣  LOCAL ENVIRONMENT VARIABLES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const hasGmailUser = envContent.includes('GMAIL_USER=');
  const hasGmailPass = envContent.includes('GMAIL_PASSWORD=');
  const hasStripeKey = envContent.includes('STRIPE_API_KEY=');
  const hasWebhookSecret = envContent.includes('STRIPE_WEBHOOK_SECRET=');
  
  console.log(`   ${hasGmailUser ? '✅' : '❌'} GMAIL_USER`);
  console.log(`   ${hasGmailPass ? '✅' : '❌'} GMAIL_PASSWORD`);
  console.log(`   ${hasStripeKey ? '✅' : '❌'} STRIPE_API_KEY`);
  console.log(`   ${hasWebhookSecret ? '✅' : '❌'} STRIPE_WEBHOOK_SECRET`);
  
  if (!hasGmailUser || !hasGmailPass || !hasStripeKey || !hasWebhookSecret) {
    console.log('\n⚠️  Missing environment variables in .env');
    console.log('   See PAYMENT_ISSUE_FIX.md for setup instructions');
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Create .env file with required variables');
  console.log('   See PAYMENT_ISSUE_FIX.md for setup instructions');
}

// 2. Check webhook function exists
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('2️⃣  NETLIFY WEBHOOK FUNCTION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const webhookPath = path.join(__dirname, '..', 'netlify', 'functions', 'stripe-webhook', '__init__.py');
const webhookExists = fs.existsSync(webhookPath);

if (webhookExists) {
  console.log('✅ Webhook function exists at:');
  console.log('   netlify/functions/stripe-webhook/__init__.py');
  
  const webhookContent = fs.readFileSync(webhookPath, 'utf-8');
  const hasCheckoutHandler = webhookContent.includes('checkout.session.completed');
  const hasSendEmail = webhookContent.includes('def send_email');
  const hasGoogleMeetLink = webhookContent.includes('meet.google.com');
  
  console.log(`   ${hasCheckoutHandler ? '✅' : '❌'} Handles checkout.session.completed event`);
  console.log(`   ${hasSendEmail ? '✅' : '❌'} Has send_email function`);
  console.log(`   ${hasGoogleMeetLink ? '✅' : '❌'} Contains Google Meet link`);
} else {
  console.log('❌ Webhook function not found');
}

// 3. Check if webhook is deployed and responding
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('3️⃣  WEBHOOK DEPLOYMENT STATUS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const webhookUrl = 'https://ieltscorner.ca/.netlify/functions/stripe-webhook';
console.log(`Testing: ${webhookUrl}\n`);

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'diagnostic' })
  });
  
  const status = response.status;
  
  if (status === 400 || status === 405) {
    console.log('✅ Webhook is deployed and responding');
    console.log(`   Status: ${status} (expected for test request)`);
    console.log('   400/405 = webhook is live but rejects invalid requests');
  } else if (status === 200) {
    console.log('✅ Webhook is deployed and responding');
    console.log('   Status: 200 OK');
  } else if (status === 404) {
    console.log('❌ Webhook NOT deployed');
    console.log('   Status: 404 Not Found');
    console.log('   Push code to trigger Netlify deployment');
  } else {
    console.log(`⚠️  Unexpected status: ${status}`);
  }
} catch (error) {
  console.log('❌ Cannot reach webhook');
  console.log(`   Error: ${error.message}`);
}

// 4. Check webinar thank-you page
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('4️⃣  THANK YOU PAGE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const thankYouPath = path.join(__dirname, '..', 'src', 'pages', 'webinar', 'thank-you.astro');
const thankYouExists = fs.existsSync(thankYouPath);

if (thankYouExists) {
  console.log('✅ Thank you page exists at:');
  console.log('   src/pages/webinar/thank-you.astro');
  console.log('   URL: https://ieltscorner.ca/webinar/thank-you');
} else {
  console.log('❌ Thank you page not found');
}

// 5. Check Stripe Payment Link in webinar page
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('5️⃣  STRIPE PAYMENT LINK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const webinarPagePath = path.join(__dirname, '..', 'src', 'pages', 'webinar.astro');
const webinarPageExists = fs.existsSync(webinarPagePath);

if (webinarPageExists) {
  const content = fs.readFileSync(webinarPagePath, 'utf-8');
  const stripeLinkMatch = content.match(/https:\/\/buy\.stripe\.com\/[a-zA-Z0-9]+/);
  
  if (stripeLinkMatch) {
    console.log('✅ Stripe Payment Link found:');
    console.log(`   ${stripeLinkMatch[0]}`);
  } else {
    console.log('❌ No Stripe Payment Link found in webinar page');
  }
} else {
  console.log('❌ Webinar page not found');
}

// Summary and next steps
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 SUMMARY & NEXT STEPS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ = Working correctly');
console.log('❌ = Needs attention');
console.log('⚠️  = Check manually\n');

console.log('CRITICAL CHECKS FOR NETLIFY DEPLOYMENT:\n');
console.log('1. Go to Netlify Dashboard → Site configuration → Environment variables');
console.log('   Verify all 4 variables are set:');
console.log('   - GMAIL_USER');
console.log('   - GMAIL_PASSWORD (16-char App Password from Google)');
console.log('   - STRIPE_API_KEY');
console.log('   - STRIPE_WEBHOOK_SECRET\n');

console.log('2. Go to Stripe Dashboard → Developers → Webhooks');
console.log('   Verify endpoint exists and is active:');
console.log('   - URL: https://ieltscorner.ca/.netlify/functions/stripe-webhook');
console.log('   - Events: checkout.session.completed');
console.log('   - Status: Active\n');

console.log('3. Go to Stripe Dashboard → Payment Links');
console.log('   Find your webinar payment link and check:');
console.log('   - After payment → Success page: Custom URL');
console.log('   - URL: https://ieltscorner.ca/webinar/thank-you\n');

console.log('MANUAL FIX (if someone already paid):');
console.log('   node scripts/send-manual-webinar-email.mjs customer@email.com "Customer Name"\n');

console.log('TESTING (after fixes):');
console.log('   1. Make a test payment using Stripe test mode');
console.log('   2. Check email inbox for confirmation');
console.log('   3. Check Stripe webhook logs for activity\n');

console.log('For detailed instructions, see: PAYMENT_ISSUE_FIX.md\n');
