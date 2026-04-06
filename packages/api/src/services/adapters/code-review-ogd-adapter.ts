// F360: Code Review O-G-D Adapter (Sprint 163)
// diff + context → LLM 리뷰 → 점수 + 피드백

import type { DomainAdapterInterface } from "@foundry-x/shared";

interface CodeReviewInput {
  diff: string;
  context?: string;
  language?: string;
}

/**
 * 코드리뷰 어댑터 — diff 입력 → LLM 리뷰 리포트 생성 → 품질 평가
 */
export class CodeReviewOgdAdapter implements DomainAdapterInterface {
  readonly domain = "code-review";
  readonly displayName = "코드 리뷰";
  readonly description = "코드 diff를 분석하여 보안, 성능, 가독성 등을 평가합니다.";

  constructor(private ai: Ai) {}

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { diff, context, language } = input as CodeReviewInput;

    const systemPrompt = [
      "You are an expert code reviewer.",
      `Review the following ${language ?? "code"} diff.`,
      "For each issue found, provide:",
      "- Category (security/performance/readability/bug/style)",
      "- Severity (critical/warning/info)",
      "- Description and suggested fix",
      "Output as JSON: { issues: [{category, severity, description, suggestion}], summary: string }",
    ].join(" ");

    let userPrompt = `Diff:\n\`\`\`\n${diff.slice(0, 6000)}\n\`\`\``;
    if (context) {
      userPrompt += `\n\nContext:\n${context.slice(0, 2000)}`;
    }
    if (feedback) {
      userPrompt += `\n\nPrevious review feedback to incorporate:\n${feedback}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
      },
    ) as { response?: string };

    const raw = response.response ?? "";
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { output: JSON.parse(jsonMatch[0]) };
      }
    } catch {
      // fallthrough
    }
    return { output: { issues: [], summary: raw.slice(0, 1000) } };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const review = output as { issues?: Array<{ severity?: string }>; summary?: string };
    const issues = review.issues ?? [];

    // 점수 산출: critical -0.3, warning -0.1, info -0.02
    let score = 1.0;
    const criticals = issues.filter((i) => i.severity === "critical").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const infos = issues.filter((i) => i.severity === "info").length;

    score -= criticals * 0.3;
    score -= warnings * 0.1;
    score -= infos * 0.02;
    score = Math.max(0, Math.min(1, score));

    const feedback = [
      `Issues: ${criticals} critical, ${warnings} warning, ${infos} info`,
      review.summary ?? "",
      rubric ? `Rubric: ${rubric}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    return { score, feedback, pass: score >= 0.85 };
  }

  getDefaultRubric(): string {
    return [
      "1. 보안 취약점 (SQL injection, XSS, CSRF) 없음",
      "2. 성능 병목 없음 (N+1 쿼리, 불필요한 반복)",
      "3. 에러 핸들링이 적절함",
      "4. 타입 안전성 확보",
      "5. 코드 가독성 양호",
      "6. 테스트 커버리지 적절",
      "7. OWASP Top 10 준수",
      "8. 불필요한 의존성 추가 없음",
      "9. 네이밍 컨벤션 준수",
      "10. 데드코드 없음",
    ].join("\n");
  }
}
