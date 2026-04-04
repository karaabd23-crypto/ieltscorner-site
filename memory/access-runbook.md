# Access Runbook (GitHub + Kit + Netlify)

Last updated: 2026-04-04
Project: IELTS Corner (`karaabd23-crypto/ieltscorner-site`)

## Important
- This file stores **configuration references only**.
- Do **not** store raw API keys/tokens in git.
- Secrets should live in GitHub Actions secrets and/or local secure stores.

## GitHub
- Repo: `karaabd23-crypto/ieltscorner-site`
- Digest workflow: `.github/workflows/newsletter-digest.yml`
- Digest send script: `scripts/send-newsletter-digest.mjs`

### Required GitHub Secrets (digest)
- `KIT_API_KEY`
- `KIT_DIGEST_TAG_ID`
- `KIT_DIGEST_SEGMENT_ID` (optional if tag targeting is used)
- `KIT_DIGEST_FORM_ID`
- `KIT_FORM_ID`
- `KIT_DIGEST_TEMPLATE_ID`
- `KIT_BROADCAST_EMAIL_ADDRESS`
- Optional: `KIT_READING_GUIDE_FORM_ID` (funnel support)

## Kit (ConvertKit)
Known IDs (as of 2026-04-04):
- Digest tag (`newsletter`): `18715374`
- Digest form (`Creator Network`): `9278182`
- Reading guide form (`Cocoa form`): `9278286`
- Default email template (`Text only`): `5104792`

Notes:
- Broadcasts are created via Kit API by `scripts/send-newsletter-digest.mjs`.
- Audience targeting uses digest tag/segment (tag is currently primary).

## Netlify
- Site id: `bab5a495-e355-48be-81e2-bd41b09fba6e`
- Site URL: `https://ieltscorner.ca`
- DNS zone id: `67df707d7229401a42ec7311`

### Kit DNS records added (2026-04-04)
- `CNAME` `ckespa.ieltscorner.ca` -> `spf.dm-dbe19f42.sg3.convertkit.com`
- `CNAME` `cka._domainkey.ieltscorner.ca` -> `dkim.dm-70275e6a.sg3.convertkit.com`
- `CNAME` `cka2._domainkey.ieltscorner.ca` -> `dkim2.dm-a82ee003.sg3.convertkit.com`
- `TXT` `_dmarc.ieltscorner.ca` -> `v=DMARC1; p=none;`

## Operational notes
- Digest sending is Kit-based (not Gmail send path).
- Legacy cancellation workflow schedule has been disabled; manual dispatch only.
- Nameservers are custom (NS1/Netlify DNS). Do not switch to Namecheap BasicDNS unless migrating DNS deliberately.

## Safe recovery checklist for future sessions
1. Confirm digest workflow file and env keys.
2. Confirm GitHub secrets exist (names only).
3. Confirm Kit tag/form IDs still match account setup.
4. Confirm Netlify DNS records still resolve.
5. Run a dry-run digest or trigger workflow_dispatch for validation.
