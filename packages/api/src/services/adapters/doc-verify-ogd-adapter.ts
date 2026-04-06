// F360: Document Verify O-G-D Adapter (Sprint 163)
// 문서 입력 → LLM 일관성 검증 → 점수 + 이슈 목록

import type { DomainAdapterInterface } from "@foundry-x/shared";

interface DocVerifyInput {
  document: string;
  title?: string;
  relatedDocs?: string[];
}

/**
 * 문서검증 어댑터 — 문서 일관성, 구조, 용어, 참조를 검증
 */
export class DocVerifyOgdAdapter implements DomainAdapterInterface {
  readonly domain = "doc-verify";
  readonly displayName = "문서 검증";
  readonly description = "문서의 구조, 용어, 참조 일관성을 검증합니다.";

  constructor(private ai: Ai) {}

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { document, title, relatedDocs } = input as DocVerifyInput;

    const systemPrompt = [
      "You are a technical document verifier.",
      "Analyze the document for:",
      "1. Structural consistency (headings, sections, formatting)",
      "2. Terminology consistency (same concept = same term)",
      "3. Reference integrity (all references resolve)",
      "4. Completeness (no missing sections per the standard)",
      "5. Factual accuracy (numbers, dates, version references)",
      "Output JSON: { issues: [{category, severity, location, description}], summary: string, structureScore: number, terminologyScore: number, referenceScore: number, completenessScore: number }",
    ].join(" ");

    let userPrompt = title ? `Document: ${title}\n\n` : "";
    userPrompt += document.slice(0, 8000);
    if (relatedDocs?.length) {
      userPrompt += `\n\nRelated documents for cross-reference:\n${relatedDocs.join("\n").slice(0, 2000)}`;
    }
    if (feedback) {
      userPrompt += `\n\nPrevious verification feedback:\n${feedback}`;
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
    return {
      output: {
        issues: [],
        summary: raw.slice(0, 1000),
        structureScore: 0.5,
        terminologyScore: 0.5,
        referenceScore: 0.5,
        completenessScore: 0.5,
      },
    };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const result = output as {
      issues?: Array<{ severity?: string }>;
      summary?: string;
      structureScore?: number;
      terminologyScore?: number;
      referenceScore?: number;
      completenessScore?: number;
    };

    // 4축 평균 점수
    const scores = [
      result.structureScore ?? 0.5,
      result.terminologyScore ?? 0.5,
      result.referenceScore ?? 0.5,
      result.completenessScore ?? 0.5,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // 이슈 기반 감점
    const issues = result.issues ?? [];
    const criticals = issues.filter((i) => i.severity === "critical").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;

    let score = avgScore;
    score -= criticals * 0.2;
    score -= warnings * 0.05;
    score = Math.max(0, Math.min(1, score));

    const feedback = [
      result.summary ?? "",
      `Scores: structure=${scores[0]!.toFixed(2)} terminology=${scores[1]!.toFixed(2)} reference=${scores[2]!.toFixed(2)} completeness=${scores[3]!.toFixed(2)}`,
      `Issues: ${criticals} critical, ${warnings} warning`,
      rubric ? `Rubric applied: ${rubric.slice(0, 200)}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    return { score, feedback, pass: score >= 0.85 };
  }

  getDefaultRubric(): string {
    return [
      "1. 문서 제목과 메타데이터가 정확함",
      "2. 섹션 구조가 표준 템플릿을 따름",
      "3. 동일 개념에 동일 용어 사용",
      "4. 모든 문서 간 참조([[코드]])가 유효함",
      "5. 수치/날짜가 다른 문서와 일치함",
      "6. 빠진 필수 섹션이 없음",
      "7. 마크다운 문법 오류 없음",
    ].join("\n");
  }
}
