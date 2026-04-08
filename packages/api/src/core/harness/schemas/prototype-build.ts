// Sprint 222: F457 — Prototype Builder 실행 요청 스키마
import { z } from "zod";

export const PrototypeBuildSchema = z.object({
  prdContent: z.string().min(100, "PRD 내용이 너무 짧아요"),
  prdTitle: z.string().min(1),
  bizItemId: z.string().min(1),
  builderType: z.enum(["cli", "api", "ensemble"]).default("cli"),
});

export type PrototypeBuildInput = z.infer<typeof PrototypeBuildSchema>;
