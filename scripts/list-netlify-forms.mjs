#!/usr/bin/env node

const accessToken = process.env.NETLIFY_ACCESS_TOKEN || '';
const siteId = process.env.NETLIFY_SITE_ID || '';

if (!accessToken || !siteId) {
  console.error('[error] Missing NETLIFY_ACCESS_TOKEN and/or NETLIFY_SITE_ID');
  process.exit(1);
}

const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  const text = await response.text();
  console.error(`[error] Netlify API failed (${response.status}): ${text}`);
  process.exit(1);
}

const forms = await response.json();
if (!Array.isArray(forms) || forms.length === 0) {
  console.log('[info] No forms found for this site.');
  process.exit(0);
}

console.log(`[info] Found ${forms.length} form(s):`);
for (const form of forms) {
  const name = String(form?.name || '').trim();
  const id = String(form?.id || '').trim();
  const submissions = Number(form?.submissions_count ?? 0);
  console.log(`- name="${name}" id=${id} submissions=${submissions}`);
}
