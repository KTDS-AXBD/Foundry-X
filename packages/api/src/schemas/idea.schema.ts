import { z } from "@hono/zod-openapi";

export const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).openapi("CreateIdea");

export const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
}).openapi("UpdateIdea");

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  gitRef: z.string(),
  authorId: z.string(),
  orgId: z.string(),
  syncStatus: z.enum(["synced", "pending", "failed"]),
  createdAt: z.number(),
  updatedAt: z.number(),
}).openapi("Idea");
