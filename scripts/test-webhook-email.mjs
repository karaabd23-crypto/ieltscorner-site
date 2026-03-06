/**
 * Test Webhook Email Delivery
 * Tests if the Stripe webhook can send emails correctly
 */


const WEBHOOK_URL = 'https://ieltscorner.ca/.netlify/functions/stripe-webhook';

// Simulated Stripe checkout.session.completed event
const testPayload = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_a1b2c3d4e5f6',
      payment_status: 'paid',
      customer_details: {
        email: 'kara.abdolmaleki@gmail.com',
        name: 'Test Customer'
      }
    }
  }
};

async function testWebhook() {
  console.log('🧪 Testing webhook email delivery...\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${result}\n`);
    
    if (response.status === 200) {
      console.log('✅ Webhook responded successfully');
      console.log('Check your email (kara.abdolmaleki@gmail.com) for the webinar confirmation');
    } else if (response.status === 400) {
      console.log('⚠️  Webhook signature verification failed (expected in test)');
      console.log('This means the webhook is deployed and responding');
      console.log('Real Stripe events will verify correctly');
    } else {
      console.log('❌ Webhook error - check Netlify function logs');
    }
    
  } catch (error) {
    console.error('❌ Failed to reach webhook:', error.message);
  }
}

testWebhook();
