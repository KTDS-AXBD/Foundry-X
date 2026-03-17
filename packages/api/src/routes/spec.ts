import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  SpecGenerateRequestSchema,
  SpecGenerateResponseSchema,
  GeneratedSpecSchema,
} from "../schemas/spec.js";
import { LLMService, NL_TO_SPEC_SYSTEM_PROMPT, buildUserPrompt } from "../services/llm.js";
import { validationHook } from "../schemas/common.js";
import type { Env } from "../env.js";

export const specRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

const generateSpecRoute = createRoute({
  method: "post",
  path: "/spec/generate",
  tags: ["Spec"],
  summary: "자연어 → 구조화 명세 변환",
  request: {
    body: {
      content: { "application/json": { schema: SpecGenerateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "생성된 명세",
      content: { "application/json": { schema: SpecGenerateResponseSchema } },
    },
    422: { description: "LLM 출력 검증 실패" },
    503: { description: "LLM 서비스 불가" },
  },
});

specRoute.openapi(generateSpecRoute, async (c) => {
  const { text, context, language } = c.req.valid("json");

  let llm: LLMService;
  try {
    llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  } catch {
    return c.json({ error: "LLM service unavailable" }, 503);
  }

  const systemPrompt =
    language === "en"
      ? NL_TO_SPEC_SYSTEM_PROMPT
      : NL_TO_SPEC_SYSTEM_PROMPT + "\n\nRespond in Korean (한국어).";

  let response;
  try {
    response = await llm.generate(systemPrompt, buildUserPrompt(text, context));
  } catch {
    return c.json({ error: "LLM service unavailable" }, 503);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content);
  } catch {
    return c.json({ error: "LLM output is not valid JSON" }, 422);
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

  return c.json({
    spec: result.data,
    markdown,
    confidence: 0.85,
    model: response.model,
  });
});

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
