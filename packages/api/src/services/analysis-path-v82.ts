/**
 * Sprint 69: v8.2 유형별 분석 경로 매핑 (F213)
 * 프로세스 v8.2 AX_BD_COWORK_SETUP.md 기반
 */

export type Intensity = "core" | "normal" | "light";
export type DiscoveryType = "I" | "M" | "P" | "T" | "S";
export type Stage = "2-1" | "2-2" | "2-3" | "2-4" | "2-5" | "2-6" | "2-7";

export const STAGES: Stage[] = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"];
export const DISCOVERY_TYPES: DiscoveryType[] = ["I", "M", "P", "T", "S"];

export const DISCOVERY_TYPE_NAMES: Record<DiscoveryType, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "기존서비스형",
};

export const STAGE_NAMES: Record<Stage, string> = {
  "2-1": "레퍼런스 분석",
  "2-2": "수요 시장 검증",
  "2-3": "경쟁·자사 분석",
  "2-4": "사업 아이템 도출",
  "2-5": "핵심 아이템 선정",
  "2-6": "타겟 고객 정의",
  "2-7": "비즈니스 모델 정의",
};

export const ANALYSIS_PATH_MAP: Record<Stage, Record<DiscoveryType, Intensity>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

export const VIABILITY_QUESTIONS: Record<Stage, string> = {
  "2-1": "여기까지 봤을 때, 우리가 뭔가 다르게 할 수 있는 부분이 보이나요?",
  "2-2": "시장 규모나 타이밍을 보니, 우리 팀이 이걸 지금 추진할 만한 이유가 있나요?",
  "2-3": "경쟁 상황을 보니, 우리만의 자리가 있을까요?",
  "2-4": "이 아이템을 30초로 설명한다면, 듣는 사람이 고개를 끄덕일까요?",
  "2-5": "(Commit Gate — 별도 플로우)",
  "2-6": "이 고객이 진짜 존재하고, 진짜 이 문제를 겪고 있다는 확신이 있나요?",
  "2-7": "이 비즈니스 모델로 돈을 벌 수 있다고 믿나요? 아니면 희망사항인가요?",
};

export const COMMIT_GATE_QUESTIONS = [
  "이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?",
  "우리 조직이 이걸 해야 하는 이유가 명확한가요? 규모가 아니더라도요.",
  "지금까지 Pivot한 부분이 있었다면, 그 방향 전환에 확신이 있나요?",
  "이 아이템이 안 되면, 우리가 잃는 것과 얻는 것은 뭔가요?",
] as const;

export interface StageAnalysis {
  stage: Stage;
  stageName: string;
  intensity: Intensity;
  question: string;
}

export interface AnalysisPath {
  discoveryType: DiscoveryType;
  typeName: string;
  stages: StageAnalysis[];
  commitGateQuestions: readonly string[];
}

export function getAnalysisPathV82(discoveryType: DiscoveryType): AnalysisPath {
  const stages: StageAnalysis[] = STAGES.map((stage) => ({
    stage,
    stageName: STAGE_NAMES[stage],
    intensity: ANALYSIS_PATH_MAP[stage][discoveryType],
    question: VIABILITY_QUESTIONS[stage],
  }));

  return {
    discoveryType,
    typeName: DISCOVERY_TYPE_NAMES[discoveryType],
    stages,
    commitGateQuestions: COMMIT_GATE_QUESTIONS,
  };
}
