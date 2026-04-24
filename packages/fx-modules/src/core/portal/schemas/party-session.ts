import { z } from "@hono/zod-openapi";

export const PartySessionCreateSchema = z
  .object({
    topic: z.string().min(1).max(500),
    mode: z.enum(["free-form", "round-robin", "moderated"]).default("free-form"),
    maxParticipants: z.number().int().min(2).max(50).default(10),
  })
  .openapi("PartySessionCreate");

export const PartySessionResponseSchema = z
  .object({
    id: z.string(),
    orgId: z.string(),
    topic: z.string(),
    mode: z.enum(["free-form", "round-robin", "moderated"]),
    status: z.enum(["active", "concluded", "cancelled"]),
    maxParticipants: z.number(),
    createdBy: z.string(),
    summary: z.string().nullable(),
    createdAt: z.string(),
    concludedAt: z.string().nullable(),
  })
  .openapi("PartySessionResponse");

export const PartyJoinSchema = z
  .object({
    agentRole: z.string().min(1).max(100),
  })
  .openapi("PartyJoin");

export const PartyMessageCreateSchema = z
  .object({
    agentRole: z.string().min(1).max(100),
    content: z.string().min(1).max(10000),
    messageType: z.enum(["opinion", "question", "answer", "summary"]).default("opinion"),
    replyTo: z.string().optional(),
  })
  .openapi("PartyMessageCreate");

export const PartyMessageResponseSchema = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    agentRole: z.string(),
    content: z.string(),
    messageType: z.enum(["opinion", "question", "answer", "summary"]),
    replyTo: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("PartyMessageResponse");

export const PartyConcludeSchema = z
  .object({
    summary: z.string().min(1).max(10000),
  })
  .openapi("PartyConclude");
