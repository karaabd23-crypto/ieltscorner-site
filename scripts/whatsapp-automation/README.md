# WhatsApp Automation

## 1) Build lesson queue (CELPIP/grammar/vocabulary only)

```bash
python scripts/whatsapp-automation/export_lessons_for_whatsapp.py
```

Outputs:
- `scripts/whatsapp-automation/whatsapp_lessons_queue.json`
- `scripts/whatsapp-automation/lesson_summaries.txt`

## 2) Build Telegram-to-WhatsApp queue

```bash
python scripts/whatsapp-automation/telegram_to_whatsapp.py
```

Sources:
- `scripts/post-telegram-content.mjs` (auto parsed)
- `scripts/whatsapp-automation/telegram_posts.json` (optional)

Rules enforced:
- Only CELPIP / grammar / vocabulary content
- Persian text removed
- Quiz content converted to WhatsApp text blocks

Output:
- `scripts/whatsapp-automation/whatsapp_telegram_queue.json`

## 3) Preview pending messages

```bash
python scripts/whatsapp-automation/whatsapp_poster.py --dry-run --max-posts 20
```

## 4) Post messages to WhatsApp

Install dependency:

```bash
pip install selenium
```

Run posting:

```bash
python scripts/whatsapp-automation/whatsapp_poster.py --target "YOUR_WHATSAPP_CHANNEL_OR_CHAT"
```

Useful flags:
- `--max-posts 10`
- `--delay-seconds 30`
- `--profile-dir "C:/path/to/chrome-profile"`
- `--no-qr-prompt`

State tracking:
- Posted IDs are stored in `scripts/whatsapp-automation/whatsapp_post_state.json`.
- Already-posted items are skipped automatically.
