// F461: Prototype QSA Adapter (Sprint 226)
// prototype-qsa.md 에이전트 설계 → DomainAdapterInterface 코드 연동
// 5차원 Rubric + CSS 정적 분석 + First Principles Gate

import type { DomainAdapterInterface } from "@foundry-x/shared";

/**
 * CSS 정적 분석 결과
 */
export interface CssAnalysisResult {
  aiDefaultFonts: string[];   // 검출된 AI 기본 폰트 (Arial, Inter 등)
  pureColors: string[];       // 검출된 순수 흑/백/회색
  nonGridSpacing: string[];   // 4/8px 비배수 spacing 값
  hasNestedCards: boolean;    // .card > .card 패턴 여부
  hasMediaQueries: boolean;   // @media 쿼리 존재 여부
}

/**
 * Prototype QSA 5차원 Rubric 가중치
 * QSA-R1: 보안 & 기밀 보호 (Security)       0.25
 * QSA-R2: Pitch Deck 품질 (Content Fidelity) 0.25
 * QSA-R3: 디자인 품질 (Design Excellence)    0.25
 * QSA-R4: 구조 & 내러티브 (Structure)        0.15
 * QSA-R5: 기술 건전성 (Technical Soundness)  0.10
 */
const QSA_RUBRIC_WEIGHTS: Record<string, number> = {
  "QSA-R1": 0.25,
  "QSA-R2": 0.25,
  "QSA-R3": 0.25,
  "QSA-R4": 0.15,
  "QSA-R5": 0.10,
};

