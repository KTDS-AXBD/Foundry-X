/**
 * Sprint 56 F188: Six Hats 토론 시뮬레이션 — Zod 스키마
 */
import { z } from "zod";

export const HatColorSchema = z.enum(["white", "red", "black", "yellow", "green", "blue"]);

export const StartSixHatsSchema = z.object({
  // 별도 body 파라미터 없음 — prdId는 URL path에서
}).optional();

export const SixHatsTurnSchema = z.object({
  turnNumber: z.number().int().min(1).max(20),
  hat: HatColorSchema,
  hatLabel: z.string(),
  content: z.string(),
  tokens: z.number().int().min(0),
  durationSeconds: z.number().min(0),
});

export const SixHatsDebateSchema = z.object({
  id: z.string(),
  prdId: z.string(),
  bizItemId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  totalTurns: z.number().int(),
  completedTurns: z.number().int(),
  turns: z.array(SixHatsTurnSchema),
  keyIssues: z.array(z.string()),
  summary: z.string(),
  model: z.string(),
  totalTokens: z.number().int(),
  durationSeconds: z.number(),
});
