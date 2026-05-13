export const EXAM_KEYS = ["IELTS", "CELPIP", "PTE_CORE"] as const;

export type ExamKey = (typeof EXAM_KEYS)[number];
export type ExamSkill = "listening" | "reading" | "writing" | "speaking";

export type ExamConfig = {
  key: ExamKey;
  label: string;
  shortLabel: string;
  slug: string;
  hubPath: string;
};

export const EXAM_CONFIG_BY_KEY: Record<ExamKey, ExamConfig> = {
  IELTS: {
    key: "IELTS",
    label: "IELTS",
    shortLabel: "IELTS",
    slug: "ielts",
    hubPath: "/ielts",
  },
  CELPIP: {
    key: "CELPIP",
    label: "CELPIP",
    shortLabel: "CELPIP",
    slug: "celpip",
    hubPath: "/celpip",
  },
  PTE_CORE: {
    key: "PTE_CORE",
    label: "PTE Core",
    shortLabel: "PTE Core",
    slug: "pte-core",
    hubPath: "/pte-core",
  },
};

export const EXAM_CONFIG_LIST: ExamConfig[] = EXAM_KEYS.map((key) => EXAM_CONFIG_BY_KEY[key]);

export const isExamKey = (value: string): value is ExamKey =>
  EXAM_KEYS.includes(value as ExamKey);

export const normalizeExamKey = (value: string | undefined | null): ExamKey | null => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "PTE" || normalized === "PTECORE" || normalized === "PTE-CORE") return "PTE_CORE";
  return isExamKey(normalized) ? normalized : null;
};

export const getExamConfig = (exam: ExamKey): ExamConfig => EXAM_CONFIG_BY_KEY[exam];

export const getExamHubPath = (exam: ExamKey): string => getExamConfig(exam).hubPath;

export const getExamSkillPath = (exam: ExamKey, skill: ExamSkill): string =>
  `${getExamHubPath(exam)}/${skill}`;

export const formatExamLabel = (exam: ExamKey): string => getExamConfig(exam).label;
