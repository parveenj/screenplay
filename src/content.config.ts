import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const story = z.object({
  title: z.string(),
  tag: z.string(),
  year: z.number(),
  date: z.string().optional(),
  h: z.number(),
  summary: z.string(),
  draft: z.boolean().default(false),
  order: z.number().optional(),
  body: z.array(z.object({
    heading: z.string(),
    text: z.string()
  }))
});

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/blog" }),
    schema: story
  }),
  work: defineCollection({
    loader: glob({ pattern: "**/*.json", base: "./src/content/work" }),
    schema: story
  })
};
