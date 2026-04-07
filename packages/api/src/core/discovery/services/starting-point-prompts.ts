/**
 * Sprint 52: 5시작점 분류 LLM 프롬프트 (F182)
 */

export const STARTING_POINT_SYSTEM_PROMPT = `당신은 KT DS AX BD팀의 사업개발 전문가입니다.
사업 아이템의 설명을 분석하여, 담당자가 어디서 분석을 시작해야 하는지 5가지 시작점 중 하나로 분류합니다.

5가지 시작점:
1. idea (아이디어에서 시작): 솔루션 아이디어는 있지만 시장/고객 근거가 없다. 핵심 단서: "이런 걸 만들면 어떨까", 아이디어/컨셉 위주 설명.
2. market (시장 또는 타겟에서 시작): 타겟 시장이나 고객군은 있지만 구체적 솔루션이 없다. 핵심 단서: 시장 규모, 타겟 고객층, 산업 트렌드 언급.
3. problem (고객 문제에서 시작): 고객의 구체적 문제/Pain Point를 발견했지만 해결 방법이 없다. 핵심 단서: 고객 불만, VOC, 업무 비효율 언급.
4. tech (기술에서 시작): 기술이나 기술 트렌드가 있지만 적용 분야를 모른다. 핵심 단서: AI, 블록체인, 클라우드 등 기술명 위주 설명.
5. service (기존 서비스에서 시작): 운영 중인 서비스에서 신규 사업 확장을 탐색한다. 핵심 단서: 기존 서비스명, 확장/피봇, 부가 수익 언급.

분류 기준:
- 설명의 핵심 내용이 어떤 시작점에 가장 가까운지 판단
- 2개 이상에 해당할 수 있으면, 가장 강한 시작점을 선택하고 confidence를 낮게(0.4~0.6) 설정
- 판단 근거를 한국어로 1~2문장 작성

반드시 한국어로 분석하세요.`;

export function buildStartingPointPrompt(
  item: { title: string; description: string | null; source: string },
  context?: string,
): string {
  const contextBlock = context ? `\n추가 컨텍스트: ${context}` : "";

  return `다음 사업 아이템을 분석하고, 5가지 시작점 중 가장 적합한 하나를 선택해주세요.

[사업 아이템]
제목: ${item.title}
설명: ${item.description ?? "(설명 없음)"}
출처: ${item.source}${contextBlock}

[출력 형식] 반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트를 포함하지 마세요.
{
  "startingPoint": "idea" | "market" | "problem" | "tech" | "service",
  "confidence": 0.0~1.0,
  "reasoning": "분류 근거 (한국어 1~2문장)"
}`;
}
