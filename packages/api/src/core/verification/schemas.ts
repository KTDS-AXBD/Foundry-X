// F552: Dual AI Review Zod schemas
import { z } from "zod";

export const DualReviewInsertSchema = z.object({
  sprint_id: z.number().int().positive(),
  claude_verdict: z.enum(["PASS", "BLOCK", "WARN"]).nullable().optional(),
  codex_verdict: z.enum(["PASS", "BLOCK", "WARN", "PASS-degraded"]),
  codex_json: z.string().min(2),
  divergence_score: z.number().min(0).max(1).default(0),
  decision: z.enum(["PASS", "BLOCK", "WARN", "PASS-degraded"]),
  degraded: z.boolean().default(false),
  degraded_reason: z.string().nullable().optional(),
  model: z.string().default("codex-cli"),
});

export type DualReviewInsertInput = z.infer<typeof DualReviewInsertSchema>;
