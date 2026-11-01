// Shared bot-signup heuristics for Kit subscribers. Used by the
// subscribe-newsletter function (to block new fakes) and by
// scripts/purge-kit-suspicious-subscribers.mjs (to clean old ones).

function countMatches(value, pattern) {
  return (String(value || '').match(pattern) || []).length;
}

function maxConsonantRun(value) {
  let maxRun = 0;
  let current = 0;
  for (const ch of String(value || '').toLowerCase()) {
    if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)) {
      current += 1;
      if (current > maxRun) maxRun = current;
    } else {
      current = 0;
    }
  }
  return maxRun;
}

export function looksLikeRandomName(value) {
  const name = String(value || '').trim();
  if (!name) return { suspicious: false, reasons: [] };

  const reasons = [];
  if (/https?:|www\.|\.(com|ru|xyz|top|info)\b|<|>/i.test(name)) {
    reasons.push('link-in-name');
  }

  if (/^[A-Za-z]+$/.test(name)) {
    const length = name.length;
    const upper = countMatches(name, /[A-Z]/g);
    const lower = countMatches(name, /[a-z]/g);
    const vowels = countMatches(name, /[aeiouAEIOU]/g);
    const vowelRatio = length > 0 ? vowels / length : 0;
    const uniqueRatio = length > 0 ? new Set(name.toLowerCase()).size / length : 0;
    const consonantRun = maxConsonantRun(name);

    if (length >= 14 && upper >= 4 && lower >= 6 && vowelRatio >= 0.15 && vowelRatio <= 0.55) {
      reasons.push('randomized-name-pattern');
    }
    if (length >= 18 && upper >= 5 && lower >= 8 && uniqueRatio >= 0.55) {
      reasons.push('high-entropy-name');
    }
    if (length >= 12 && upper >= 3 && lower >= 6 && consonantRun >= 5) {
      reasons.push('name-consonant-run');
    }
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

export function looksLikeFragmentedLocalPart(value) {
  const localPart = String(value || '').trim().toLowerCase();
  if (!localPart) return false;

  const segments = localPart.split('.').filter(Boolean);
  const dotCount = Math.max(0, segments.length - 1);
  const hasDigit = /\d/.test(localPart);
  const shortSegments = segments.filter((segment) => segment.length <= 2).length;

  return dotCount >= 4 && hasDigit && shortSegments >= 2;
}
