// F360: BD 형상화 O-G-D Adapter (Sprint 163)
// 기존 OgdOrchestratorService의 generate/discriminate 패턴을 DomainAdapter로 래핑

import type { DomainAdapterInterface } from "@foundry-x/shared";

/**
 * BD 형상화 어댑터 — PRD 입력 → 형상화 문서 생성 → 품질 평가
 * Workers AI를 직접 사용 (기존 ogd-orchestrator-service의 패턴 재활용)
 */
export class BdShapingOgdAdapter implements DomainAdapterInterface {
  readonly domain = "bd-shaping";
  readonly displayName = "BD 형상화";
  readonly description = "BD PRD를 기반으로 사업 형상화 문서를 생성하고 품질을 평가합니다.";

  constructor(private ai: Ai) {}

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { prdContent } = input as { prdContent: string };

    const systemPrompt = [
      "You are a business development document shaper.",
      "Given a PRD, generate a structured BD shaping document with:",
      "1. 시장 분석 요약",
      "2. 고객 페르소나 정의",
      "3. 가치 제안 캔버스",
      "4. 수익 모델 초안",
      "5. 리스크 평가",
      "Output in Korean, structured markdown format.",
    ].join(" ");

    let userPrompt = `PRD:\n${prdContent}`;
    if (feedback) {
      userPrompt += `\n\n이전 라운드 피드백 (개선 사항):\n${feedback}`;
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

    return { output: response.response ?? "" };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const doc = output as string;

    const systemPrompt = [
      "You are a BD document quality evaluator.",
      "Evaluate the BD shaping document against the rubric.",
      "Score 0.0~1.0. Respond in JSON: { qualityScore: number, feedback: string }",
    ].join(" ");

    const userPrompt = `Rubric:\n${rubric}\n\nDocument:\n${doc.slice(0, 8000)}`;

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

    const raw = response.response ?? "";
    let score = 0;
    let feedback = raw;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        score = Math.max(0, Math.min(1, Number(parsed.qualityScore) || 0));
        feedback = parsed.feedback || "";
      }
    } catch {
      score = 0.5;
      feedback = raw.slice(0, 500);
    }

    return { score, feedback, pass: score >= 0.85 };
  }

  getDefaultRubric(): string {
    return [
      "1. 시장 분석이 데이터 기반으로 구체적인가",
      "2. 고객 페르소나가 실제 타겟에 부합하는가",
      "3. 가치 제안이 경쟁 우위를 명확히 하는가",
      "4. 수익 모델이 실현 가능한가",
      "5. 리스크가 빠짐없이 식별되었는가",
    ].join("\n");
  }
}
