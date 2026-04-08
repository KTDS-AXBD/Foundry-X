// F463: PRD QSA Adapter (Sprint 225)
// PRD 완결성/논리성/실행가능성 판별 + 착수 판단 기준
// ogd-discriminator(빠른 게이트키핑)와 역할 분리 — 심층 완결성 판별 전용

import type { DomainAdapterInterface } from "@foundry-x/shared";

/**
 * PRD QSA 5차원 Rubric 가중치
 * PR-1: 문제 정의 (0.25) — As-Is/To-Be/시급성
 * PR-2: 기능 범위 (0.25) — Must Have + Out-of-scope
 * PR-3: 성공 기준 (0.20) — KPI 정량성 + MVP 기준
 * PR-4: 기술 실현성 (0.15) — 기술 스택 + 의존성
 * PR-5: 논리적 일관성 (0.15) — 문제→해결책→성공기준 흐름
 */
const PR_RUBRIC_WEIGHTS: Record<string, number> = {
  "PR-1": 0.25,
  "PR-2": 0.25,
  "PR-3": 0.20,
  "PR-4": 0.15,
  "PR-5": 0.15,
};

export class PrdQsaAdapter implements DomainAdapterInterface {
  readonly domain = "prd-qsa";
  readonly displayName = "PRD 완결성 판별";
  readonly description =
    "PRD의 완결성/논리성/실행가능성을 PR-1~PR-5 기준으로 심층 판별하고 착수 가능 여부를 결정합니다.";

  constructor(private ai: Ai) {}

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { prdContent } = input as { prdContent: string };

    const systemPrompt = [
      "You are a senior product manager and PRD quality expert.",
      "Given a PRD, improve it to be comprehensive and actionable.",
      "Ensure the PRD covers: problem definition (As-Is/To-Be/urgency),",
      "feature scope (Must Have + Out-of-scope), success criteria (KPI + MVP),",
      "technical feasibility (tech stack + dependencies), and logical consistency.",
      "Output an improved PRD in the same format as the input, in Korean.",
    ].join(" ");

    let userPrompt = `PRD 원문:\n${prdContent}`;
    if (feedback) {
      userPrompt += `\n\n개선 필요 사항 (이전 판별 피드백):\n${feedback}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      },
    ) as { response?: string };

    return { output: response.response || prdContent };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const prdContent = output as string;

    const systemPrompt = [
      "You are a PRD completeness evaluator using a 5-dimension rubric.",
      "Evaluate the PRD and return JSON:",
      '{ "scores": { "PR-1": 0.0~1.0, "PR-2": 0.0~1.0, "PR-3": 0.0~1.0, "PR-4": 0.0~1.0, "PR-5": 0.0~1.0 },',
      '"feedback": "specific improvement suggestions in Korean",',
      '"readyForExecution": true/false }',
      "PR-1(0.25): Problem definition — As-Is/To-Be/urgency specificity.",
      "PR-2(0.25): Feature scope — Must Have items + explicit Out-of-scope.",
      "PR-3(0.20): Success criteria — quantitative KPI + MVP threshold + failure conditions.",
      "PR-4(0.15): Technical feasibility — tech stack mentioned + dependencies identified.",
      "PR-5(0.15): Logical consistency — problem→solution→success criteria flow.",
      "Score 1.0 = fully satisfies the rubric dimension.",
    ].join(" ");

    const userPrompt = `Rubric:\n${rubric}\n\nPRD:\n${prdContent.slice(0, 8000)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
      },
    ) as { response?: string };

    return this.parseDiscriminatorResponse(response.response ?? "");
  }

  getDefaultRubric(): string {
    return [
      "PR-1 (문제 정의, 가중치 0.25): As-Is 현황 + To-Be 목표 + 시급성/비즈니스 임팩트가 구체적으로 명시되어야 한다.",
      "PR-2 (기능 범위, 가중치 0.25): Must Have 기능 목록 + Out-of-scope 항목이 명확히 구분되어야 한다.",
      "PR-3 (성공 기준, 가중치 0.20): 정량적 KPI + MVP 완료 기준 + 실패 조건이 모두 포함되어야 한다.",
      "PR-4 (기술 실현성, 가중치 0.15): 기술 스택 명시 + 외부 의존성 식별 + 기술적 제약 사항이 있어야 한다.",
      "PR-5 (논리적 일관성, 가중치 0.15): 문제→해결책→성공기준의 인과 흐름이 논리적으로 연결되어야 한다.",
    ].join("\n");
  }

  private parseDiscriminatorResponse(raw: string): {
    score: number;
    feedback: string;
    pass: boolean;
  } {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          scores?: Record<string, number>;
          feedback?: string;
          readyForExecution?: boolean;
        };

        if (parsed.scores) {
          const weightedScore = Object.entries(PR_RUBRIC_WEIGHTS).reduce(
            (sum, [dim, weight]) => {
              const dimScore = Math.max(0, Math.min(1, Number(parsed.scores?.[dim]) || 0));
              return sum + dimScore * weight;
            },
            0,
          );

          const score = Math.round(weightedScore * 100) / 100;
          return {
            score,
            feedback: parsed.feedback ?? "",
            pass: score >= 0.85 && (parsed.readyForExecution ?? false),
          };
        }
      }
    } catch {
      // fallback
    }

    return { score: 0.5, feedback: raw.slice(0, 500), pass: false };
  }
}
