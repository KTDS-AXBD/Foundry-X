export type DiscoveryType = "I" | "M" | "P" | "T" | "S";
export type Intensity = "core" | "normal" | "light";

export interface BdStage {
  id: string;
  name: string;
  description: string;
  methodologies: string[];
  frameworks: string[];
  checkpoint?: {
    question: string;
    options: string[];
  };
  skills: string[];
  section: "classify" | "branch" | "common";
  isCommitGate?: boolean;
}

export const BD_STAGES: BdStage[] = [
  {
    id: "2-0",
    name: "사업 아이템 분류",
    description:
      "AI Agent 3턴 대화로 5유형(I/M/P/T/S) 분류 → 유형별 맞춤 분석 경로 제안",
    methodologies: ["Natural Language Classification", "3-Turn Dialogue"],
    frameworks: [],
    skills: [],
    section: "classify",
  },
  {
    id: "2-1",
    name: "레퍼런스 분석",
    description:
      "벤치마크 서비스 가치사슬 분해 + AI 기회 포인트 매핑",
    methodologies: [
      "Competitive Analysis",
      "3-Layer Deconstruction (BM·기술·UX)",
      "JTBD Framework",
      "AI Ecosystem Mapping",
    ],
    frameworks: [
      "Value Chain Analysis (Porter)",
      "AI 기회 매핑 5대 영역 (자동화/개인화/예측/최적화/생성)",
    ],
    checkpoint: {
      question: "우리가 뭔가 다르게 할 수 있는 부분이 보이나요?",
      options: ["Go", "Pivot", "Drop"],
    },
    skills: ["ai-biz:ecosystem-map"],
    section: "branch",
  },
  {
    id: "2-2",
    name: "수요 시장 검증",
    description:
      "TAM/SAM/SOM 시장 규모 산출 + Why Now 타이밍 분석",
    methodologies: [
      "TAM/SAM/SOM (Top-down + Bottom-up)",
      "Market Sizing",
      "Assumption Mapping",
    ],
    frameworks: [
      'Task-Based TAM (a16z/Sequoia)',
      '"Why Now" Timing Analysis (시장·기술·규제·경쟁 4축)',
    ],
    checkpoint: {
      question: "우리 팀이 이걸 지금 추진할 만한 이유가 있나요?",
      options: ["Go", "시장 재정의", "Drop"],
    },
    skills: [],
    section: "branch",
  },
  {
    id: "2-3",
    name: "경쟁·자사 분석",
    description:
      "경쟁 환경 파악 + KT DS 차별화 포인트 도출",
    methodologies: [
      "SWOT",
      "Porter's 5 Forces",
      "PESTLE",
      "Blue Ocean (ERRC)",
      "Crossing the Chasm",
      "Competitive Battlecard",
    ],
    frameworks: [
      "Disruption Risk Analysis",
      "Imitation Difficulty Score (Low/Medium/High)",
    ],
    checkpoint: {
      question: "경쟁 상황을 보니, 우리만의 자리가 있을까요?",
      options: ["Go", "포지셔닝 재검토", "Drop"],
    },
    skills: ["ai-biz:moat-analysis", "ai-biz:partner-scorecard", "ai-biz:ecosystem-map"],
    section: "branch",
  },
  {
    id: "2-4",
    name: "사업 아이템 도출",
    description:
      "기회 도출 + 엘리베이터 피치 30초 + 3-Horizon 배치",
    methodologies: [
      "Opportunity Solution Tree",
      "BMC 초안",
      "HMW (How Might We)",
      "Ansoff Matrix",
    ],
    frameworks: [
      "a16z AI Value Chain (3-Layer)",
      "Three Horizons of Growth (McKinsey)",
    ],
    checkpoint: {
      question: "30초로 설명하면 듣는 사람이 고개를 끄덕일까요?",
      options: ["Go", "아이템 재도출", "Drop"],
    },
    skills: ["ai-biz:feasibility-study", "ai-biz:build-vs-buy", "ai-biz:data-strategy"],
    section: "branch",
  },
  {
    id: "2-5",
    name: "핵심 아이템 선정",
    description:
      "Opportunity Scoring + Commit Gate 심화 논의 (4질문)",
    methodologies: [
      "Opportunity Scoring Matrix",
      "ICE/RICE",
      "McKinsey 9-Box",
      "Prioritize Assumptions",
    ],
    frameworks: [
      "BCG Growth-Share Matrix",
      "NIST AI Risk Management Framework",
    ],
    checkpoint: {
      question: "Commit Gate — 이 아이템에 4주를 투자할 가치가 있나요?",
      options: ["Commit", "대안 탐색", "Drop"],
    },
    skills: ["ai-biz:regulation-check", "ai-biz:moat-analysis"],
    section: "branch",
    isCommitGate: true,
  },
  {
    id: "2-6",
    name: "타겟 고객 정의",
    description:
      "고객 페르소나 + Journey Map + WTP 검증",
    methodologies: [
      "User Persona",
      "Customer Journey Map",
      "JTBD",
      "Value Proposition Canvas",
      "ICP",
      "Interview Script",
    ],
    frameworks: [
      "Gartner AI Maturity Model (5-Level)",
      "Van Westendorp PSM / Gabor-Granger",
    ],
    checkpoint: {
      question: "이 고객이 진짜 존재하고, 진짜 이 문제를 겪고 있다는 확신이 있나요?",
      options: ["Go", "고객 재정의", "Drop"],
    },
    skills: [],
    section: "branch",
  },
  {
    id: "2-7",
    name: "비즈니스 모델 정의",
    description:
      "BMC 완성 + Unit Economics + Data Flywheel 검증",
    methodologies: [
      "BMC 완성",
      "Lean Canvas",
      "Unit Economics",
      "수익 시나리오 3안",
      "Pricing Strategy",
      "Growth Loops",
    ],
    frameworks: [
      "Data Flywheel (Andrew Ng)",
      "AI Margin Analysis (a16z)",
      "MIT Sloan AI Business Models (4유형)",
    ],
    checkpoint: {
      question: "이 비즈니스 모델로 돈을 벌 수 있다고 믿나요?",
      options: ["Go", "BM 재설계", "Drop"],
    },
    skills: ["ai-biz:cost-model"],
    section: "branch",
  },
  {
    id: "2-8",
    name: "발굴 결과 패키징",
    description:
      "Discovery Summary 5문장 + GTM 전략 + KPI 대시보드 설계",
    methodologies: [
      "GTM Strategy",
      "Beachhead Market",
      "North Star Metric",
      "Executive Summary",
      "Pyramid Principle",
    ],
    frameworks: [
      "Balanced Scorecard (Kaplan/Norton)",
      "PwC AI Studio & ROI",
      "Agentic AI Process Redesign (Bain/Deloitte)",
    ],
    skills: ["ai-biz:ir-deck", "ai-biz:pilot-design", "ai-biz:regulation-check"],
    section: "common",
  },
  {
    id: "2-9",
    name: "AI 멀티 페르소나 사전 평가",
    description:
      "8개 KT DS 내부 페르소나 AI 자동 평가 + Pre-Mortem",
    methodologies: [
      "Multi-Persona Simulation",
      "Weighted Scoring",
      "Context Prompting",
      "Pre-Mortem",
    ],
    frameworks: [
      "AI Ethics Impact Assessment (Turing/IEEE)",
    ],
    skills: [],
    section: "common",
  },
  {
    id: "2-10",
    name: "최종 보고서",
    description:
      "발굴 종합 보고서 + 형상화 단계 투입 판단",
    methodologies: ["Final Report", "Go/No-Go Decision"],
    frameworks: [],
    skills: [],
    section: "common",
  },
];

