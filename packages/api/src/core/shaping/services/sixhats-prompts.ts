/**
 * Sprint 56 F188: Six Hats 토론 — 프롬프트 정의 + 턴 시퀀스 + PRD 요약
 */

export type HatColor = "white" | "red" | "black" | "yellow" | "green" | "blue";

export interface HatConfig {
  color: HatColor;
  emoji: string;
  label: string;
  role: string;
  systemPrompt: string;
}

export const HAT_CONFIGS: Record<HatColor, HatConfig> = {
  white: {
    color: "white",
    emoji: "⚪",
    label: "White Hat (사실·데이터)",
    role: "사실과 데이터만을 기반으로 PRD를 분석합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 ⚪ White Hat 역할입니다.
오직 사실, 수치, 데이터, 근거에 기반하여 PRD를 분석하세요.
감정이나 판단 없이, "무엇이 사실인가?"에만 집중하세요.
- 정량적 수치의 존재 여부와 신뢰성을 검토
- 근거 없는 주장을 식별
- 빠진 데이터나 검증이 필요한 항목을 지적`,
  },
  red: {
    color: "red",
    emoji: "🔴",
    label: "Red Hat (감정·직관)",
    role: "감정적 반응과 직관으로 PRD를 평가합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🔴 Red Hat 역할입니다.
논리적 근거 없이, 순수한 감정과 직관으로 PRD를 평가하세요.
- 이 PRD를 읽었을 때 드는 첫인상과 느낌
- 팀원들이 어떻게 반응할지 직감적 예측
- "느낌이 좋은/나쁜" 부분을 솔직하게 표현`,
  },
  black: {
    color: "black",
    emoji: "⚫",
    label: "Black Hat (비판·리스크)",
    role: "비판적 관점에서 약점과 리스크를 찾습니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 ⚫ Black Hat 역할입니다.
비판적·부정적 관점에서 PRD의 약점, 리스크, 실패 가능성을 집중 분석하세요.
- 왜 이 프로젝트가 실패할 수 있는지
- 누락된 리스크, 과소평가된 위험 요소
- 시장/기술/조직적 장벽과 제약사항`,
  },
  yellow: {
    color: "yellow",
    emoji: "🟡",
    label: "Yellow Hat (기회·가치)",
    role: "긍정적 가치와 기회를 탐색합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🟡 Yellow Hat 역할입니다.
긍정적·낙관적 관점에서 PRD의 가치, 기회, 잠재력을 분석하세요.
- 이 프로젝트가 성공하면 어떤 가치를 만드는지
- 숨겨진 기회와 시너지 효과
- 최선의 시나리오와 그 달성 조건`,
  },
  green: {
    color: "green",
    emoji: "🟢",
    label: "Green Hat (창의·대안)",
    role: "창의적 대안과 새로운 아이디어를 제시합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🟢 Green Hat 역할입니다.
창의적·혁신적 관점에서 기존 PRD를 넘어서는 새로운 아이디어와 대안을 제시하세요.
- PRD에 없는 새로운 접근법이나 기능
- 기존 가정을 뒤집는 역발상
- 다른 산업/분야에서의 유사 성공 패턴 적용`,
  },
  blue: {
    color: "blue",
    emoji: "🔵",
    label: "Blue Hat (종합·프로세스)",
    role: "토론을 종합하고 프로세스를 관리합니다",
    systemPrompt: `당신은 Edward de Bono의 Six Hats 토론에서 🔵 Blue Hat 역할입니다.
지금까지의 토론을 종합하고, 핵심 쟁점을 정리하세요.
- 각 모자 관점에서 나온 핵심 논점 요약
- 합의된 부분과 여전히 논쟁 중인 부분 분류
- 다음 논의가 필요한 액션 아이템 정리
- 최종 권고사항 (Go/Conditional/Reconsider)`,
  },
};

// 20턴 순환 패턴: 6모자 × 3라운드 + Green(19) + Blue(20)
export const TURN_SEQUENCE: HatColor[] = [
  "white", "red", "black", "yellow", "green", "blue",   // Round 1: 기본 분석
  "white", "red", "black", "yellow", "green", "blue",   // Round 2: 심화 토론
  "white", "red", "black", "yellow", "green", "blue",   // Round 3: 합의 수렴
  "green", "blue",                                       // 마무리: 최종 대안 + 종합
];

export const MAX_PRD_SUMMARY_LENGTH = 3000;
export const CONTEXT_WINDOW_TURNS = 3;  // 이전 3턴만 컨텍스트 주입

export function summarizePrd(prdContent: string): string {
  if (prdContent.length <= MAX_PRD_SUMMARY_LENGTH) return prdContent;
  const half = Math.floor(MAX_PRD_SUMMARY_LENGTH / 2);
  return prdContent.slice(0, half) + "\n\n[...중략...]\n\n" + prdContent.slice(-half);
}

export interface TurnContext {
  turnNumber: number;
  hat: HatConfig;
  prdSummary: string;
  previousTurns: Array<{ hat: string; content: string }>;
  roundInfo: string;  // e.g., "라운드 2/3, 심화 토론"
}

export function buildTurnPrompt(ctx: TurnContext): { system: string; user: string } {
  const roundLabel = ctx.turnNumber <= 6 ? "기본 분석"
    : ctx.turnNumber <= 12 ? "심화 토론 — 이전 관점을 반박하거나 보강하세요"
    : ctx.turnNumber <= 18 ? "합의 수렴 — 핵심 쟁점으로 좁히세요"
    : ctx.turnNumber === 19 ? "최종 대안 — 모든 논의를 고려한 마지막 창의적 제안"
    : "최종 종합 — 전체 토론의 핵심 쟁점과 권고사항 정리";

  const prevContext = ctx.previousTurns.length > 0
    ? `\n\n[이전 토론]\n${ctx.previousTurns.map((t) => `${t.hat}: ${t.content}`).join("\n\n")}`
    : "";

  return {
    system: ctx.hat.systemPrompt,
    user: `[Turn ${ctx.turnNumber}/20 — ${roundLabel}]

[PRD 내용]
${ctx.prdSummary}
${prevContext}

${ctx.hat.emoji} ${ctx.hat.label} 관점에서 분석하세요. 300~500자로 작성하세요.`,
  };
}
