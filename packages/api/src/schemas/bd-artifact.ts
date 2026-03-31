import { z } from "zod";

// ── Request Schemas ─────────────────────────────

export const executeSkillSchema = z.object({
  bizItemId: z.string().min(1),
  stageId: z.string().regex(/^2-(?:10|[0-9])$/, "stageId must be 2-0 ~ 2-10"),
  inputText: z.string().min(1).max(10000),
});

export type ExecuteSkillInput = z.infer<typeof executeSkillSchema>;

// ── Query Schemas ───────────────────────────────

export const artifactListQuerySchema = z.object({
  bizItemId: z.string().optional(),
  stageId: z.string().optional(),
  skillId: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ArtifactListQuery = z.infer<typeof artifactListQuerySchema>;

// ── Response Types ──────────────────────────────

export interface BdArtifact {
  id: string;
  orgId: string;
  bizItemId: string;
  skillId: string;
  stageId: string;
  version: number;
  inputText: string;
  outputText: string | null;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "pending" | "running" | "completed" | "failed";
  createdBy: string;
  createdAt: string;
}

export interface SkillExecutionResult {
  artifactId: string;
  skillId: string;
  version: number;
  outputText: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "completed" | "failed";
}
