const HOST_PATTERN = /^[A-Za-z0-9.-]+(?::\d+)?$/;

function normalizeHeaderLookup(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [String(key).toLowerCase(), value]),
  );
}

/**
 * Adapts a v2 function `Request` into the `{ httpMethod, headers }` shape the
 * helpers below expect, so the same origin/IP checks work in both runtimes.
 */
export function requestToEventLike(req) {
  return {
    httpMethod: String(req?.method || 'GET').toUpperCase(),
    headers: req?.headers ? Object.fromEntries(req.headers) : {},
  };
}

export function getHeader(event, name) {
  const headers = normalizeHeaderLookup(event?.headers);
  const value = headers[String(name || '').toLowerCase()];
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }
  return String(value || '').trim();
}

export function getRequestHost(event) {
  const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host');
  if (!host) return '';
  const normalized = host.split(',')[0].trim();
  return HOST_PATTERN.test(normalized) ? normalized : '';
}

export function getRequestProtocol(event) {
  const raw = (getHeader(event, 'x-forwarded-proto') || 'https').split(',')[0].trim().toLowerCase();
  return raw === 'http' ? 'http' : 'https';
}

export function getRequestOriginFromHost(event) {
  const host = getRequestHost(event);
  if (!host) return '';
  return `${getRequestProtocol(event)}://${host}`;
}

function asSafeAbsoluteUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function getSafeBaseUrl(event, fallback = 'http://localhost:8888') {
  const envCandidates = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.SITE_URL];
  for (const candidate of envCandidates) {
    const safe = asSafeAbsoluteUrl(candidate);
    if (safe) return safe;
  }

  const fromHost = getRequestOriginFromHost(event);
  if (fromHost) return fromHost;

  return asSafeAbsoluteUrl(fallback) || 'http://localhost:8888';
}

export function isSameOriginRequest(event) {
  const origin = getHeader(event, 'origin');
  const requestOrigin = getRequestOriginFromHost(event);
  if (!requestOrigin) return false;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestUrl = new URL(requestOrigin);
      return originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host;
    } catch {
      return false;
    }
  }

  const secFetchSite = getHeader(event, 'sec-fetch-site').toLowerCase();
  if (secFetchSite === 'same-origin') {
    return true;
  }

  const referer = getHeader(event, 'referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(requestOrigin);
      return refererUrl.protocol === requestUrl.protocol && refererUrl.host === requestUrl.host;
    } catch {
      return false;
    }
  }

  return false;
}
