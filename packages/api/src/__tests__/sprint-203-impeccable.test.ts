/**
 * F423: impeccable 디자인 스킬 통합 (Sprint 203)
 * F424: 디자인 안티패턴 차단 (Sprint 203)
 */
import { describe, it, expect, vi } from "vitest";
import { getImpeccableReference, IMPECCABLE_DOMAINS } from "../data/impeccable-reference.js";
import { OgdDiscriminatorService } from "../core/harness/services/ogd-discriminator-service.js";
import { OgdGeneratorService } from "../core/harness/services/ogd-generator-service.js";
import { PrototypeOgdAdapter } from "../services/adapters/prototype-ogd-adapter.js";

// Workers AI mock
function createMockAi(responseText = '{"qualityScore":0.8,"feedback":"Good","items":[]}') {
  return {
    run: vi.fn().mockResolvedValue({ response: responseText }),
  } as unknown as Ai;
}

// ─── F423: impeccable 참조문서 번들 ───

describe("F423: getImpeccableReference()", () => {
  it("7개 도메인 키워드를 모두 포함한다", () => {
    const ref = getImpeccableReference();
    // 각 도메인의 헤더
    expect(ref).toContain("## Typography");
    expect(ref).toContain("## Color & Contrast");
    expect(ref).toContain("## Spatial Design");
    expect(ref).toContain("## Motion Design");
    expect(ref).toContain("## Interaction Design");
    expect(ref).toContain("## Responsive Design");
    expect(ref).toContain("## UX Writing");
  });

  it("도메인 사이를 구분자(---)로 분리한다", () => {
    const ref = getImpeccableReference();
    expect(ref).toContain("---");
  });

  it("토큰 추정치가 10,000 미만이다 (30K 한도 여유)", () => {
    const ref = getImpeccableReference();
    const estimatedTokens = Math.ceil(ref.length / 4);
    expect(estimatedTokens).toBeLessThan(10000);
  });

  it("IMPECCABLE_DOMAINS에 7개 키가 존재한다", () => {
    const keys = Object.keys(IMPECCABLE_DOMAINS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain("typography");
    expect(keys).toContain("colorContrast");
    expect(keys).toContain("spatialDesign");
    expect(keys).toContain("motionDesign");
    expect(keys).toContain("interactionDesign");
    expect(keys).toContain("responsiveDesign");
    expect(keys).toContain("uxWriting");
  });

  it("과용 폰트 회피 지침이 포함된다", () => {
    const ref = getImpeccableReference();
    expect(ref).toContain("Arial");
    expect(ref).toContain("Inter");
    // 전문 폰트 대안도 포함
    expect(ref).toContain("Google Fonts");
  });

  it("순수 흑색 회피 지침이 포함된다", () => {
    const ref = getImpeccableReference();
    expect(ref).toContain("#000000");
    expect(ref).toContain("tinted neutral");
  });
});

// ─── F423: OgdGeneratorService 시스템 프롬프트 ───

describe("F423: OgdGeneratorService — 시스템 프롬프트 확장", () => {
  it("generate()가 호출될 때 DESIGN QUALITY GUIDELINES가 시스템 프롬프트에 포함된다", async () => {
    const mockAi = createMockAi("<html><body>test</body></html>");
    const service = new OgdGeneratorService(mockAi);

    await service.generate("PRD: AI 일정 관리 앱");

    expect(mockAi.run).toHaveBeenCalledOnce();
    const mockFn = mockAi.run as ReturnType<typeof vi.fn>;
    const callArgs = mockFn.mock.calls[0] as [string, { messages: Array<{ role: string; content: string }> }];
    const messages = callArgs[1].messages;
    const systemMsg = messages.find((m) => m.role === "system");

    expect(systemMsg?.content).toContain("DESIGN QUALITY GUIDELINES");
    expect(systemMsg?.content).toContain("Typography");
    expect(systemMsg?.content).toContain("Color & Contrast");
  });

  it("이전 피드백이 있을 때 userPrompt에 포함된다", async () => {
    const mockAi = createMockAi("<html></html>");
    const service = new OgdGeneratorService(mockAi);

    await service.generate("PRD 내용", "이전 피드백: 폰트를 개선하세요");

    const mockFn = mockAi.run as ReturnType<typeof vi.fn>;
    const callArgs = mockFn.mock.calls[0] as [string, { messages: Array<{ role: string; content: string }> }];
    const messages = callArgs[1].messages;
    const userMsg = messages.find((m) => m.role === "user");

    expect(userMsg?.content).toContain("이전 피드백: 폰트를 개선하세요");
  });
});

// ─── F424: OgdDiscriminatorService 안티패턴 체크리스트 ───

describe("F424: OgdDiscriminatorService.extractChecklist() — 안티패턴 차단", () => {
  it("기본 체크리스트에 안티패턴 항목 8개가 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("일반 PRD");

    // 안티패턴 관련 항목 필터
    const antiPatternItems = checklist.filter(
      (item) =>
        item.includes("Arial") ||
        item.includes("흑색") ||
        item.includes("회색") ||
        item.includes("대비") ||
        item.includes("카드") ||
        item.includes("타이포그래피") ||
        item.includes("미디어 쿼리") ||
        item.includes("여백"),
    );

    expect(antiPatternItems).toHaveLength(8);
  });

  it("PRD 내용 없이도 안티패턴 13개(5+8) 체크가 적용된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("");
    expect(checklist.length).toBeGreaterThanOrEqual(13);
  });

  it("과용 폰트 차단 항목이 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("PRD");
    expect(checklist.some((item) => item.includes("Arial") && item.includes("Inter"))).toBe(true);
  });

  it("순수 흑색 차단 항목이 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("PRD");
    expect(checklist.some((item) => item.includes("#000000"))).toBe(true);
  });

  it("순수 회색 차단 항목이 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("PRD");
    expect(checklist.some((item) => item.includes("#808080"))).toBe(true);
  });

  it("카드 중첩 차단 항목이 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("PRD");
    expect(checklist.some((item) => item.includes("카드"))).toBe(true);
  });

  it("미디어 쿼리 항목이 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("PRD");
    expect(checklist.some((item) => item.includes("미디어 쿼리"))).toBe(true);
  });

  it("기존 PRD 키워드 조건부 체크도 여전히 작동한다", () => {
    const discriminator = new OgdDiscriminatorService(createMockAi());
    const checklist = discriminator.extractChecklist("dashboard 데이터 시각화가 필요한 PRD");
    expect(checklist.some((item) => item.includes("데이터 시각화"))).toBe(true);
  });
});

// ─── F424: PrototypeOgdAdapter getDefaultRubric() ───

describe("F424: PrototypeOgdAdapter.getDefaultRubric() — 안티패턴 포함", () => {
  it("getDefaultRubric()에 안티패턴 항목이 포함된다", () => {
    const adapter = new PrototypeOgdAdapter(createMockAi());
    const rubric = adapter.getDefaultRubric();

    expect(rubric).toContain("Arial");
    expect(rubric).toContain("흑색");
    expect(rubric).toContain("미디어 쿼리");
    expect(rubric).toContain("카드");
  });

  it("getDefaultRubric()이 13개(5+8) 항목을 반환한다", () => {
    const adapter = new PrototypeOgdAdapter(createMockAi());
    const rubric = adapter.getDefaultRubric();
    const lines = rubric.split("\n").filter((l) => l.trim());
    expect(lines).toHaveLength(13);
  });
});
