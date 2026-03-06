import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const GOOGLE_MEET_LINK = 'https://meet.google.com/hcf-iwcn-syx';

function buildEmailHtml(customerName, gmailUser) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f4f3;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:16px;">
        <table role="presentation" style="width:100%;max-width:640px;background:#fff;border:1px solid #e9e1dc;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#d94848;padding:18px 24px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;">REGISTRATION CONFIRMED</h1>
              <p style="margin:6px 0 0;color:#ffeaea;font-size:14px;">CELPIP Weekly Webinar</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1d1d1d;">Dear ${customerName},</p>
              <p style="margin:0 0 14px;color:#2b2b2b;line-height:1.5;">Your payment has been processed and your webinar registration is confirmed.</p>
              <div style="background:#f3f3f3;border-left:4px solid #d94848;padding:12px;border-radius:5px;margin-bottom:14px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#333;">Join Your Webinar</p>
                <p style="margin:0;color:#d94848;font-size:16px;font-family:'Courier New',monospace;font-weight:700;word-break:break-all;">${GOOGLE_MEET_LINK}</p>
              </div>
              <p style="margin:0 0 8px;color:#333;">Saturday • 6:00 PM PST • 60 minutes • Google Meet</p>
              <p style="margin:0;color:#333;">Please join 5 minutes early for audio/video setup.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f1ef;padding:12px 22px;border-top:1px solid #e6ddd7;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1f1f1f;">IELTS Corner</p>
              <p style="margin:0;font-size:12px;color:#666;">${gmailUser} | ieltscorner.ca</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(customerName, gmailUser) {
  return `IELTS Corner — CELPIP Weekly Webinars

Registration Confirmed ✓

Hi ${customerName},

You're all set! Thank you for registering for this week's CELPIP webinar.

SESSION DETAILS
When: Saturday, 6:00 PM PST
Duration: 60 minutes
Format: Live on Google Meet

JOIN WEBINAR
${GOOGLE_MEET_LINK}

Please join 5 minutes early.

IELTS Corner
${gmailUser}
https://ieltscorner.ca`;
}

async function sendEmail({ gmailUser, gmailPassword, customerEmail, customerName }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  await transporter.sendMail({
    from: `IELTS Corner <${gmailUser}>`,
    to: customerEmail,
    subject: '✅ Your CELPIP Webinar Registration — Saturday 6:00 PM PST',
    text: buildEmailText(customerName, gmailUser),
    html: buildEmailHtml(customerName, gmailUser),
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const stripeApiKey = process.env.STRIPE_API_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const gmailUser = process.env.GMAIL_USER || 'kara.abdolmaleki@gmail.com';
  const gmailPassword = process.env.GMAIL_PASSWORD;

  if (!stripeApiKey || !webhookSecret || !gmailPassword) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server not configured: missing Stripe/Gmail env vars' }),
    };
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing Stripe signature' }),
    };
  }

  let stripeEvent;
  try {
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2020-08-27' });
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, webhookSecret);

    if (stripeEvent.type !== 'checkout.session.completed') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', type: stripeEvent.type }),
      };
    }

    const session = stripeEvent.data.object;
    if (session.payment_status !== 'paid') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', reason: 'not_paid' }),
      };
    }

    const customerEmail = session?.customer_details?.email;
    const customerName = session?.customer_details?.name || 'there';

    if (!customerEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing customer email in checkout session' }),
      };
    }

    await sendEmail({
      gmailUser,
      gmailPassword,
      customerEmail,
      customerName,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', message: 'Confirmation email sent' }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error?.message || 'Webhook processing failed' }),
    };
  }
};
