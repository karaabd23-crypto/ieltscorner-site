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
    title: "Question Bank",
    description:
      "Free Task 1 and Task 2 prompts.",
    href: "/celpip/writing/questions",
    cta: "Open bank",
  },
  freeReadingTest: {
    offer: "reading_test",
    title: "Reading Test",
    description:
      "One full CELPIP reading test.",
    href: "/celpip/reading/free-test",
    cta: "Start test",
  },
  aiWritingLab: {
    offer: "ai_feedback",
    title: "Writing Lab",
    description:
      "Write with a timer and get AI scoring.",
    href: "/ai-feedback",
    cta: "Start writing",
  },
  sampleEssays: {
    offer: "sample_essays",
    title: "Sample Essays",
    description:
      "Read strong Task 1 and Task 2 sample answers.",
    href: "/celpip/writing/samples",
    cta: "Open samples",
  },
  celpipReadingHub: {
    offer: "reading_hub",
    title: "Reading Hub",
    description:
      "Open the CELPIP reading page for lessons and test links.",
    href: "/celpip/reading",
    cta: "Open reading hub",
  },
  celpipWritingHub: {
    offer: "celpip_writing_hub",
    title: "CELPIP Writing Hub",
    description:
      "See CELPIP writing tools on one page.",
    href: "/celpip/writing",
    cta: "Open writing hub",
  },
  ebookSpeaking: {
    offer: "ebook_speaking",
    title: "Speaking Guide",
    description:
      "109-page guide for all 8 speaking tasks.",
    href: "/ebook",
    cta: "Get guide",
  },
  ieltsWritingHub: {
    offer: "ielts_writing_hub",
    title: "IELTS Writing Hub",
    description:
      "Open IELTS writing lessons and feedback tools in one place.",
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
        "Free daily CELPIP writing prompts.",
    }),
  },
  {
    badge: "Diagnostic",
    ...cloneAction(promoActions.freeReadingTest),
    note: "One full test is free. Paid tests are optional.",
  },
  {
    badge: "Premium",
    ...cloneAction(promoActions.aiWritingLab),
    note: "Timed scoring with samples.",
  },
  {
    badge: "Guide",
    ...cloneAction(promoActions.ebookSpeaking),
    note: "Pay once.",
  },
];

export const celpipFeaturedToolCards: FeaturedToolCard[] = [
  {
    badge: "Start",
    ...cloneAction(promoActions.questionBank),
  },
  {
    badge: "Free test",
    ...cloneAction(promoActions.freeReadingTest),
  },
  {
    badge: "Feedback",
    ...cloneAction(promoActions.aiWritingLab),
    note: "Samples included.",
  },
  {
    badge: "Guide",
    ...cloneAction(promoActions.ebookSpeaking),
    note: "Pay once.",
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
  eyebrow: "Reading paid plan",
  title: "Finish one free test, then choose paid review if you want.",
  intro:
    "Your first test is free. The paid plan gives more tests and full answer review.",
  primary: cloneAction(promoActions.freeReadingTest, {
    cta: "Start free test",
  }),
  secondary: cloneAction(promoActions.celpipReadingHub, {
    title: "See reading page",
    description:
      "Open the reading page to see all tests and options.",
    cta: "Stay on reading hub",
  }),
  variant: "compact",
  promoType: "reading_premium_strip",
};

export const aiFeedbackSecondaryPromo: ContextualPromoConfig = {
  eyebrow: "Free option",
  title: "Not ready to submit writing?",
  intro:
    "Use the free CELPIP question bank first. Come back later for scored feedback.",
  primary: cloneAction(promoActions.questionBank, {
    description:
      "Read prompts, save ideas, and practice before paid scoring.",
    cta: "Browse free prompts",
  }),
  secondary: cloneAction(promoActions.sampleEssays, {
    description:
      "Use sample essays to see what a strong answer looks like.",
    cta: "See the writing bundle",
  }),
  promoType: "contextual_next_step",
};

export const questionBankUpgradePromo: ContextualPromoConfig = {
  eyebrow: "Next step",
  title: "Turn free prompts into scored writing.",
  intro:
    "Use Writing Lab when you want scored feedback.",
  primary: cloneAction(promoActions.aiWritingLab, {
    title: "Writing Lab",
    cta: "Open writing lab",
  }),
  secondary: cloneAction(promoActions.sampleEssays, {
    description:
      "Use sample essays to compare your answer.",
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
        "Try one full reading test now. Use your score to pick your next lesson.",
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
        "Use Writing Lab for feedback. Use sample essays to compare your work.",
      primary: cloneAction(promoActions.aiWritingLab, {
        title: "Writing Lab",
        cta: "Open writing lab",
      }),
      secondary: cloneAction(promoActions.sampleEssays),
      promoType: "contextual_next_step",
    };
  }

  if (exam === "IELTS" && normalizedSkill === "writing") {
    return {
      eyebrow: "Next step",
      title: "Check your writing under score-focused conditions.",
      intro:
        "After the lesson, write with a timer and get AI feedback.",
      primary: cloneAction(promoActions.aiWritingLab, {
        description:
          "Use AI feedback to check your structure, grammar, and ideas.",
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
        "After this article, do one full reading test and check your score.",
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
      title: "Use the CELPIP question bank first, then move into scored writing.",
      intro:
        "Start with free prompts. Then use AI scoring when you are ready.",
      primary: cloneAction(promoActions.questionBank),
      secondary: cloneAction(promoActions.aiWritingLab, {
        title: "Practice CELPIP writing",
        cta: "Practice CELPIP writing",
      }),
      promoType: "contextual_next_step",
    };
  }

  if (normalizedPath.includes("ielts-writing")) {
    return {
      eyebrow: "Practice next",
      title: "Turn this IELTS writing guide into a real draft.",
      intro:
        "Now write one draft and check it with AI feedback.",
      primary: cloneAction(promoActions.aiWritingLab),
      secondary: cloneAction(promoActions.ieltsWritingHub),
      promoType: "contextual_next_step",
    };
  }

  return null;
}


