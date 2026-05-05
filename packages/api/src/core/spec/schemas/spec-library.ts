import { z } from "@hono/zod-openapi";

export const SpecLibraryCreateSchema = z
  .object({
    title: z.string().min(1).max(300),
    category: z.enum(["feature", "api", "component", "integration", "other"]).default("other"),
    tags: z.array(z.string()).default([]),
    content: z.string().min(1),
    version: z.string().default("1.0.0"),
    status: z.enum(["draft", "active", "deprecated"]).default("draft"),
  })
  .openapi("SpecLibraryCreate");

export const SpecLibraryResponseSchema = z
  .object({
    id: z.string(),
    orgId: z.string(),
    title: z.string(),
    category: z.enum(["feature", "api", "component", "integration", "other"]),
    tags: z.array(z.string()),
    content: z.string(),
    version: z.string(),
    status: z.enum(["draft", "active", "deprecated"]),
    author: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("SpecLibraryResponse");

export const SpecLibraryUpdateSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    category: z.enum(["feature", "api", "component", "integration", "other"]).optional(),
    tags: z.array(z.string()).optional(),
    content: z.string().min(1).optional(),
    version: z.string().optional(),
    status: z.enum(["draft", "active", "deprecated"]).optional(),
  })
  .openapi("SpecLibraryUpdate");

export const SpecLibraryQuerySchema = z
  .object({
    category: z.enum(["feature", "api", "component", "integration", "other"]).optional(),
    tag: z.string().optional(),
    status: z.enum(["draft", "active", "deprecated"]).optional(),
  })
  .openapi("SpecLibraryQuery");
