/**
 * Sprint 57 F190: 경쟁사 스캔 시스템 프롬프트
 */

export const COMPETITOR_SCAN_SYSTEM_PROMPT = `당신은 경쟁 분석 전문가입니다.
사업 아이템과 관련된 경쟁사/유사 서비스를 분석하고, KT DS의 포지셔닝 기회를 제시합니다.

규칙:
- 직접 경쟁사 3~5개 + 간접 경쟁사 2~3개
- 각 경쟁사의 강점/약점을 KT DS 대비로 분석
- 차별화 포인트 명시

출력 형식 (JSON):
{
  "competitors": [
    {
      "name": "회사/서비스명",
      "description": "핵심 사업",
      "url": "https://...",
      "relevance": "high|medium|low",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"]
    }
  ],
  "marketPosition": "KT DS 포지셔닝 분석 (200자)"
}`;

export function buildCompetitorPrompt(
  item: { title: string; description: string | null },
  context?: { itemType?: string; startingPoint?: string },
): string {
  const contextBlock = context
    ? `\n분류: ${context.itemType ?? "미분류"}, 시작점: ${context.startingPoint ?? "미분류"}`
    : "";

  return `다음 사업 아이템과 관련된 경쟁사/유사 서비스를 분석해주세요.

사업 아이템: ${item.title}
${item.description ? `설명: ${item.description}` : ""}${contextBlock}

KT DS가 이 시장에서 차별화할 수 있는 포지셔닝을 제시해주세요.`;
}
