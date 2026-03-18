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
  const isEarlyLevel =
    normalizedLevel === "A1" || normalizedLevel === "A2" || normalizedLevel === "B1";

  if (/^CELPIP Writing Task 1:\s*Email/i.test(cleaned) || /^CELPIP Task 1:\s*Email/i.test(cleaned)) {
    return "CELPIP email task";
  }

  if (/^CELPIP Writing Task 2:\s*Survey/i.test(cleaned) || /^CELPIP Task 2:\s*Survey/i.test(cleaned)) {
    return "CELPIP survey response";
  }

  if (/^CELPIP Task 1:\s*(Describe an )?Experience/i.test(cleaned)) {
    return "CELPIP personal experience";
  }

  if (/^CELPIP Task 2:\s*(Give your )?Opinion/i.test(cleaned)) {
    return "CELPIP opinion task";
  }

  if (/^CELPIP Task 3:\s*Interview/i.test(cleaned)) {
    return "CELPIP interview task";
  }

  if (/^IELTS Task 1:\s*Maps/i.test(cleaned)) {
    return "IELTS map report";
  }

  if (/^IELTS Task 1:\s*Process/i.test(cleaned)) {
    return "IELTS process report";
  }

  if (/^IELTS Task 2:\s*Opinion/i.test(cleaned)) {
    return "IELTS opinion essay";
  }

  if (/^IELTS Task 2:\s*Discussion/i.test(cleaned)) {
    return "IELTS discussion essay";
  }

  if (/^IELTS Task 2:\s*Advantage/i.test(cleaned)) {
    return "IELTS pros and cons essay";
  }

  if (/^IELTS Part 1:/i.test(cleaned)) {
    return "IELTS Part 1";
  }

  if (/^IELTS Part 2:/i.test(cleaned)) {
    return "IELTS cue card";
  }

  if (/^IELTS Part 3:/i.test(cleaned)) {
    return "IELTS Part 3";
  }

  if (/^Conditional Sentences:\s*Zero/i.test(cleaned)) {
    return "Zero conditional";
  }

  if (/^Conditional Sentences:\s*First/i.test(cleaned)) {
    return "First conditional";
  }

  if (/^Conditional Sentences:\s*Second/i.test(cleaned)) {
    return "Second conditional";
  }

  if (/^Conditional Sentences:\s*Third/i.test(cleaned)) {
    return "Third conditional";
  }

  let baseTitle = cleaned
    .replace(/^Conditional Sentences:\s*/i, "")
    .replace(/^Word Formation:\s*/i, "")
    .replace(/^Writing Transitions:\s*/i, "")
    .replace(/^Task \d+:\s*/i, "")
    .replace(/^Part \d+:\s*/i, "")
    .replace(/\s*[:\-\u2013\u2014]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (isEarlyLevel) {
    if (
      /(conditional|if[-\s]?sentence|if[-\s]?statement)/i.test(cleaned)
      && !(
        /(zero|first|second|third)\s+conditional/i.test(cleaned)
        || /conditional sentences:\s*(zero|first|second|third)/i.test(cleaned)
      )
    ) {
      baseTitle = 'How to use "if"';
    } else {
      const shortTitle = cleaned
        .replace(/^How to\s+/i, "")
        .replace(/^Using\s+/i, "")
        .replace(/\s+for\s+.*$/i, "")
        .replace(/\s+in\s+.*$/i, "")
        .replace(/\s*[:\-\u2013\u2014]\s*.*/, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (shortTitle.length >= 8) {
        baseTitle = shortTitle;
      }
    }
  }

  if (/^zero$/i.test(baseTitle)) return "Zero conditional";
  if (/^first$/i.test(baseTitle)) return "First conditional";
  if (/^second$/i.test(baseTitle)) return "Second conditional";
  if (/^third$/i.test(baseTitle)) return "Third conditional";
  if (/^a,\s*an,\s*and\s*the$/i.test(baseTitle)) return "A, an, and the";

  return baseTitle;
}
