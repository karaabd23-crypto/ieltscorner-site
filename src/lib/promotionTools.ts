export type PromoAction = {
  offer: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

export type FeaturedToolCard = PromoAction & {
  badge: string;
  note?: string;
};

export type ContextualPromoConfig = {
  eyebrow?: string;
  title: string;
  intro?: string;
  primary: PromoAction;
  secondary?: PromoAction;
  variant?: "default" | "compact";
  promoType?: string;
};

const promoActions = {
  questionBank: {
    offer: "question_bank",
    title: "Free Question Bank",
    description:
      "Practice CELPIP writing prompts for free and build a return habit before you pay for scoring.",
    href: "/celpip/writing/questions",
    cta: "Practice free",
  },
  freeReadingTest: {
    offer: "reading_test",
    title: "Free Reading Test",
    description:
      "Take one full CELPIP reading test free, get an instant score, and see the lessons that match your weak areas.",
    href: "/celpip/reading/free-test",
    cta: "Take free test",
  },
  aiWritingLab: {
    offer: "ai_feedback",
    title: "AI Writing Lab",
    description:
      "Get timed writing practice, AI scoring, revision guidance, and sample essays inside one premium writing workflow.",
    href: "/ai-feedback",
    cta: "Get scored feedback",
  },
  sampleEssays: {
    offer: "sample_essays",
    title: "Sample Essays",
    description:
      "Study model Task 1 and Task 2 responses as part of the writing premium bundle.",
    href: "/celpip/writing/samples",
    cta: "See sample essays",
  },
  celpipReadingHub: {
    offer: "reading_hub",
    title: "Reading Hub",
    description:
      "Open the full CELPIP reading page for strategy, the free test, and the premium path.",
    href: "/celpip/reading",
    cta: "Open reading hub",
  },
  celpipWritingHub: {
    offer: "celpip_writing_hub",
    title: "CELPIP Writing Hub",
    description:
      "See question bank, AI feedback, and sample essays on one writing page.",
    href: "/celpip/writing",
    cta: "Open writing hub",
  },
  ebookSpeaking: {
    offer: "ebook_speaking",
    title: "CELPIP Speaking Preparation Guide",
    description:
      "109 pages covering all 8 speaking tasks. Scored samples, response frames, grammar drills, and a 4-week plan. CA$49.50, instant PDF download.",
    href: "/ebook",
    cta: "Get the CELPIP Speaking Preparation Guide",
  },
  ieltsWritingHub: {
    offer: "ielts_writing_hub",
    title: "IELTS Writing Hub",
    description:
      "Open IELTS writing support, lessons, and AI writing feedback in one place.",
    href: "/ielts/writing",
    cta: "Open IELTS writing",
  },
} satisfies Record<string, PromoAction>;

const cloneAction = (
  action: PromoAction,
  overrides: Partial<PromoAction> = {},
): PromoAction => ({
  ...action,
  ...overrides,
});

export const homeFeaturedToolCards: FeaturedToolCard[] = [
  {
    badge: "Return",
    ...cloneAction(promoActions.questionBank, {
      description:
        "Use the free CELPIP question bank for fast daily practice and a strong reason to come back.",
    }),
  },
  {
    badge: "Diagnostic",
    ...cloneAction(promoActions.freeReadingTest),
    note: "One full test free. Premium unlocks after the score report.",
  },
  {
    badge: "Premium",
    ...cloneAction(promoActions.aiWritingLab),
    note: "Includes timed feedback plus sample essays in the writing bundle.",
  },
  {
    badge: "Guide",
    ...cloneAction(promoActions.ebookSpeaking),
    note: "One-time purchase. No subscription.",
  },
];

export const celpipFeaturedToolCards: FeaturedToolCard[] = [
  {
    badge: "Habit",
    ...cloneAction(promoActions.questionBank),
  },
  {
    badge: "Test",
    ...cloneAction(promoActions.freeReadingTest),
  },
  {
    badge: "Premium",
    ...cloneAction(promoActions.aiWritingLab),
    note: "Sample essays are included as part of the writing value story.",
  },
  {
    badge: "Guide",
    ...cloneAction(promoActions.ebookSpeaking),
    note: "One-time purchase. No subscription.",
  },
];

export const celpipWritingFeaturedToolCards: FeaturedToolCard[] = [
  {
    badge: "Premium",
    ...cloneAction(promoActions.aiWritingLab),
  },
  {
    badge: "Proof",
    ...cloneAction(promoActions.sampleEssays),
  },
  {
    badge: "Free",
    ...cloneAction(promoActions.questionBank),
  },
];

export const readingPremiumStripPromo: ContextualPromoConfig = {
  eyebrow: "Reading premium",
  title: "Finish one test free, then unlock the full reading review.",
  intro:
    "Your first score report is the diagnostic. Premium adds detailed answer review, explanations, and the remaining full tests.",
  primary: cloneAction(promoActions.freeReadingTest, {
    cta: "Start free test",
  }),
  secondary: cloneAction(promoActions.celpipReadingHub, {
    title: "See the reading path",
    description:
      "Stay on the reading hub if you want the test list and premium overview first.",
    cta: "Stay on reading hub",
  }),
  variant: "compact",
  promoType: "reading_premium_strip",
};

export const aiFeedbackSecondaryPromo: ContextualPromoConfig = {
  eyebrow: "Lower-pressure option",
  title: "Not ready to submit writing yet?",
  intro:
    "Use the question bank first if you want free prompt practice, then come back when you want scored feedback.",
  primary: cloneAction(promoActions.questionBank, {
    description:
      "Browse the prompt bank, save ideas, and build a writing habit before you move into scoring.",
    cta: "Browse free prompts",
  }),
  secondary: cloneAction(promoActions.sampleEssays, {
    description:
      "Sample essays stay positioned as part of the premium writing bundle, not a separate flagship route.",
    cta: "See the writing bundle",
  }),
  promoType: "contextual_next_step",
};

export const questionBankUpgradePromo: ContextualPromoConfig = {
  eyebrow: "Next step",
  title: "Turn these free prompts into scored writing practice.",
  intro:
    "The AI Writing Lab is the upgrade path. Sample essays support the same premium writing bundle rather than competing with it.",
  primary: cloneAction(promoActions.aiWritingLab, {
    cta: "Go to AI Writing Lab",
  }),
  secondary: cloneAction(promoActions.sampleEssays, {
    description:
      "Use sample essays as proof of what strong responses look like inside the same premium offer.",
    cta: "See sample essays",
  }),
  promoType: "contextual_next_step",
};

export function getLessonPromoConfig({
  exam,
  skill,
  category,
}: {
  exam: "IELTS" | "CELPIP";
  skill?: string;
  category: string;
}): ContextualPromoConfig | null {
  const normalizedSkill = String(skill || category).toLowerCase();

  if (exam === "CELPIP" && normalizedSkill === "reading") {
    return {
      eyebrow: "Next step",
      title: "Use a real reading test after this lesson.",
      intro:
        "Apply the reading skill right away under exam conditions, then use the score report to decide what to study next.",
      primary: cloneAction(promoActions.freeReadingTest),
      secondary: cloneAction(promoActions.celpipReadingHub),
      promoType: "contextual_next_step",
    };
  }

  if (exam === "CELPIP" && normalizedSkill === "writing") {
    return {
      eyebrow: "Next step",
      title: "Move from strategy into scored writing practice.",
      intro:
        "Use the AI Writing Lab when you want feedback, and use sample essays as part of the same premium writing bundle.",
      primary: cloneAction(promoActions.aiWritingLab),
      secondary: cloneAction(promoActions.sampleEssays),
      promoType: "contextual_next_step",
    };
  }

  if (exam === "IELTS" && normalizedSkill === "writing") {
    return {
      eyebrow: "Next step",
      title: "Check your writing under score-focused conditions.",
      intro:
        "Move from free strategy into timed writing and AI feedback when you want to test whether the lesson is actually sticking.",
      primary: cloneAction(promoActions.aiWritingLab, {
        description:
          "Use AI writing feedback to test structure, response quality, and revision decisions on a real draft.",
      }),
      secondary: cloneAction(promoActions.ieltsWritingHub),
      promoType: "contextual_next_step",
    };
  }

  return null;
}

export function getBlogPromoConfig(path: string): ContextualPromoConfig | null {
  const normalizedPath = String(path || "").toLowerCase();

  if (!normalizedPath.startsWith("/blog/")) return null;

  if (normalizedPath.includes("celpip-reading")) {
    return {
      eyebrow: "Practice next",
      title: "Use one full reading test instead of staying in theory.",
      intro:
        "The fastest next move after a CELPIP reading article is a full timed test with an instant score and lesson recommendations.",
      primary: cloneAction(promoActions.freeReadingTest),
      secondary: cloneAction(promoActions.celpipReadingHub),
      promoType: "contextual_next_step",
    };
  }

  if (
    normalizedPath.includes("celpip-writing") ||
    normalizedPath.includes("celpip-sample-answers")
  ) {
    return {
      eyebrow: "Practice next",
      title: "Use the question bank first, then move into scored writing.",
      intro:
        "For CELPIP writing strategy pages, the cleanest path is free prompt practice first and AI scoring second.",
      primary: cloneAction(promoActions.questionBank),
      secondary: cloneAction(promoActions.aiWritingLab),
      promoType: "contextual_next_step",
    };
  }

  if (normalizedPath.includes("ielts-writing")) {
    return {
      eyebrow: "Practice next",
      title: "Turn this IELTS writing guide into a real draft.",
      intro:
        "Use AI feedback when you want to see whether your structure and task response hold up under practice pressure.",
      primary: cloneAction(promoActions.aiWritingLab),
      secondary: cloneAction(promoActions.ieltsWritingHub),
      promoType: "contextual_next_step",
    };
  }

  return null;
}
