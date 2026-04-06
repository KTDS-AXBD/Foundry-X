import { z } from "@hono/zod-openapi";

// ─── Bulk Signup ───

export const BulkAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
}).openapi("BulkAccount");

export const BulkSignupSchema = z.object({
  orgId: z.string().min(1),
  accounts: z.array(BulkAccountSchema).min(1).max(50),
  defaultPassword: z.string().min(8).optional(),
}).openapi("BulkSignup");

export const BulkSignupDetailSchema = z.object({
  email: z.string(),
  status: z.enum(["created", "skipped", "failed"]),
  tempPassword: z.string().optional(),
  reason: z.string().optional(),
}).openapi("BulkSignupDetail");

export const BulkSignupResultSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  failed: z.number(),
  details: z.array(BulkSignupDetailSchema),
}).openapi("BulkSignupResult");
