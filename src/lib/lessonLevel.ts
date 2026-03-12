export function getLessonTier(level: string): "Basic" | "Intermediate" | "Advanced" {
  const normalized = String(level || "").trim().toUpperCase();

  if (normalized === "A1" || normalized === "A2") {
    return "Basic";
  }

  if (normalized === "B1" || normalized === "B2") {
    return "Intermediate";
  }

  return "Advanced";
}

export function getPublicLessonTitle(title: string, level?: string): string {
  const cleaned = String(title || "")
    .replace(/\s*\((A1|A2|B1|B2|C1|C2)\)\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const normalizedLevel = String(level || "").trim().toUpperCase();
  const isEarlyLevel = normalizedLevel === "A1" || normalizedLevel === "A2" || normalizedLevel === "B1";

  let baseTitle = cleaned;

  if (isEarlyLevel) {
    if (/(conditional|if[-\s]?sentence|if[-\s]?statement)/i.test(cleaned)) {
      baseTitle = 'How to use "if"';
    } else {
      const shortTitle = cleaned
        .replace(/^How to\s+/i, "")
        .replace(/^Using\s+/i, "")
        .replace(/\s+for\s+.*$/i, "")
        .replace(/\s+in\s+.*$/i, "")
        .replace(/\s*[:\-–—]\s*.*/, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (shortTitle.length >= 8) {
        baseTitle = shortTitle;
      }
    }
  }

  // Always append the tier label so same-topic lessons at different levels are distinguishable
  if (normalizedLevel) {
    const tier = getLessonTier(normalizedLevel);
    return `${baseTitle} – ${tier}`;
  }

  return baseTitle;
}
