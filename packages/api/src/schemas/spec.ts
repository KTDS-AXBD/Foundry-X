import { z } from "@hono/zod-openapi";

export const SpecGenerateRequestSchema = z
  .object({
    text: z.string().min(10).max(2000).describe("자연어 요구사항 텍스트"),
    context: z.string().max(1000).optional().describe("추가 컨텍스트"),
    language: z.enum(["ko", "en"]).default("ko").describe("출력 언어"),
  })
  .openapi("SpecGenerateRequest");

export const GeneratedSpecSchema = z
  .object({
    title: z.string().min(5).max(100),
    description: z.string().min(20).max(500),
    acceptanceCriteria: z.array(z.string()).min(1).max(10),
    priority: z.enum(["P0", "P1", "P2", "P3"]),
    estimatedEffort: z.enum(["XS", "S", "M", "L", "XL"]),
    category: z.enum(["feature", "bugfix", "improvement", "infrastructure"]),
    dependencies: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
  })
  .openapi("GeneratedSpec");

export const SpecGenerateResponseSchema = z
  .object({
    spec: GeneratedSpecSchema,
    markdown: z.string().describe("Markdown 포맷 명세 문서"),
    confidence: z.number().min(0).max(1).describe("LLM 변환 신뢰도"),
    model: z.string().describe("사용된 LLM 모델명"),
  })
  .openapi("SpecGenerateResponse");
