# Cloudflare Telegram Bot Migration

This moves the Telegram webhook off Netlify Functions and onto a Cloudflare Worker.

## What changed

- Shared bot logic now lives in `scripts/lib/telegram-bot-core.mjs`
- Netlify still works as a fallback through `netlify/functions/telegram-webhook.js`
- Cloudflare Worker entry lives in `workers/telegram-bot/src/index.mjs`
- Wrangler config lives in `workers/telegram-bot/wrangler.jsonc`

## Why this helps

Every incoming Telegram bot update currently spends Netlify function usage. Moving the webhook to Cloudflare shifts that traffic away from Netlify while keeping the static site on Netlify.

## Required Cloudflare secrets

Set these as Worker secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_URL`
- `WEBSITE_URL`
- `TELEGRAM_OWNER_USERNAME`
- `TELEGRAM_OWNER_CHAT_ID`
- `CONTACT_EMAIL`
- `TELEGRAM_WEBHOOK_SECRET`

## Local dev

From the repo root:

```powershell
npx wrangler dev --config workers/telegram-bot/wrangler.jsonc
```

## Deploy

From the repo root:

```powershell
npx wrangler deploy --config workers/telegram-bot/wrangler.jsonc
```

Cloudflare will return a `workers.dev` URL after deploy.

## Point Telegram to Cloudflare

After deploy, update the Telegram webhook:

```powershell
node scripts/set-telegram-webhook.mjs --url "https://<your-worker>.workers.dev" --secret "<your-secret>"
```

If you want to clear queued old updates too:

```powershell
node scripts/set-telegram-webhook.mjs --url "https://<your-worker>.workers.dev" --secret "<your-secret>" --drop-pending
```

## Safe cutover

1. Deploy the Worker.
2. Set the same secrets used by Netlify.
3. Point Telegram webhook to the Worker URL.
4. Test `/start` and button clicks.
5. Keep the Netlify function in place until Cloudflare is confirmed stable.