/** 유형별 강도 매트릭스 (2-1 ~ 2-7) */
export const INTENSITY_MATRIX: Record<string, Record<DiscoveryType, Intensity>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

export const COMMIT_GATE_QUESTIONS = [
  "이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?",
  "우리 조직이 이걸 해야 하는 이유가 명확한가요? 규모가 아니더라도요.",
  "지금까지 Pivot한 부분이 있었다면, 그 방향 전환에 확신이 있나요?",
  "이 아이템이 안 되면, 우리가 잃는 것과 얻는 것은 뭔가요?",
];

export const TYPE_INFO: Record<DiscoveryType, { name: string; desc: string; color: string }> = {
  I: { name: "아이디어형", desc: "팀원 발상·경영진 방향", color: "bg-blue-100 text-blue-700 border-blue-200" },
  M: { name: "시장·타겟형", desc: "특정 산업/고객군 기회", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  P: { name: "고객문제형", desc: "현장 Pain Point", color: "bg-amber-100 text-amber-700 border-amber-200" },
  T: { name: "기술형", desc: "AI 기술/트렌드 기반", color: "bg-purple-100 text-purple-700 border-purple-200" },
  S: { name: "기존서비스형", desc: "서비스 벤치마크", color: "bg-rose-100 text-rose-700 border-rose-200" },
};
