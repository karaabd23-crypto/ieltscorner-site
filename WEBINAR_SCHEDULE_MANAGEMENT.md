# Webinar Schedule Management Guide

Your webinar system is now **fully dynamic**. Manage availability and dates using the schedule file without touching any code.

---

## File Location

**Schedule File:** [`src/data/webinar-schedule.json`](src/data/webinar-schedule.json)

This is the **only file you need to edit** to manage your webinar schedule.

---

## How to Use

### Example: Disable a Session (You Need to Take Sunday Off)

**Current (Available):**
```json
{
  "id": 1,
  "date": "2026-03-09",
  "dayOfWeek": "Sunday",
  "time": "11:00 AM EST",
  "topic": "Task 2 Structure That Gets CLB 9",
  "available": true,
  "notes": ""
}
```

**Change to (Disabled):**
```json
{
  "id": 1,
  "date": "2026-03-09",
  "dayOfWeek": "Sunday",
  "time": "11:00 AM EST",
  "topic": "Task 2 Structure That Gets CLB 9",
  "available": false,
  "notes": "Taking this Sunday off"
}
```

**Result:** Button automatically changes to "⚠️ This session is unavailable"

---

### Example: Move Session to Friday (or Different Day)

**Change:**
```json
{
  "id": 5,
  "date": "2026-04-10",
  "dayOfWeek": "Friday",
  "time": "6:00 PM EST",
  "topic": "Task 1 Email Writing Mastery",
  "description": "How to respond to situations. Formal vs informal tone. The 150-200 word structure that scores high.",
  "available": true,
  "notes": "Moved to Friday this week"
}
```

**Result:** Webinar page updates to show "Friday, April 10" instead of Sunday

---

### Example: Change a Topic (If You Want to Teach Different Subject)

**Current:**
```json
{
  "id": 3,
  "date": "2026-03-23",
  "topic": "Vocabulary for CLB 9+ (Not Just \"Big Words\")",
  "description": "150+ collocations that evaluators notice...",
  "available": true
}
```

**Change to:**
```json
{
  "id": 3,
  "date": "2026-03-23",
  "topic": "Advanced Sentence Structure for CLB 9",
  "description": "Complex sentences. Subordination. How to show grammatical range without sounding awkward.",
  "available": true
}
```

**Result:** Webinar page automatically shows new topic

---

## All Available Fields

Here's what you can edit in each session:

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique identifier | `1`, `2`, `3` |
| `date` | Session date | `"2026-03-09"` |
| `dayOfWeek` | Day name | `"Sunday"`, `"Friday"` |
| `time` | Session time | `"11:00 AM EST"`, `"6:00 PM EST"` |
| `timezone` | Timezone abbreviation | `"EST"`, `"PST"` |
| `topic` | Session topic (shows on page) | `"Task 2 Structure That Gets CLB 9"` |
| `description` | What students will learn | `"The structure CELPIP evaluators..."` |
| `available` | Is registration open? | `true` or `false` |
| `notes` | Internal notes (not shown to users) | `"Moved to Friday due to conflict"` |

---

## Common Management Tasks

### Task 1: Pre-Schedule Next 8 Weeks After First Session

Edit `webinar-schedule.json` and add 8 more sessions. The system will automatically show the **next available session** on the webinar page.

### Task 2: Disable Sunday, Show "Unavailable"

Change `"available": true` to `"available": false` for that session.

### Task 3: Change Time from 11 AM to 6 PM

Update `"time": "11:00 AM EST"` to `"time": "6:00 PM EST"`

### Task 4: Rename Topic

Update `"topic"` and `"description"` fields

---

## How the System Works

1. **Webinar page imports** `src/data/webinar-schedule.json`
2. **Finds first session** where `"available": true`
3. **Displays that session's details:**
   - Topic
   - Date & time
   - Description
   - Register button (if available) or "Unavailable" message (if not)

**Result:** No need to edit HTML—just edit the JSON file.

---

## Testing Your Changes

### After editing the schedule:

1. **Quick test in VS Code:**
   - Run `npm run build`
   - Visit `http://localhost:4321/webinar` (if running dev server)
   - Your changes should appear immediately

2. **Rebuild for production:**
   - Commit changes to GitHub
   - Push to main
   - Netlify auto-deploys

---

## Example: Full Week Schedule

Here's what your schedule might look like after 2 weeks:

```json
{
  "sessions": [
    {
      "id": 1,
      "date": "2026-03-09",
      "dayOfWeek": "Sunday",
      "available": false,
      "notes": "Cancelled - Kara sick"
    },
    {
      "id": 2,
      "date": "2026-03-16",
      "dayOfWeek": "Sunday",
      "available": true
    },
    {
      "id": 3,
      "date": "2026-03-23",
      "dayOfWeek": "Friday",
      "time": "6:00 PM EST",
      "available": true,
      "notes": "Moved to Friday"
    }
  ]
}
```

The page will show **"Sunday, March 16"** as the next available session.

---

## Troubleshooting

**Problem:** Session not showing on page  
**Solution:** Make sure `"available": true` and the JSON is valid (check for syntax errors)

**Problem:** Old session still showing  
**Solution:** Delete it from the JSON or set `"available": false`

**Problem:** Build error after editing JSON  
**Solution:** Check for missing commas or typos. Use [jsonlint.com](https://jsonlint.com) to validate

---

## Next Steps

1. **Edit the schedule** — Add next 8 weeks if you want to pre-plan
2. **Test it locally** — Run `npm run build` and visit `/webinar`
3. **Deploy** — Push to GitHub and Netlify handles the rest
4. **Manage weekly** — Every Friday, set next week's status (available/unavailable)

That's it! No code changes ever needed again. 🎉
