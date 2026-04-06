/**
 * F373: Offering Validate O-G-D Adapter (Sprint 168)
 * DomainAdapterInterface 구현 — 사업기획서 교차검증
 */
import type { DomainAdapterInterface } from "@foundry-x/shared";

const VALIDATION_RUBRIC = `사업기획서 교차검증 루브릭 (7개 표준 질문):
1. 시장 기회의 규모와 성장성이 충분한가? (TAM/SAM/SOM)
2. 고객 페인포인트와 솔루션의 핏이 명확한가? (Problem-Solution Fit)
3. 기술적 실현 가능성이 검증되었는가? (PoC/MVP 근거)
4. 경쟁 우위와 해자(Moat)가 존재하는가? (차별화 요소)
5. 수익 모델과 사업성 수치가 현실적인가? (Revenue Model)
6. 추진 체계와 투자 계획이 구체적인가? (Execution Plan)
7. KT 연계 시너지가 명확한가? (GTM 전략)

평가 기준:
- 0.0~0.4: 근거 부족 또는 논리 비약
- 0.5~0.7: 기본 근거 존재, 보강 필요
- 0.8~1.0: 충분한 근거와 논리적 일관성`;

export class OfferingValidateOgdAdapter implements DomainAdapterInterface {
  readonly domain = "offering-validate";
  readonly displayName = "Offering 교차검증";
  readonly description = "사업기획서 섹션 내용의 논리적 정합성과 완성도를 평가합니다.";

  constructor(private ai: Ai) {}

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { sections } = input as { sections: Array<{ title: string; content: string }> };

    const systemPrompt = [
      "You are a business plan reviewer and improver.",
      "Analyze the provided business proposal sections and generate specific improvement suggestions.",
      "For each section, identify:",
      "1. Missing data or weak arguments",
      "2. Logical inconsistencies",
      "3. Concrete improvement recommendations",
      "Output in Korean, structured JSON format with sectionKey and suggestions array.",
    ].join(" ");

    let userPrompt = `사업기획서 섹션:\n${JSON.stringify(sections, null, 2)}`;
    if (feedback) {
      userPrompt += `\n\n이전 라운드 피드백:\n${feedback}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    }) as { response?: string };

    return { output: response.response ?? "" };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const suggestions = output as string;

    const systemPrompt = [
      "You are a strict business plan quality evaluator.",
      "Score the business proposal quality from 0.0 to 1.0 based on the rubric.",
      `Rubric:\n${rubric}`,
      "Output JSON: { \"score\": number, \"feedback\": \"string\", \"details\": [{\"question\": \"string\", \"score\": number, \"comment\": \"string\"}] }",
    ].join(" ");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `개선 제안:\n${suggestions}` },
      ],
      max_tokens: 2048,
    }) as { response?: string };

    try {
      const parsed = JSON.parse(response.response ?? "{}");
      const score = typeof parsed.score === "number" ? parsed.score : 0;
      return {
        score,
        feedback: parsed.feedback ?? "",
        pass: score >= 0.85,
      };
    } catch {
      return { score: 0, feedback: "Failed to parse evaluation response", pass: false };
    }
  }

  getDefaultRubric(): string {
    return VALIDATION_RUBRIC;
  }
}
