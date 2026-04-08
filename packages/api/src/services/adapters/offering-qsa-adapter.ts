// F462: Offering QSA Adapter (Sprint 226)
// Offering(HTML/PPTX) 품질/보안/디자인 판별 + 18섹션 구조 검증
// offering-qsa.md 에이전트 설계 → DomainAdapterInterface 구현

import type { DomainAdapterInterface } from "@foundry-x/shared";

/**
 * Offering 18섹션 구조 검증 결과
 */
export interface SectionCheckResult {
  p0Missing: string[];  // P0 필수 섹션 누락 목록
  p1Missing: string[];  // P1 권장 섹션 누락 목록
  presentCount: number; // 존재하는 섹션 수
}

/**
 * Offering QSA 5차원 Rubric 가중치
 * OQ-R1: 구조 완성도 (Structure)         0.25
 * OQ-R2: 콘텐츠 충실도 (Content)         0.25
 * OQ-R3: 디자인 품질 (Design)            0.20
 * OQ-R4: 브랜드 일관성 (Brand)           0.20
 * OQ-R5: 보안 (Security)                 0.10
 */
const OQ_RUBRIC_WEIGHTS: Record<string, number> = {
  "OQ-R1": 0.25,
  "OQ-R2": 0.25,
  "OQ-R3": 0.20,
  "OQ-R4": 0.20,
  "OQ-R5": 0.10,
};

// P0 필수 섹션 키워드 매핑
const P0_SECTIONS: Array<{ name: string; keywords: string[] }> = [
  { name: "Hero/표지", keywords: ["hero", "cover", "headline", "표지"] },
  { name: "문제 정의", keywords: ["problem", "문제", "현재", "as-is", "pain"] },
  { name: "솔루션", keywords: ["solution", "솔루션", "해결", "to-be"] },
  { name: "시장 기회", keywords: ["market", "tam", "sam", "som", "시장"] },
  { name: "비즈니스 모델", keywords: ["business model", "수익", "revenue", "비즈니스"] },
  { name: "경쟁 우위", keywords: ["competitive", "차별화", "moat", "경쟁", "우위"] },
  { name: "고객 페르소나", keywords: ["persona", "customer", "고객", "페르소나"] },
  { name: "검증 데이터", keywords: ["validation", "검증", "evidence", "파일럿", "pilot"] },
  { name: "팀/조직", keywords: ["team", "팀", "조직", "인력", "member"] },
  { name: "로드맵", keywords: ["roadmap", "로드맵", "timeline", "마일스톤", "milestone"] },
];

// P1 권장 섹션 키워드 매핑
const P1_SECTIONS: Array<{ name: string; keywords: string[] }> = [
  { name: "재무 계획", keywords: ["financial", "재무", "투자", "roi", "budget"] },
  { name: "GTM 전략", keywords: ["go-to-market", "gtm", "마케팅", "market entry"] },
  { name: "파트너십", keywords: ["partner", "파트너", "협력", "ecosystem"] },
  { name: "리스크", keywords: ["risk", "리스크", "위험", "assumption"] },
  { name: "성공 지표", keywords: ["kpi", "metric", "목표", "성공 지표", "success"] },
  { name: "CTA", keywords: ["cta", "연락처", "contact", "next step", "다음"] },
  { name: "Q&A", keywords: ["q&a", "질의", "faq", "질문"] },
  { name: "부록", keywords: ["appendix", "참고", "reference", "부록"] },
];

export class OfferingQsaAdapter implements DomainAdapterInterface {
  readonly domain = "offering-qsa";
  readonly displayName = "Offering QSA 판별";
  readonly description =
    "Offering HTML을 5차원(구조/콘텐츠/디자인/브랜드/보안) Rubric으로 판별합니다. " +
    "18섹션 구조 검증 + 브랜드 일관성 + 콘텐츠 어댑터 톤 적합성을 포함합니다.";

  constructor(private ai: Ai) {}

  /**
   * O-G-D Generator 역할 — 피드백 기반 Offering HTML 개선
   */
  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { offeringHtml, discoveryPackage } = input as {
      offeringHtml: string;
      discoveryPackage?: string;
    };

    const systemPrompt = [
      "You are a senior business proposal designer.",
      "Improve the Offering HTML to be a world-class business proposal.",
      "Ensure all 10 P0 sections are present and compelling.",
      "Use professional fonts, consistent brand colors, 8px grid spacing.",
      "Write in Korean at C-level decision maker language.",
      "Output only the improved HTML, no explanation.",
    ].join(" ");

