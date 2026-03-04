# Telegram Auto-Posting (IELTS / CELPIP / ESL)

This project now includes an automated workflow that:

- Generates one micro-lesson post for IELTS/CELPIP/ESL learners
- Publishes it to your Telegram channel
- Publishes a quiz poll right after the post
- Runs automatically every Monday, Wednesday, and Friday

## Files added

- `.github/workflows/telegram-auto-post.yml`
- `scripts/post-telegram-content.mjs`

## Required GitHub secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and set:

- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (e.g. `@yourchannel` or numeric `-100...`)

Optional:

- `TELEGRAM_CHANNEL_URL` (used as CTA in the post and can auto-resolve chat id if `TELEGRAM_CHAT_ID` is missing)
- `TELEGRAM_POST_TEMPLATE` (style instructions you want the generator to follow)

## Telegram bot setup checklist

1. Create a bot in Telegram with `@BotFather`
2. Copy the bot token into `TELEGRAM_BOT_TOKEN`
3. Add bot as **admin** in your channel
4. Set `TELEGRAM_CHAT_ID`

## Local test

The script auto-loads environment values from `.env` and `.env.local`.

Run a dry run (no posting):

```bash
npm run telegram:post:dry
```

Manual run with options:

```bash
node scripts/post-telegram-content.mjs --exam IELTS --topic "Writing Task 2 thesis statements" --dry-run
```

## Manual workflow run in GitHub

In **Actions → Auto-post Telegram content → Run workflow**:

- `exam`: `auto`, `IELTS`, `CELPIP`, or `ESL`
- `topic`: optional custom topic
- `dry_run`: set `true` to preview only

## Schedule

Current cron in workflow:

- `0 13 * * 1,3,5` (Mon/Wed/Fri at 13:00 UTC)

Update `.github/workflows/telegram-auto-post.yml` if you want a different posting frequency.
