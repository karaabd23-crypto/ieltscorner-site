# Telegram Channel Interaction Guide

## How Members Discover and Use the Bot

### 📢 In the Channel

When users see your channel posts, they will notice:

1. **Interactive Quiz Poll** - Each post includes a Telegram poll where members can test their knowledge
2. **CTA Button Link** - A prominent call-to-action stating: "🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!"
3. **Regular Posts** - Vocabulary, grammar, idioms, and expressions posted Mon/Wed/Fri at 13:00 UTC

### 💬 In Direct Messages

When a user clicks to DM the bot or types `/start`:

#### Welcome Message Appears

```
👋 Welcome to Kay's English Corner!

I'm your AI English companion. Here's what I can help with:

📚 **Vocabulary** - Daily words & phrases
✏️ **Grammar** - Practical tips & explanations
💡 **Idioms & Expressions** - Natural English speech patterns
🎁 **Referrals** - Earn rewards by inviting friends
🔥 **Streak Tracking** - Build consistent learning habits

To get started, just:
1. Say hello or click any button below
2. Browse vocabulary, grammar, or idioms
3. Visit our website for full lessons

Ready? Let's go! 🚀
```

#### Interactive Buttons Appear

The welcome message includes 8 buttons organized in rows:

| Row 1 | |
|---|---|
| 🌐 Visit Website | 📣 Telegram Channel |

| Row 2 | |
|---|---|
| 📚 Vocabulary | 🎯 Grammar Tips |

| Row 3 | |
|---|---|
| 💡 Idioms & Expressions | ✉️ Contact Kay |

| Row 4 | |
|---|---|
| 🎁 Refer a Friend | 📈 My Streak |

### 🎯 What Each Button Does

#### 🌐 Visit Website
- Links directly to your main website
- Let's users explore full lessons and courses

#### 📣 Telegram Channel
- Subscribes users to the main channel
- Makes sure they see all new posts

#### 📚 Vocabulary
- Sends a vocabulary example
- User gets: word + definition + usage + practice scenario

#### 🎯 Grammar Tips
- Sends a grammar rule explanation
- User gets: rule + examples + common mistakes + practice

#### 💡 Idioms & Expressions
- Sends an idiom with natural context
- User gets: idiom + meaning + usage examples

#### ✉️ Contact Kay
- Displays your contact information
- Shows Telegram handle, email, or preferred contact method
- Users can reach out with questions

#### 🎁 Refer a Friend
- Shows the user their unique referral code
- Each user gets: `ref_[userID]_[code]`
- Rewards users for inviting friends

#### 📈 My Streak
- Shows current study streak
- User can track consistency
- Badges awarded at milestones (7, 30, 365 days)
- Users build streaks by messaging "studied" daily

### 💾 User Data Tracking

The bot automatically tracks:
- **Join date** - When user first interacted
- **Study streak** - Days user has said "studied"
- **Quiz responses** - How many polls they've answered
- **Referral code** - Unique code for inviting friends
- **Quiz score** - Their performance on quizzes

### 🔐 Admin Features

If you set `TELEGRAM_OWNER_CHAT_ID`, you can use admin commands:

```
/stats - View bot analytics (message count, quiz responses, total users)
/announce [message] - Broadcast message to all users (demo available)
```

Any unmatched DM not matching keywords is forwarded to you for manual follow-up.

### 📊 How It All Connects

```
1. User sees channel post with quiz & CTA
   ↓
2. User clicks "DM bot" or searches @YourBotName
   ↓
3. Bot sends welcome message with 8 interactive buttons
   ↓
4. User clicks buttons or types keywords (vocab, grammar, idioms, contact, refer, studied)
   ↓
5. Bot responds with relevant content or forwards unmatched messages to you
   ↓
6. User builds streak and referral rewards over time
```

## Setup for Channel Members

### Prerequisites

Before members can interact, ensure:

1. ✅ Bot is created via @BotFather
2. ✅ Bot added as admin in your channel
3. ✅ Webhook registered: `npm run telegram:webhook:set`
4. ✅ Environment variables configured (see `.env.example`)

### Initial Setup Checklist

- [ ] Get Telegram bot token from @BotFather
- [ ] Add bot as admin to your channel
- [ ] Deploy Netlify function (automatic via GitHub)
- [ ] Set env vars: `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_OWNER_CHAT_ID`
- [ ] Run `npm run telegram:webhook:set` to register webhook
- [ ] Test: Send `/start` to your bot in DM
- [ ] Verify: Welcome message appears with 8 buttons

### First Post Test

```bash
# Test dry-run (shows output without posting)
npm run telegram:post -- --dry-run

# Live post to channel
npm run telegram:post
```

Verify:
- Message appears in channel
- Quiz poll is anonymized ✅
- CTA button "🤖 Want interactive quizzes..." is visible

## Customization

### Change Welcome Message

Edit `netlify/functions/telegram-webhook.js`, function `sendWelcomeMessage()`, variable `welcomeText`

### Change Keyboard Buttons

Edit `netlify/functions/telegram-webhook.js`, function `buildMainKeyboard()`

### Add New Keywords

Edit `netlify/functions/telegram-webhook.js`, function `keywordReply()` to handle new text patterns

### Modify Fallback Templates

Edit `scripts/post-telegram-content.mjs`, function `fallbackContent()` to change default post format

## Troubleshooting

### Members can't DM the bot
- Ensure bot username is correct (@YourBotName)
- Check bot is not restricted in Telegram privacy settings
- Verify webhook is registered: `npm run telegram:webhook:set`

### Welcome message doesn't appear
- Check `TELEGRAM_WEBHOOK_URL` is publicly accessible
- Verify webhook secret (if set) matches in GitHub secrets
- Test webhook with: `npm run telegram:webhook:set` (should return 200 OK)

### Buttons don't work
- Confirm Netlify function is deployed
- Check browser console for JavaScript errors
- Verify `TELEGRAM_BOT_TOKEN` is set in env vars

### Members not receiving polls
- Ensure bot is admin in channel
- Check poll is set to `is_anonymous: true` (required for channels)
- Verify Telegram API quota not exceeded

## Next Steps

1. **Customize** your welcome message and button responses
2. **Configure** your contact info in env vars
3. **Test** the full workflow (channel post → DM → buttons)
4. **Monitor** bot analytics with `/stats` command
5. **Invite** members to your channel and bot