    let userPrompt = `Offering HTML:\n${offeringHtml}`;
    if (discoveryPackage) {
      userPrompt += `\n\nDiscovery Package (참고):\n${discoveryPackage.slice(0, 2000)}`;
    }
    if (feedback) {
      userPrompt += `\n\nQSA 피드백 (반드시 반영):\n${feedback}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
      },
    ) as { response?: string };

    return { output: response.response ?? offeringHtml };
  }

  /**
   * O-G-D Discriminator 역할 — 5차원 Rubric 판별
   * 18섹션 구조 검증 결과를 LLM 프롬프트에 주입
   */
  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const html = output as string;

    // 18섹션 구조 검증 (정규식 기반)
    const sectionCheck = this.checkSections(html);
    const sectionSummary = [
      sectionCheck.p0Missing.length > 0
        ? `P0 필수 섹션 누락: ${sectionCheck.p0Missing.join(", ")}`
        : "P0 필수 섹션 전체 존재",
      sectionCheck.p1Missing.length > 0
        ? `P1 권장 섹션 누락: ${sectionCheck.p1Missing.join(", ")}`
        : "P1 권장 섹션 전체 존재",
    ].join("; ");

    const systemPrompt = [
      "You are an Offering QSA (Quality & Security Assurance) expert for business proposals.",
      "Evaluate the Offering HTML using the 5-dimension rubric and return JSON.",
      '{ "scores": { "OQ-R1": 0.0~1.0, "OQ-R2": 0.0~1.0, "OQ-R3": 0.0~1.0,',
      '"OQ-R4": 0.0~1.0, "OQ-R5": 0.0~1.0 },',
      '"missingSections": ["section names"],',
      '"securityFail": true/false, "feedback": "specific improvements in Korean" }',
      "OQ-R1(0.25): Structure — all 10 P0 sections must be present and substantive.",
      "OQ-R2(0.25): Content — industry-specific language, quantified market data, decision-maker level.",
      "OQ-R3(0.20): Design — professional fonts, brand color consistency, 8px grid, printable layout.",
      "OQ-R4(0.20): Brand — logo/brand consistency, approved color palette, consistent tone.",
      "OQ-R5(0.10): Security — no internal codenames, URLs, NDA data exposed.",
      "securityFail=true ONLY if confidential data is clearly exposed.",
    ].join(" ");

    const userPrompt = [
      `Rubric:\n${rubric}`,
      `\n18-Section Check:\n${sectionSummary}`,
      `\nOffering HTML (first 6000 chars):\n${html.slice(0, 6000)}`,
    ].join("\n");

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
      "OQ-R1 (구조 완성도, 가중치 0.25): Hero/문제정의/솔루션/시장기회/비즈니스모델/경쟁우위/고객페르소나/검증데이터/팀/로드맵 10개 P0 섹션 필수 존재.",
      "OQ-R2 (콘텐츠 충실도, 가중치 0.25): 산업별 톤 적합성, 시장 수치 구체성(출처 포함), Discovery 인사이트 반영, C-level 언어 수준.",
      "OQ-R3 (디자인 품질, 가중치 0.20): 전문 폰트(Arial/Inter 금지), 일관된 색상 팔레트, 8px 그리드, 인쇄/PT 레이아웃 최적화.",
      "OQ-R4 (브랜드 일관성, 가중치 0.20): 로고/브랜드 마크 일관 배치, KT 승인 색상 팔레트, 전체 콘텐츠 톤 일관성.",
      "OQ-R5 (보안, 가중치 0.10): 내부 코드명/URL/NDA 정보 미노출, 고객 개인정보 미포함, HTML 주석/meta에 내부 정보 없음.",
    ].join("\n");
  }

  /**
   * 18섹션 구조 검증 — 정규식 기반 (결정론적, LLM 불필요)
   */
  checkSections(html: string): SectionCheckResult {
    // HTML 주석 제거 후 검색 (주석 내 키워드 오감지 방지)
    const lowerHtml = html.replace(/<!--[\s\S]*?-->/g, "").toLowerCase();

    const p0Missing = P0_SECTIONS
      .filter(({ keywords }) => !keywords.some((kw) => lowerHtml.includes(kw.toLowerCase())))
      .map(({ name }) => name);

    const p1Missing = P1_SECTIONS
      .filter(({ keywords }) => !keywords.some((kw) => lowerHtml.includes(kw.toLowerCase())))
      .map(({ name }) => name);

    const presentCount =
      (P0_SECTIONS.length - p0Missing.length) +
      (P1_SECTIONS.length - p1Missing.length);

    return { p0Missing, p1Missing, presentCount };
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
          securityFail?: boolean;
          feedback?: string;
        };

        if (parsed.scores) {
          // 보안 실패 즉시 반환
          if (parsed.securityFail) {
            return {
              score: 0,
              feedback: `[SECURITY_FAIL] ${parsed.feedback ?? "기밀 정보 노출 감지 — 즉시 수정 필요"}`,
              pass: false,
            };
          }

          const weightedScore = Object.entries(OQ_RUBRIC_WEIGHTS).reduce(
            (sum, [dim, weight]) => {
              const dimScore = Math.max(0, Math.min(1, Number(parsed.scores?.[dim]) || 0));
              return sum + dimScore * weight;
            },
            0,
          );

          const score = Math.round(weightedScore * 100) / 100;
          // Offering은 0.80 threshold (Prototype의 0.85보다 낮음 — 내용 중심)
          return {
            score,
            feedback: parsed.feedback ?? "",
            pass: score >= 0.80,
          };
        }
      }
    } catch {
      // fallback
    }

    return { score: 0.5, feedback: raw.slice(0, 500), pass: false };
  }
}
