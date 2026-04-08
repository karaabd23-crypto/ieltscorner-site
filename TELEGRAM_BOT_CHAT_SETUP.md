# Telegram Bot Chat + Contact Flow Setup

This adds DM chat capability to your Telegram bot using a Netlify webhook function.

## What this enables

- Bot replies in private chat (`/start`, `IELTS`, `CELPIP`, `website`, `contact`, etc.)
- Admin-only DM commands for channel inspection and observed-member export
- Admin-only DM command for sending a group invite message to known bot users by username
- Quick action buttons:
  - Visit website
  - Open channel
  - IELTS/CELPIP guidance
  - Contact Kay
- Contact details shown from env vars (`TELEGRAM_OWNER_USERNAME`, `CONTACT_EMAIL`)

## Files

- `netlify/functions/telegram-webhook.js`
- `scripts/set-telegram-webhook.mjs`

## Required environment variables (Netlify)

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_URL`
- `TELEGRAM_GROUP_INVITE_URL` (if you want the bot to send study-group invites)
- `WEBSITE_URL` (recommended)

Recommended:

- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_OWNER_USERNAME`
- `CONTACT_EMAIL`

## Deploy

Push your changes to trigger Netlify deploy.

After deploy, your webhook endpoint is:

`https://<your-netlify-domain>/.netlify/functions/telegram-webhook`

## Register Telegram webhook

Set these in local `.env` (or pass as CLI args):

- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_WEBHOOK_URL=https://<your-netlify-domain>/.netlify/functions/telegram-webhook`
- `TELEGRAM_WEBHOOK_SECRET=<random-long-string>` (optional but recommended)

Run:

```bash
npm run telegram:webhook:set
```

Or with explicit args:

```bash
node scripts/set-telegram-webhook.mjs --url "https://<your-netlify-domain>/.netlify/functions/telegram-webhook" --secret "<random-long-string>" --drop-pending
```

## Verify

1. Open your bot in Telegram and send `/start`
2. Tap quick buttons and confirm responses
3. Send words like `IELTS`, `CELPIP`, `website`, `contact`

## Notes

- This chat webhook handles **private DM messages**, not channel post comments.
- Keep scheduled posting workflow as-is for channel content publishing.
- `npm run telegram:webhook:set` now subscribes the bot to `chat_member` and `chat_join_request` updates so admin-only member observation can work.
- Telegram still does **not** expose a full member list for channels to bots. The bot can only export usernames it has actually observed through join requests or member-status updates.
- `/invitegroup @username1 @username2 | Optional custom message` only works for people who already started the bot. Telegram bots cannot initiate a new DM to an arbitrary username.

## Admin invite command

If `TELEGRAM_OWNER_CHAT_ID` and `TELEGRAM_GROUP_INVITE_URL` are set, you can send a group invite message to known bot users with:

```bash
/invitegroup @username1 @username2 | Optional custom message
```

Example:

```bash
/invitegroup @alice @bob | Join the private study group for weekly speaking practice.
```
