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

// F54: Spec 충돌 스키마
export const SpecConflictSchema = z
  .object({
    type: z.enum(["direct", "dependency", "priority", "scope"]).describe("충돌 유형"),
    severity: z.enum(["critical", "warning", "info"]).describe("심각도"),
    existingSpec: z.object({
      id: z.string(),
      title: z.string(),
      field: z.string(),
      value: z.string(),
    }).describe("기존 Spec 정보"),
    newSpec: z.object({
      field: z.string(),
      value: z.string(),
    }).describe("새 Spec 정보"),
    description: z.string().describe("충돌 설명"),
    suggestion: z.string().optional().describe("해결 제안"),
  })
  .openapi("SpecConflict");

export const SpecGenerateResponseSchema = z
  .object({
    spec: GeneratedSpecSchema,
    markdown: z.string().describe("Markdown 포맷 명세 문서"),
    confidence: z.number().min(0).max(1).describe("LLM 변환 신뢰도"),
    model: z.string().describe("사용된 LLM 모델명"),
    conflicts: z.array(SpecConflictSchema).default([]).describe("감지된 충돌 목록"),
  })
  .openapi("SpecGenerateResponse");

// F54: 충돌 해결 요청 스키마
export const ConflictResolveRequestSchema = z
  .object({
    conflictId: z.string().describe("충돌 레코드 ID"),
    resolution: z.enum(["accept", "reject", "modify"]).describe("해결 방식"),
    modifiedValue: z.string().optional().describe("modify 시 수정된 값"),
  })
  .openapi("ConflictResolveRequest");

// F54: 기존 Spec 목록 응답 스키마
export const ExistingSpecSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    priority: z.string(),
    dependencies: z.array(z.string()),
    status: z.enum(["planned", "in_progress", "done"]),
  })
  .openapi("ExistingSpec");
