import { z } from "@hono/zod-openapi";

export const WikiPageSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    content: z.string(),
    filePath: z.string(),
    lastModified: z.string(),
    author: z.string(),
  })
  .openapi("WikiPage");

export const WikiCreateSchema = z
  .object({
    filePath: z.string().min(1, "filePath field is required"),
    content: z.string().optional(),
    title: z.string().optional(),
  })
  .openapi("WikiCreate");

export const WikiUpdateSchema = z
  .object({
    content: z.string({ required_error: "content field is required" }),
  })
  .openapi("WikiUpdate");

export const WikiSlugParamSchema = z.object({
  slug: z.string(),
});

export const WikiActionResponseSchema = z
  .object({
    ok: z.boolean(),
    slug: z.string(),
    filePath: z.string(),
  })
  .openapi("WikiActionResponse");
