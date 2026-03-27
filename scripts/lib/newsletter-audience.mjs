const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

export function normalizeFormName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function normalizeSubscriberEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function fetchNetlifyJson(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Netlify API failed (${response.status}): ${text}`);
  }

  return response.json();
}

export async function getNetlifySiteInfo({ siteId, accessToken }) {
  const site = await fetchNetlifyJson(`${NETLIFY_API_BASE}/sites/${siteId}`, accessToken);
  return {
    id: String(site?.id || siteId),
    name: String(site?.name || ''),
    url: String(site?.url || site?.ssl_url || ''),
  };
}

export async function getNetlifyFormMatch({ siteId, accessToken, formName }) {
  const forms = await fetchNetlifyJson(`${NETLIFY_API_BASE}/sites/${siteId}/forms`, accessToken);
  const requested = normalizeFormName(formName);
  const availableFormNames = forms
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean);

  const exact = forms.find((item) => String(item?.name || '').trim() === formName);
  if (exact?.id) {
    return {
      formId: String(exact.id),
      formName: String(exact.name || formName),
      availableFormNames,
    };
  }

  const normalizedMatch = forms.find((item) => normalizeFormName(item?.name) === requested);
  if (normalizedMatch?.id) {
    return {
      formId: String(normalizedMatch.id),
      formName: String(normalizedMatch.name || formName),
      availableFormNames,
    };
  }

  const newsletterLike = forms.find((item) => normalizeFormName(item?.name).includes('newsletter'));
  if (newsletterLike?.id) {
    return {
      formId: String(newsletterLike.id),
      formName: String(newsletterLike.name || formName),
      availableFormNames,
    };
  }

  return {
    formId: '',
    formName,
    availableFormNames,
  };
}

export async function getSubscriberRecords({ formId, accessToken, maxPages = 20, perPage = 100 }) {
  const byEmail = new Map();

  for (let page = 1; page <= maxPages; page += 1) {
    const submissions = await fetchNetlifyJson(
      `${NETLIFY_API_BASE}/forms/${formId}/submissions?page=${page}&per_page=${perPage}`,
      accessToken,
    );

    if (!Array.isArray(submissions) || submissions.length === 0) {
      break;
    }

    for (const submission of submissions) {
      const email = normalizeSubscriberEmail(submission?.data?.email ?? submission?.email ?? '');
      if (!email || !email.includes('@')) {
        continue;
      }

      const submittedAt = String(
        submission?.created_at
        || submission?.createdAt
        || submission?.updated_at
        || ''
      ).trim();

      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, {
          email,
          submittedAt,
          submissionId: String(submission?.id || ''),
        });
        continue;
      }

      const nextTime = Date.parse(submittedAt || '');
      const currentTime = Date.parse(existing.submittedAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        byEmail.set(email, {
          email,
          submittedAt,
          submissionId: String(submission?.id || existing.submissionId || ''),
        });
      }
    }
  }

  return [...byEmail.values()].sort((a, b) => {
    const aTime = Date.parse(a.submittedAt || '');
    const bTime = Date.parse(b.submittedAt || '');
    if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    return bTime - aTime;
  });
}

export async function findSubscriberRecordByEmail({
  formId,
  accessToken,
  email,
  maxPages = 20,
  perPage = 100,
}) {
  const normalizedEmail = normalizeSubscriberEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return null;
  }

  let newestMatch = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const submissions = await fetchNetlifyJson(
      `${NETLIFY_API_BASE}/forms/${formId}/submissions?page=${page}&per_page=${perPage}`,
      accessToken,
    );

    if (!Array.isArray(submissions) || submissions.length === 0) {
      break;
    }

    for (const submission of submissions) {
      const submissionEmail = normalizeSubscriberEmail(submission?.data?.email ?? submission?.email ?? '');
      if (submissionEmail !== normalizedEmail) {
        continue;
      }

      const submittedAt = String(
        submission?.created_at
        || submission?.createdAt
        || submission?.updated_at
        || ''
      ).trim();

      if (!newestMatch) {
        newestMatch = {
          email: submissionEmail,
          submittedAt,
          submissionId: String(submission?.id || ''),
        };
        continue;
      }

      const nextTime = Date.parse(submittedAt || '');
      const currentTime = Date.parse(newestMatch.submittedAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        newestMatch = {
          email: submissionEmail,
          submittedAt,
          submissionId: String(submission?.id || newestMatch.submissionId || ''),
        };
      }
    }
  }

  return newestMatch;
}

export async function getSubscriberEmails(options) {
  const records = await getSubscriberRecords(options);
  return records.map((item) => item.email);
}

export async function getFormSubmissions({ formId, accessToken, maxPages = 20, perPage = 100 }) {
  const rows = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const submissions = await fetchNetlifyJson(
      `${NETLIFY_API_BASE}/forms/${formId}/submissions?page=${page}&per_page=${perPage}`,
      accessToken,
    );

    if (!Array.isArray(submissions) || submissions.length === 0) {
      break;
    }

    for (const submission of submissions) {
      rows.push({
        id: String(submission?.id || ''),
        createdAt: String(submission?.created_at || submission?.createdAt || submission?.updated_at || '').trim(),
        data: submission?.data && typeof submission.data === 'object' ? submission.data : {},
      });
    }
  }

  return rows;
}
