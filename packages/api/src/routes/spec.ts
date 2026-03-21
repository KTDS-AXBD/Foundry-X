import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  SpecGenerateRequestSchema,
  SpecGenerateResponseSchema,
  GeneratedSpecSchema,
  SpecConflictSchema,
  ConflictResolveRequestSchema,
  ExistingSpecSchema,
} from "../schemas/spec.js";
import { LLMService, NL_TO_SPEC_SYSTEM_PROMPT, buildUserPrompt } from "../services/llm.js";
import { ConflictDetector } from "../services/conflict-detector.js";
import { validationHook, SuccessSchema, ErrorSchema } from "../schemas/common.js";
import { GitHubService } from "../services/github.js";
import { KVCacheService } from "../services/kv-cache.js";
import {
  parseSpecRequirements as parseSpecFItems,
  type SpecRequirement,
} from "../services/spec-parser.js";
import type { SpecConflict, ExistingSpec } from "../services/conflict-detector.js";
import type { Env } from "../env.js";

export const specRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

// ─── POST /spec/generate (기존 + F54 충돌 감지 추가) ───

const generateSpecRoute = createRoute({
  method: "post",
  path: "/spec/generate",
  tags: ["Spec"],
  summary: "자연어 → 구조화 명세 변환 (충돌 감지 포함)",
  request: {
    body: {
      content: { "application/json": { schema: SpecGenerateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "생성된 명세 + 충돌 정보",
      content: { "application/json": { schema: SpecGenerateResponseSchema } },
    },
    422: { description: "LLM 출력 검증 실패" },
    503: { description: "LLM 서비스 불가" },
  },
});

specRoute.openapi(generateSpecRoute, async (c) => {
  const { text, context, language } = c.req.valid("json");

  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);

  const systemPrompt =
    language === "en"
      ? NL_TO_SPEC_SYSTEM_PROMPT
      : NL_TO_SPEC_SYSTEM_PROMPT + "\n\nRespond in Korean (한국어).";

  let response;
  try {
    response = await llm.generate(systemPrompt, buildUserPrompt(text, context));
  } catch {
    return c.json({ error: "LLM service unavailable", errorCode: "INTEGRATION_003" }, 503);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content);
  } catch {
    return c.json({ error: "LLM output is not valid JSON", errorCode: "VALIDATION_002" }, 422);
  }

  const result = GeneratedSpecSchema.safeParse(parsed);
  if (!result.success) {
    return c.json(
      {
        error: "LLM output does not match schema",
        details: result.error.issues,
      },
      422,
    );
  }

  const markdown = generateSpecMarkdown(result.data);

  // F54: 충돌 감지 (실패해도 생성은 계속)
  let conflicts: SpecConflict[] = [];
  try {
    const existingSpecs = await getExistingSpecsFromRequirements(c.env);
    const detector = new ConflictDetector(llm);
    conflicts = await detector.detect(
      {
        title: result.data.title,
        description: result.data.description,
        priority: result.data.priority,
        dependencies: result.data.dependencies,
      },
      existingSpecs,
    );
  } catch {
    // 충돌 감지 실패 시 빈 배열 — 생성 자체를 방해하지 않음
  }

  return c.json({
    spec: result.data,
    markdown,
    confidence: 0.85,
    model: response.model,
    conflicts,
  });
});

// ─── POST /spec/conflicts/resolve (F54) ───

const resolveConflictRoute = createRoute({
  method: "post",
  path: "/spec/conflicts/resolve",
  tags: ["Spec"],
  summary: "Spec 충돌 해결 기록",
  request: {
    body: {
      content: { "application/json": { schema: ConflictResolveRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "해결 기록 완료",
      content: { "application/json": { schema: SuccessSchema } },
    },
    404: {
      description: "충돌 레코드 없음",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

specRoute.openapi(resolveConflictRoute, async (c) => {
  const { conflictId, resolution, modifiedValue } = c.req.valid("json");

  const existing = await c.env.DB
    .prepare("SELECT id FROM spec_conflicts WHERE id = ?")
    .bind(conflictId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json({ error: `Conflict '${conflictId}' not found`, errorCode: "RESOURCE_001" }, 404);
  }

  await c.env.DB
    .prepare(
      `UPDATE spec_conflicts SET resolution = ?, resolved_at = datetime('now') WHERE id = ?`,
    )
    .bind(resolution, conflictId)
    .run();

  return c.json({ ok: true });
});

// ─── GET /spec/existing (F54) ───

const listExistingSpecsRoute = createRoute({
  method: "get",
  path: "/spec/existing",
  tags: ["Spec"],
  summary: "기존 Spec 목록 반환",
  responses: {
    200: {
      description: "기존 Spec 목록",
      content: { "application/json": { schema: z.array(ExistingSpecSchema) } },
    },
  },
});

specRoute.openapi(listExistingSpecsRoute, async (c) => {
  const specs = await getExistingSpecsFromRequirements(c.env);
  return c.json(specs);
});

// ─── Helper: requirements에서 ExistingSpec 변환 ───

async function getExistingSpecsFromRequirements(env: Env): Promise<ExistingSpec[]> {
  try {
    const github = new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO);
    const cache = new KVCacheService(env.CACHE);

    const specItems = await cache.getOrFetch<SpecRequirement[]>(
      "spec:requirements",
      async () => {
        const { content } = await github.getFileContent("SPEC.md");
        return parseSpecFItems(content);
      },
      300,
    );

    return specItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.notes || item.title,
      category: "feature",
      priority: "P1",
      dependencies: [],
      status: item.status === "rejected" ? "planned" as const : item.status,
    }));
  } catch {
    // GitHub/KV 실패 시 빈 배열
    return [];
  }
}

// ─── Markdown 생성 헬퍼 (기존) ───

function generateSpecMarkdown(spec: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  estimatedEffort: string;
  category: string;
  dependencies: string[];
  risks: string[];
}): string {
  return `# ${spec.title}

## 설명
${spec.description}

## 인수 기준
${spec.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join("\n")}

## 메타데이터
- **우선순위**: ${spec.priority}
- **예상 규모**: ${spec.estimatedEffort}
- **분류**: ${spec.category}
${spec.dependencies.length ? `\n## 의존성\n${spec.dependencies.map((d) => `- ${d}`).join("\n")}` : ""}
${spec.risks.length ? `\n## 리스크\n${spec.risks.map((r) => `- ${r}`).join("\n")}` : ""}
`;
}
