import { defineCollection, z } from "astro:content";

const lessons = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.enum(["grammar", "vocabulary", "writing", "speaking"]),
    level: z.string().default("C1"),
    exam: z.array(z.enum(["IELTS", "CELPIP"])).default(["IELTS", "CELPIP"]),
    excerpt: z.string(),
    date: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
