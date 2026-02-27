# Why Changes Aren't Showing on ieltscorner.ca (& How to Fix It)

## The Issue

You've committed code to GitHub, but the live website (ieltscorner.ca) still shows the old version.

**Why?** Netlify needs an explicit trigger to rebuild and deploy. Your code repo is ready, but the deploy automation isn't firing.

## The Solution (3 steps, ~5 minutes)

### Step 1: Get your Netlify build hook

1. Go to your Netlify dashboard
2. Find your site (ieltscorner)
3. Site settings → Build & deploy → Build hooks
4. Create a new hook (or copy an existing one)
5. Copy the full URL (looks like `https://api.netlify.com/build_hooks/...`)

### Step 2: Add it to GitHub Secrets

1. Open your GitHub repo: https://github.com/karaabd23-crypto/ieltscorner-site
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. **Name:** `NETLIFY_BUILD_HOOK`
5. **Value:** paste the URL from Step 1
6. Save

### Step 3: Trigger a deploy

After saving the secret, the next push to `main` will trigger automatic deployment.

**To test immediately:**
1. Go to GitHub → Actions
2. Find workflow "Deploy live site"
3. Click "Run workflow" → Run

**Wait 3–5 minutes**, then:
- Hard refresh ieltscorner.ca (Ctrl+Shift+R or Cmd+Shift+R)
- You should see the new CELPIP skill pages, AdSense placeholder, and all lessons

## What's Already Ready to Deploy

✅ **Lesson automation** — runs on schedule 4x/week, creates markdown lessons  
✅ **CELPIP skill pages** — Listening, Reading, Writing, Speaking with full strategies  
✅ **Free + Premium lessons** — with self-marking quizzes  
✅ **AdSense ready** — just replace `ca-pub-YOUR_ADSENSE_ID` with your real ID  
✅ **npm scripts** — `lesson:generate`, `lesson:dry-run` work locally  

## What You Need to Do Next

1. ✅ Set `NETLIFY_BUILD_HOOK` secret (this page explains it)
2. ⏳ Wait for deployment to complete (~3–5 min)
3. ⏳ Sign up for Google AdSense (google.com/adsense) — takes 1–3 days for approval
4. ⏳ Once approved, add your AdSense ID to Layout.astro

## Troubleshooting

**Deployment workflow failed?**
- Check GitHub → Actions → "Deploy live site" → see the error
- Usually: missing NETLIFY_BUILD_HOOK secret

**Still seeing old site after deploy succeeded?**
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Check Netlify deploy log: Netlify dashboard → Deploys tab

**AdSense script not loading?**
- Make sure you replaced the placeholder ID
- AdSense takes 24–48 hours to start serving ads even after setup

---

**Questions?** Your copilot instructions are in [.github/copilot-instructions.md](.github/copilot-instructions.md).