// CSS 정적 분석용 패턴
const AI_DEFAULT_FONTS = ["Arial", "Inter", "system-ui", "Helvetica"];
const PURE_COLORS = ["#000000", "#ffffff", "#808080", "#999999", "#aaaaaa", "#cccccc", "#000", "#fff"];
const NON_GRID_SPACING_RE = /(?:margin|padding)[^:]*:\s*[^;]*?(\d+)px/gi;
const NESTED_CARD_RE = /\.card[^{]*[\s>+~]+\.card/i;
const MEDIA_QUERY_RE = /@media\s/i;

export class PrototypeQsaAdapter implements DomainAdapterInterface {
  readonly domain = "prototype-qsa";
  readonly displayName = "Prototype QSA 판별";
  readonly description =
    "Prototype HTML을 5차원(보안/콘텐츠/디자인/구조/기술) Rubric으로 판별합니다. " +
    "First Principles Gate + CSS 정적 분석을 포함하며, 기밀 노출 시 즉시 SECURITY_FAIL을 반환합니다.";

  constructor(private ai: Ai) {}

  /**
   * O-G-D Generator 역할 — 피드백 기반 Prototype HTML 개선
   */
  async generate(
    input: unknown,
    feedback?: string,
  ): Promise<{ output: unknown }> {
    const { htmlContent, prdContent } = input as {
      htmlContent: string;
      prdContent?: string;
    };

    const systemPrompt = [
      "You are a senior UX designer and frontend developer.",
      "Improve the given Prototype HTML to be pitch-deck quality.",
      "Use professional fonts (not Arial/Inter/system-ui), tinted neutral colors (not pure black/white),",
      "8px grid spacing, and ensure responsive layout with media queries.",
      "Output only the improved HTML, no explanation.",
    ].join(" ");

    let userPrompt = `Prototype HTML:\n${htmlContent}`;
    if (prdContent) {
      userPrompt += `\n\nPRD 컨텍스트 (참고):\n${prdContent.slice(0, 2000)}`;
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

    return { output: response.response ?? htmlContent };
  }

  /**
   * O-G-D Discriminator 역할 — 5차원 Rubric 판별
   * CSS 정적 분석 결과를 LLM 프롬프트에 주입하여 판별 정확도 향상
   */
  async discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }> {
    const html = output as string;

    // CSS 정적 분석 (LLM 없이 정규식 기반)
    const cssAnalysis = this.analyzeCss(html);
    const cssAnalysisSummary = [
      cssAnalysis.aiDefaultFonts.length > 0
        ? `AI 기본 폰트 검출: ${cssAnalysis.aiDefaultFonts.join(", ")}`
        : null,
      cssAnalysis.pureColors.length > 0
        ? `순수 흑/백/회색 검출: ${cssAnalysis.pureColors.join(", ")}`
        : null,
      cssAnalysis.hasNestedCards ? "중첩 카드 패턴 감지" : null,
      !cssAnalysis.hasMediaQueries ? "반응형(@media) 쿼리 없음" : null,
    ]
      .filter(Boolean)
      .join("; ") || "CSS 안티패턴 없음";

    const systemPrompt = [
      "You are a Prototype QSA (Quality & Security Assurance) expert.",
      "Evaluate the Prototype HTML using the 5-dimension rubric and return JSON.",
      '{ "scores": { "QSA-R1": 0.0~1.0, "QSA-R2": 0.0~1.0, "QSA-R3": 0.0~1.0,',
      '"QSA-R4": 0.0~1.0, "QSA-R5": 0.0~1.0 },',
      '"securityFail": true/false, "feedback": "specific improvements in Korean" }',
      "QSA-R1(0.25): Security — no internal codenames, URLs, NDA data, confidential info in HTML source.",
      "QSA-R2(0.25): Content Fidelity — Problem Statement clear, 5-sec test, CTA present, decision-maker language.",
      "QSA-R3(0.25): Design Excellence — professional fonts, tinted colors, 8px grid, no nested cards, responsive.",
      "QSA-R4(0.15): Structure/Narrative — Hero→Problem→Solution→Market→Validation→CTA logical flow.",
      "QSA-R5(0.10): Technical Soundness — valid HTML, self-contained CSS, viewport meta.",
      "securityFail=true ONLY if internal confidential data is clearly exposed.",
    ].join(" ");

    const userPrompt = [
      `Rubric:\n${rubric}`,
      `\nCSS Static Analysis:\n${cssAnalysisSummary}`,
      `\nPrototype HTML (first 6000 chars):\n${html.slice(0, 6000)}`,
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
      "QSA-R1 (보안 & 기밀 보호, 가중치 0.25): 내부 코드명/URL/NDA 정보가 HTML 소스코드(주석, meta, hidden 필드 포함)에 없어야 한다.",
      "QSA-R2 (Pitch Deck 품질, 가중치 0.25): PRD 핵심 문제 정의 반영, 5초 테스트 통과, CTA 명확, 경영진 수준 언어 사용.",
      "QSA-R3 (디자인 품질, 가중치 0.25): 전문 폰트 사용(Arial/Inter 금지), tinted neutral 색상, 8px 그리드, 반응형 레이아웃, 카드 중첩 금지.",
      "QSA-R4 (구조 & 내러티브, 가중치 0.15): Hero→문제→솔루션→시장→검증→CTA 순서의 논리적 스토리라인.",
      "QSA-R5 (기술 건전성, 가중치 0.10): 유효한 HTML, 인라인 완결 CSS(외부 의존성 없음), viewport meta 설정.",
    ].join("\n");
  }

  /**
   * CSS 정적 분석 — 정규식 기반 (결정론적, LLM 불필요)
   */
  analyzeCss(html: string): CssAnalysisResult {
    const detected: CssAnalysisResult = {
      aiDefaultFonts: [],
      pureColors: [],
      nonGridSpacing: [],
      hasNestedCards: false,
      hasMediaQueries: false,
    };

    // AI 기본 폰트 검출
    for (const font of AI_DEFAULT_FONTS) {
      if (html.includes(font)) {
        detected.aiDefaultFonts.push(font);
      }
    }

    // 순수 흑/백/회색 검출
    for (const color of PURE_COLORS) {
      if (html.toLowerCase().includes(color)) {
        detected.pureColors.push(color);
      }
    }

    // 4/8px 비배수 spacing 검출
    const spacingMatches = html.matchAll(NON_GRID_SPACING_RE);
    for (const match of spacingMatches) {
      const px = parseInt(match[1], 10);
      if (px > 0 && px % 4 !== 0) {
        detected.nonGridSpacing.push(`${px}px`);
      }
    }

    // 중첩 카드 패턴
    detected.hasNestedCards = NESTED_CARD_RE.test(html);

    // 반응형 쿼리 여부
    detected.hasMediaQueries = MEDIA_QUERY_RE.test(html);

    return detected;
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

          const weightedScore = Object.entries(QSA_RUBRIC_WEIGHTS).reduce(
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
            pass: score >= 0.85,
          };
        }
      }
    } catch {
      // fallback
    }

    return { score: 0.5, feedback: raw.slice(0, 500), pass: false };
  }
}
