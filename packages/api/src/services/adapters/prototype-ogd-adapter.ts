// F360: Prototype O-G-D Adapter (Sprint 163)
// 기존 OgdGeneratorService + OgdDiscriminatorService를 DomainAdapter로 래핑

import type { DomainAdapterInterface } from "@foundry-x/shared";
import { OgdGeneratorService } from "../../core/harness/services/ogd-generator-service.js";
import { OgdDiscriminatorService } from "../../core/harness/services/ogd-discriminator-service.js";
import { getDiscriminatorChecklist } from "../../data/impeccable-reference.js";

/**
 * Prototype 어댑터 — PRD → HTML 프로토타입 생성 → 체크리스트 기반 평가
 * 기존 F355의 Generator/Discriminator를 그대로 래핑
 */
export class PrototypeOgdAdapter implements DomainAdapterInterface {
  readonly domain = "prototype";
  readonly displayName = "Prototype 생성";
  readonly description = "PRD를 기반으로 HTML 프로토타입을 생성하고 체크리스트로 평가합니다.";

  private generator: OgdGeneratorService;
  private discriminator: OgdDiscriminatorService;
  private cachedChecklist: string[] | null = null;

  constructor(ai: Ai) {
    this.generator = new OgdGeneratorService(ai);
    this.discriminator = new OgdDiscriminatorService(ai);
  }

  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { prdContent } = input as { prdContent: string };

    // 첫 generate에서 체크리스트 캐시
    if (!this.cachedChecklist) {
      this.cachedChecklist = this.discriminator.extractChecklist(prdContent);
    }

    const result = await this.generator.generate(prdContent, feedback);
    return { output: result.html };
  }

  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const html = output as string;

    // rubric이 커스텀이면 그걸 체크리스트로, 아니면 캐시된 걸 사용
    const checklist =
      rubric !== this.getDefaultRubric()
        ? rubric.split("\n").filter((l) => l.trim())
        : this.cachedChecklist ?? ["전체 품질 평가"];

    const result = await this.discriminator.evaluate(html, checklist);
    return {
      score: result.qualityScore,
      feedback: result.feedback,
      pass: result.passed,
    };
  }

  getDefaultRubric(): string {
    // F464: impeccable 7도메인에서 체크리스트 자동 도출 (Sprint 230)
    // 핵심 구조 체크 5개 + impeccable 7도메인 도출 항목
    const structureChecks = [
      "페이지에 명확한 제목(h1)이 존재한다",
      "주요 기능 섹션이 2개 이상 존재한다",
      "CTA(Call-to-Action) 버튼이 존재한다",
      "반응형 레이아웃이 적용되어 있다",
      "시각적 계층 구조가 명확하다",
    ];
    return [...structureChecks, ...getDiscriminatorChecklist()].join("\n");
  }
}
