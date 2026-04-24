import { z } from "@hono/zod-openapi";

export const OrgSharedBmcItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    authorId: z.string(),
    authorName: z.string().nullable(),
    authorEmail: z.string().nullable(),
    syncStatus: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .openapi("OrgSharedBmcItem");

export const OrgSharedBmcsResponseSchema = z
  .object({
    items: z.array(OrgSharedBmcItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  })
  .openapi("OrgSharedBmcsResponse");

export const OrgActivityItemSchema = z
  .object({
    type: z.string(),
    resourceId: z.string(),
    title: z.string(),
    actorId: z.string(),
    actorName: z.string().nullable(),
    timestamp: z.string(),
  })
  .openapi("OrgActivityItem");

export const OrgActivityFeedResponseSchema = z
  .object({
    items: z.array(OrgActivityItemSchema),
  })
  .openapi("OrgActivityFeedResponse");
