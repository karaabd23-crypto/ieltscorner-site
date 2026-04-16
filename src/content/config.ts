import { defineCollection, z } from "astro:content";

const lessons = defineCollection({
  type: "content",
  schema: z.object({
    test: z
      .enum(["IELTS", "CELPIP", "ielts", "celpip"])
      .optional()
      .transform((value) => (value ? (value.toUpperCase() as "IELTS" | "CELPIP") : value)),
    skill: z.enum(["grammar", "vocabulary", "writing", "speaking", "listening", "reading"]).optional(),
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(["grammar", "vocabulary", "writing", "speaking", "listening", "reading"]),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("C1"),
    ieltsBand: z.string().default("6.0-6.5"),
    clb: z.string().default("7-8"),
    exam: z.array(z.enum(["IELTS", "CELPIP"])).default(["IELTS", "CELPIP"]),
    excerpt: z.string(),
    date: z.string(),
    tags: z.array(z.string()).default([]),
    heroTip: z.string().default(""),
    visualAids: z.array(z.string()).default([]),
    quiz: z
      .array(
        z.object({
          prompt: z.string(),
          options: z.array(z.string()).min(2).max(5),
          correctIndex: z.number(),
          explanation: z.string().optional(),
        })
      )
      .default([]),
    premium: z.boolean().default(false),
    priceCAD: z.number().default(12),
    draft: z.boolean().default(false),
  }),
});

const questions = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    taskType: z.enum(["email", "survey"]),
    targetCLB: z.number().min(6).max(10),
    prompt: z.string(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { lessons, questions };
