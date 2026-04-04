const KIT_API_BASE = 'https://api.kit.com/v4';
const DEFAULT_DIGEST_FORM_ID = 9278182;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseOptionalInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function normalizeSubscriberEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isLikelyValidEmail(value) {
  const email = normalizeSubscriberEmail(value);
  if (!email || email.length > 320) return false;
  if (!EMAIL_PATTERN.test(email)) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

export async function fetchKitJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
    const detail = String(firstError || text || '').trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return parsed || {};
}

export async function collectKitSubscribers({ apiKey, buildPath, maxPages = 30, perPage = 500 }) {
  const deduped = new Map();
  let cursor = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set('per_page', String(perPage));
    if (cursor) {
      params.set('after', cursor);
    }

    const payload = await fetchKitJson(`${KIT_API_BASE}${buildPath(params)}`, apiKey);
    const rows = Array.isArray(payload?.subscribers) ? payload.subscribers : [];

    for (const row of rows) {
      const email = normalizeSubscriberEmail(row?.email_address);
      if (!isLikelyValidEmail(email)) continue;

      const state = String(row?.state || '').trim().toLowerCase();
      if (state && state !== 'active') continue;

      const submittedAt = String(row?.added_at || row?.created_at || '').trim();
      const existing = deduped.get(email);
      if (!existing) {
        deduped.set(email, { email, submittedAt });
        continue;
      }

      const nextTime = Date.parse(submittedAt || '');
      const currentTime = Date.parse(existing.submittedAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        deduped.set(email, { email, submittedAt });
      }
    }

    const hasNextPage = Boolean(payload?.pagination?.has_next_page);
    const nextCursor = String(payload?.pagination?.end_cursor || '').trim() || null;
    if (!hasNextPage || !nextCursor) {
      break;
    }
    cursor = nextCursor;
  }

  return [...deduped.values()].sort((a, b) => {
    const aTime = Date.parse(a.submittedAt || '');
    const bTime = Date.parse(b.submittedAt || '');
    if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    return bTime - aTime;
  });
}

export async function getKitFormSubscribers({ apiKey, formId, maxPages = 30, perPage = 500 }) {
  return collectKitSubscribers({
    apiKey,
    maxPages,
    perPage,
    buildPath: (params) => `/forms/${formId}/subscribers?${params.toString()}`,
  });
}

export async function getKitTagSubscribers({ apiKey, tagId, maxPages = 30, perPage = 500 }) {
  return collectKitSubscribers({
    apiKey,
    maxPages,
    perPage,
    buildPath: (params) => `/tags/${tagId}/subscribers?${params.toString()}`,
  });
}

export function resolveDigestAudience({
  digestTagId,
  digestFormId,
  kitFormId,
  fallbackDigestFormId = DEFAULT_DIGEST_FORM_ID,
}) {
  const resolvedDigestTagId = parseOptionalInteger(digestTagId);
  if (resolvedDigestTagId) {
    return {
      type: 'tag',
      id: resolvedDigestTagId,
      label: `kit-tag-${resolvedDigestTagId}`,
    };
  }

  const resolvedDigestFormId = parseOptionalInteger(digestFormId)
    || parseOptionalInteger(kitFormId)
    || fallbackDigestFormId;
  if (!resolvedDigestFormId) {
    return {
      type: '',
      id: null,
      label: '',
    };
  }

  return {
    type: 'form',
    id: resolvedDigestFormId,
    label: `kit-form-${resolvedDigestFormId}`,
  };
}

export async function getDigestAudienceSnapshot({
  apiKey,
  digestTagId,
  digestFormId,
  kitFormId,
  fallbackDigestFormId = DEFAULT_DIGEST_FORM_ID,
  maxPages = 30,
  perPage = 500,
}) {
  const resolved = resolveDigestAudience({
    digestTagId,
    digestFormId,
    kitFormId,
    fallbackDigestFormId,
  });

  if (!resolved.id || !resolved.type) {
    throw new Error('Missing Kit digest audience configuration');
  }

  const subscribers = resolved.type === 'tag'
    ? await getKitTagSubscribers({
      apiKey,
      tagId: resolved.id,
      maxPages,
      perPage,
    })
    : await getKitFormSubscribers({
      apiKey,
      formId: resolved.id,
      maxPages,
      perPage,
    });

  return {
    audienceType: resolved.type,
    audienceId: resolved.id,
    audienceLabel: resolved.label,
    subscribers,
  };
}
