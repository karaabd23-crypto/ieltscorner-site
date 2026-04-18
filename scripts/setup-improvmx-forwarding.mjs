#!/usr/bin/env node

const IMPROVMX_API_BASE = 'https://api.improvmx.com/v3';
const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHostname(name, domain) {
  const trimmed = String(name || '').trim().replace(/\.$/, '');
  if (!trimmed || trimmed === '@') {
    return domain;
  }
  return `${trimmed}.${domain}`.replace(/\.$/, '');
}

function isSpfRecord(value) {
  return String(value || '').trim().toLowerCase().startsWith('v=spf1');
}

function withSpfInclude(value, includeToken) {
  const original = String(value || '').trim();
  if (!original) return '';
  if (!isSpfRecord(original)) return original;
  if (original.toLowerCase().includes(includeToken.toLowerCase())) {
    return original;
  }

  const hasAll = /\s(?:~all|-all|\?all|\+all)\s*$/i.test(original);
  if (hasAll) {
    return original.replace(/\s(~all|-all|\?all|\+all)\s*$/i, ` ${includeToken} $1`);
  }
  return `${original} ${includeToken}`;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? parseJsonSafe(text) : null;
  if (!response.ok) {
    const detail = body?.error || body?.message || text || `HTTP ${response.status}`;
    throw new Error(`Request failed ${response.status} ${url}: ${String(detail).slice(0, 240)}`);
  }
  return body || {};
}

