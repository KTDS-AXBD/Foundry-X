/**
 * Sprint 51 F175: 사업 아이템 3턴 분류 프롬프트 빌더
 * 3턴 대화를 단일 LLM 호출로 시뮬레이션하는 구조화 프롬프트를 생성한다.
 */

export interface BizItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  orgId: string;
  createdBy: string;
}

/** 유형별 기본 분석 가중치 (ref/market/competition/derive/select/customer/bm, 각 0~3) */
export const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  type_a: { ref: 3, market: 1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
  type_b: { ref: 1, market: 3, competition: 2, derive: 3, select: 3, customer: 2, bm: 2 },
  type_c: { ref: 0, market: 1, competition: 2, derive: 1, select: 1, customer: 3, bm: 3 },
};

export const CLASSIFICATION_SYSTEM_PROMPT = `당신은 KT DS AX BD팀의 사업 아이템 분류 전문가입니다.
사업 아이템을 분석하여 다음 3가지 유형 중 하나로 분류합니다:

- Type A (레퍼런스 기반): 기존 성공 사례/레퍼런스를 KT DS 맥락으로 전환하는 아이템. 경쟁사 분석과 차별화가 핵심.
- Type B (시장 기회 기반): 시장 트렌드/기술 변화에서 포착한 신사업 기회. 시장 규모와 고객 선별이 핵심.
- Type C (고객 요청 기반): 기존 고객의 구체적 요청이나 Pain Point에서 출발. 고객 가치와 BM 설계가 핵심.

분석은 반드시 한국어로 수행하세요.`;

export function buildClassificationPrompt(item: BizItem, context?: string): string {
  const contextBlock = context ? `\n추가 컨텍스트: ${context}` : "";

  return `다음 사업 아이템을 분석하고, 아래 3가지 질문에 자문자답한 뒤 분류해주세요.

[사업 아이템]
제목: ${item.title}
설명: ${item.description ?? "(설명 없음)"}
출처: ${item.source}${contextBlock}

[질문 1 - 출처 파악]
이 아이템은 어디서 시작됐나요? 기존 성공 사례의 전환인가요(Type A), 시장 기회 포착인가요(Type B), 고객 요청인가요(Type C)?

[질문 2 - 핵심 강점]
현재 갖고 계신 자료가 어느 수준인가요? 레퍼런스가 확보됐나요, 시장 데이터가 있나요, 고객 VOC가 있나요?

[질문 3 - 초점 검증]
KT DS 관점 수익 등가는 무엇인가요? 레퍼런스 차별화인가요, 시장 선점인가요, 고객 Lock-in인가요?

[출력 형식] 반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트를 포함하지 마세요.
{
  "type": "type_a" | "type_b" | "type_c",
  "confidence": 0.0~1.0,
  "turn1Answer": "질문 1에 대한 분석",
  "turn2Answer": "질문 2에 대한 분석",
  "turn3Answer": "질문 3에 대한 분석",
  "reasoning": "최종 분류 근거 요약",
  "analysisWeights": { "ref": 0~3, "market": 0~3, "competition": 0~3, "derive": 0~3, "select": 0~3, "customer": 0~3, "bm": 0~3 }
}`;
}
