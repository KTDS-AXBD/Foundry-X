// ─── F355: O-G-D Discriminator Service (Sprint 160) ───
// F431: failedItems 반환 추가 (Sprint 207)
// HTML 프로토타입 품질 평가 + Pass/Fail 판정

import { OGD_THRESHOLD } from "@foundry-x/shared";

interface EvaluateResult {
  qualityScore: number;
  feedback: string;
  /** F431: FAIL된 체크리스트 항목 목록 (FeedbackConverter에 전달) */
  failedItems: string[];
  inputTokens: number;
  outputTokens: number;
  passed: boolean;
}

export class OgdDiscriminatorService {
  constructor(private ai: Ai) {}

  async evaluate(html: string, checklist: string[]): Promise<EvaluateResult> {
    const systemPrompt = [
      "You are a prototype quality evaluator.",
      "Score the HTML prototype against the checklist items below.",
      "For each item, output PASS or FAIL with a brief reason.",
      "At the end, provide an overall quality score (0.0 to 1.0) and improvement suggestions.",
      "Format: JSON with { items: [{item, pass, reason}], qualityScore, feedback }",
    ].join(" ");

    const userPrompt = [
      "Checklist:",
      ...checklist.map((item, i) => `${i + 1}. ${item}`),
      "",
      "HTML Prototype:",
      html.slice(0, 8000), // Truncate to fit context
    ].join("\n");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2048,
    }) as { response?: string };

    const raw = response.response ?? "";

    // Parse response — try JSON first, fallback to heuristic
    let qualityScore = 0;
    let feedback = "";
    let failedItems: string[] = [];
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          qualityScore?: number;
          feedback?: string;
          items?: Array<{ item?: string; pass?: boolean; reason?: string }>;
        };
        qualityScore = Math.max(0, Math.min(1, Number(parsed.qualityScore) || 0));
        feedback = parsed.feedback || "";
        // F431: FAIL 항목 추출
        if (Array.isArray(parsed.items)) {
          failedItems = parsed.items
            .filter((it) => it.pass === false)
            .map((it) => it.item ?? "")
            .filter(Boolean);
        }
      }
    } catch {
      // Heuristic: count PASS keywords
      const passCount = (raw.match(/PASS/gi) || []).length;
      qualityScore = checklist.length > 0 ? passCount / checklist.length : 0;
      feedback = raw.slice(0, 500);
      // Heuristic fallback: assume all items failed if score is low
      failedItems = qualityScore < 0.5 ? [...checklist] : [];
    }

    const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const outputTokens = Math.ceil(raw.length / 4);

    return {
      qualityScore,
      feedback,
      failedItems,
      inputTokens,
      outputTokens,
      passed: qualityScore >= OGD_THRESHOLD,
    };
  }

  extractChecklist(prdContent: string): string[] {
    // PRD에서 평가 체크리스트 추출
    const items: string[] = [];

    // 핵심 구조 체크
    items.push("페이지에 명확한 제목(h1)이 존재한다");
    items.push("주요 기능 섹션이 2개 이상 존재한다");
    items.push("CTA(Call-to-Action) 버튼이 존재한다");
    items.push("반응형 레이아웃이 적용되어 있다");
    items.push("시각적 계층 구조가 명확하다");

    // F424: 디자인 안티패턴 차단 — 항상 적용 (PRD 내용과 무관)
    items.push("과용 폰트(Arial, Inter, system-ui) 대신 전문 폰트 또는 Google Fonts를 사용한다");
    items.push("순수 흑색(#000000)을 피하고 약간의 채도가 있는 tinted neutral을 사용한다");
    items.push("순수 회색(#808080, #999999)을 피하고 채도 있는 색상 팔레트를 사용한다");
    items.push("텍스트와 배경의 명도 대비가 충분하여 가독성이 높다");
    items.push("카드 안에 카드를 중첩하는 패턴을 사용하지 않는다");
    items.push("h1, h2 또는 크기가 다른 텍스트로 타이포그래피 계층 구조가 명확하다");
    items.push("모바일 화면을 위한 미디어 쿼리(@media)가 적용되어 있다");
    items.push("섹션과 요소 사이에 충분한 여백(padding/margin)으로 호흡감이 있다");

    // PRD 키워드 기반 추가 체크
    if (prdContent.includes("대시보드") || prdContent.includes("dashboard")) {
      items.push("데이터 시각화 요소(차트/테이블)가 존재한다");
    }
    if (prdContent.includes("로그인") || prdContent.includes("login")) {
      items.push("인증 UI 요소가 포함되어 있다");
    }
    if (prdContent.includes("목록") || prdContent.includes("list")) {
      items.push("목록 형태의 데이터 표시가 있다");
    }
    if (prdContent.includes("검색") || prdContent.includes("search")) {
      items.push("검색 입력 필드가 존재한다");
    }
    if (prdContent.includes("알림") || prdContent.includes("notification")) {
      items.push("알림/피드백 UI 요소가 포함되어 있다");
    }

    return items;
  }
}