async function improvRequest(path, { apiKey, method = 'GET', body } = {}) {
  const token = Buffer.from(`api:${apiKey}`).toString('base64');
  return requestJson(`${IMPROVMX_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function netlifyRequest(path, { accessToken, method = 'GET', body } = {}) {
  return requestJson(`${NETLIFY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function findAlias(aliases, aliasName) {
  const target = String(aliasName || '').trim().toLowerCase();
  return (aliases || []).find((row) => String(row?.alias || '').trim().toLowerCase() === target) || null;
}

async function ensureImprovDomainAndAlias({
  apiKey,
  domain,
  aliasName,
  forwardTo,
}) {
  const domainsResult = await improvRequest(`/domains?q=${encodeURIComponent(domain)}`, { apiKey });
  const domains = Array.isArray(domainsResult?.domains) ? domainsResult.domains : [];
  const exact = domains.find((row) => String(row?.domain || '').toLowerCase() === domain.toLowerCase()) || null;

  if (!exact) {
    await improvRequest('/domains', {
      apiKey,
      method: 'POST',
      body: { domain },
    });
    console.log(`[improvmx] Created domain: ${domain}`);
  } else {
    console.log(`[improvmx] Domain exists: ${domain}`);
  }

  const aliasesResult = await improvRequest(`/domains/${encodeURIComponent(domain)}/aliases?alias=${encodeURIComponent(aliasName)}`, {
    apiKey,
  });
  const aliases = Array.isArray(aliasesResult?.aliases) ? aliasesResult.aliases : [];
  const existing = findAlias(aliases, aliasName);

  if (!existing) {
    await improvRequest(`/domains/${encodeURIComponent(domain)}/aliases`, {
      apiKey,
      method: 'POST',
      body: {
        alias: aliasName,
        forward: forwardTo,
      },
    });
    console.log(`[improvmx] Created alias: ${aliasName}@${domain} -> ${forwardTo}`);
    return;
  }

  const currentForward = normalizeEmail(existing.forward);
  if (currentForward !== normalizeEmail(forwardTo)) {
    await improvRequest(`/domains/${encodeURIComponent(domain)}/aliases/${encodeURIComponent(aliasName)}`, {
      apiKey,
      method: 'PUT',
      body: { forward: forwardTo },
    });
    console.log(`[improvmx] Updated alias: ${aliasName}@${domain} -> ${forwardTo}`);
  } else {
    console.log(`[improvmx] Alias already correct: ${aliasName}@${domain} -> ${forwardTo}`);
  }
}

function netlifyRecordSummary(record) {
  const priority = record?.priority ? ` priority=${record.priority}` : '';
  return `${record?.type} ${record?.hostname} -> ${record?.value}${priority}`;
}

async function findDnsZoneId({ accessToken, domain }) {
  const zones = await netlifyRequest('/dns_zones', { accessToken });
  const found = Array.isArray(zones)
    ? zones.find((zone) => String(zone?.name || '').toLowerCase() === domain.toLowerCase())
    : null;
  if (!found?.id) {
    throw new Error(`Netlify DNS zone not found for ${domain}`);
  }
  return found.id;
}

async function listDnsRecords({ accessToken, zoneId }) {
  const rows = await netlifyRequest(`/dns_zones/${zoneId}/dns_records`, { accessToken });
  return Array.isArray(rows) ? rows : [];
}

async function createDnsRecord({ accessToken, zoneId, record }) {
  const created = await netlifyRequest(`/dns_zones/${zoneId}/dns_records`, {
    accessToken,
    method: 'POST',
    body: record,
  });
  console.log(`[netlify] Created ${netlifyRecordSummary(created)}`);
  return created;
}

async function updateDnsRecord({ accessToken, zoneId, recordId, record }) {
  const updated = await netlifyRequest(`/dns_zones/${zoneId}/dns_records/${recordId}`, {
    accessToken,
    method: 'PUT',
    body: record,
  });
  console.log(`[netlify] Updated ${netlifyRecordSummary(updated)}`);
  return updated;
}

async function ensureDnsRecords({ accessToken, domain }) {
  const zoneId = await findDnsZoneId({ accessToken, domain });
  const records = await listDnsRecords({ accessToken, zoneId });
  const rootHost = domain.toLowerCase();

  const rootMx = records.filter(
    (row) => String(row?.type || '').toUpperCase() === 'MX'
      && String(row?.hostname || '').toLowerCase() === rootHost
  );
  const nonImprovMx = rootMx.filter((row) => !String(row?.value || '').toLowerCase().includes('improvmx.com'));
  if (nonImprovMx.length > 0) {
    throw new Error(
      `Found existing non-ImprovMX root MX records. Aborting to avoid destructive overwrite: ${nonImprovMx.map(netlifyRecordSummary).join(' | ')}`
    );
  }

  const wantedMx = [
    { type: 'MX', hostname: rootHost, value: 'mx1.improvmx.com', priority: 10, ttl: 3600 },
    { type: 'MX', hostname: rootHost, value: 'mx2.improvmx.com', priority: 20, ttl: 3600 },
  ];

  for (const target of wantedMx) {
    const exists = rootMx.find((row) => String(row?.value || '').toLowerCase() === target.value.toLowerCase());
    if (exists) {
      console.log(`[netlify] Exists ${netlifyRecordSummary(exists)}`);
    } else {
      await createDnsRecord({ accessToken, zoneId, record: target });
    }
  }

  const rootTxt = records.filter(
    (row) => String(row?.type || '').toUpperCase() === 'TXT'
      && String(row?.hostname || '').toLowerCase() === rootHost
  );
  const spfRows = rootTxt.filter((row) => isSpfRecord(row?.value));
  const includeToken = 'include:spf.improvmx.com';

  if (spfRows.length === 0) {
    await createDnsRecord({
      accessToken,
      zoneId,
      record: {
        type: 'TXT',
        hostname: rootHost,
        value: 'v=spf1 include:spf.improvmx.com ~all',
        ttl: 3600,
      },
    });
  } else if (spfRows.length === 1) {
    const row = spfRows[0];
    const next = withSpfInclude(row.value, includeToken);
    if (next === row.value) {
      console.log(`[netlify] SPF already includes ImprovMX: ${row.value}`);
    } else {
      await updateDnsRecord({
        accessToken,
        zoneId,
        recordId: row.id,
        record: {
          type: 'TXT',
          hostname: row.hostname,
          value: next,
          ttl: row.ttl || 3600,
        },
      });
    }
  } else {
    throw new Error(
      `Multiple SPF TXT records found at root (${spfRows.length}). Manual cleanup needed before automation can continue.`
    );
  }

  return zoneId;
}

async function runImprovCheck({ apiKey, domain }) {
  const result = await improvRequest(`/domains/${encodeURIComponent(domain)}/check`, { apiKey });
  const records = result?.records || {};
  const mxValid = Boolean(records?.mx?.valid);
  const spfValid = Boolean(records?.spf?.valid);
  const allValid = Boolean(records?.valid);
  console.log(`[improvmx] DNS check valid=${allValid} mx=${mxValid} spf=${spfValid}`);
  if (!mxValid || !spfValid) {
    console.log(`[improvmx] DNS check details: ${JSON.stringify(records, null, 2)}`);
  }
}

async function main() {
  const improvApiKey = requiredEnv('IMPROVMX_API_KEY');
  const netlifyAccessToken = requiredEnv('NETLIFY_ACCESS_TOKEN');

  const domain = optionalEnv('IMPROVMX_DOMAIN', 'ieltscorner.ca').toLowerCase();
  const aliasName = optionalEnv('IMPROVMX_ALIAS', 'newsletter').toLowerCase();
  const forwardTo = optionalEnv('IMPROVMX_FORWARD_TO', 'kara.abd23@gmail.com').toLowerCase();

  console.log(`[setup] Domain=${domain} Alias=${aliasName} ForwardTo=${forwardTo}`);

  await ensureImprovDomainAndAlias({
    apiKey: improvApiKey,
    domain,
    aliasName,
    forwardTo,
  });

  const zoneId = await ensureDnsRecords({
    accessToken: netlifyAccessToken,
    domain,
  });
  console.log(`[netlify] DNS zone id: ${zoneId}`);

  await runImprovCheck({
    apiKey: improvApiKey,
    domain,
  });

  console.log(`[ok] Forwarding setup completed for ${aliasName}@${domain}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});

