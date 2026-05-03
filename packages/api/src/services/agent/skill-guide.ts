/**
 * Skill Guide Service — F215 AX BD 스킬 팀 가이드
 *
 * Static data service providing orchestrator info, ai-biz skills,
 * 6-stage lifecycle process flow, and team FAQ.
 */

// ─── Types (aligned with Web client SkillGuideResponse / ProcessFlowResponse / TeamFaqResponse) ───

export interface SkillGuideData {
  orchestrator: {
    name: string;
    description: string;
    commands: Array<{ command: string; description: string }>;
    stages: Array<{ id: string; name: string; description: string }>;
  };
  skills: Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    triggers: string[];
    frameworks: string[];
  }>;
}

export interface ProcessFlowData {
  lifecycle: Array<{ stage: number; name: string; description: string; tools: string[] }>;
  discovery: {
    types: Array<{ code: string; name: string; description: string; icon: string }>;
    stages: Array<{ id: string; name: string; coreFor: string[]; normalFor: string[]; lightFor: string[] }>;
    commitGate: { stage: string; questions: string[] };
  };
}

export interface TeamFaqData {
  categories: string[];
  items: Array<{ id: string; category: string; question: string; answer: string }>;
}

// ─── Data ───

const SKILL_GUIDE: SkillGuideData = {
  orchestrator: {
    name: "AX BD Discovery Orchestrator",
    description:
      "AX 사업개발 Discovery 프로세스를 오케스트레이션하는 메인 스킬이에요. 2-0부터 2-10까지 11단계를 순차 실행하고, 5가지 유형(I/M/P/T/S)에 따라 강도를 조절해요.",
    commands: [
      { command: "/ax-bd-discovery start [아이템명]", description: "2-0 분류부터 시작" },
      { command: "/ax-bd-discovery 2-N", description: "특정 단계로 이동" },
      { command: "/ax-bd-discovery status", description: "전체 진행 상황 확인" },
      { command: "/ax-bd-discovery summary", description: "완료 산출물 정리" },
    ],
    stages: [
      { id: "2-0", name: "분류", description: "아이템 유형(I/M/P/T/S)과 강도(핵심/보통/간소)를 결정해요." },
      { id: "2-1", name: "벤치마크 해체", description: "참조 사례를 분석하고 핵심 요소를 추출해요." },
      { id: "2-2", name: "시장 신호 검증", description: "TAM/SAM/SOM 시장 규모와 성장률을 분석해요." },
      { id: "2-3", name: "경쟁 구도", description: "경쟁사 분석과 해자(Moat)를 평가해요." },
      { id: "2-4", name: "기회 아이디에이션", description: "발굴된 기회를 아이디어로 구체화해요." },
      { id: "2-5", name: "핵심 아이템 선정", description: "Commit Gate — 4개 심화 질문으로 Go/Drop 판단." },
      { id: "2-6", name: "타겟 고객 정의", description: "고객 세그먼트와 페르소나를 정의해요." },
      { id: "2-7", name: "비즈니스 모델", description: "수익 모델과 비용 구조를 설계해요." },
      { id: "2-8", name: "패키징", description: "사업 계획서와 IR 자료를 작성해요." },
      { id: "2-9", name: "멀티페르소나 평가", description: "다중 관점(CEO/CTO/CFO/고객)으로 평가해요." },
      { id: "2-10", name: "최종 보고서", description: "Discovery 전 과정을 종합 보고서로 정리해요." },
    ],
  },
  skills: [
    {
      name: "ai-biz-ecosystem-map",
      displayName: "Ecosystem Map",
      description: "산업 생태계를 시각화하고, 주요 플레이어·기술·트렌드 간 관계를 매핑해요.",
      category: "analysis",
      triggers: ["생태계", "ecosystem", "밸류체인", "value chain"],
      frameworks: ["Porter Value Chain", "Platform Ecosystem Canvas"],
    },
    {
      name: "ai-biz-moat-analysis",
      displayName: "Moat Analysis",
      description: "경쟁 우위 요소(해자)를 분석하고, 지속 가능성을 평가해요.",
      category: "analysis",
      triggers: ["해자", "moat", "경쟁우위", "competitive advantage"],
      frameworks: ["Buffett Moat Framework", "7 Powers"],
    },
    {
      name: "ai-biz-feasibility-study",
      displayName: "Feasibility Study",
      description: "기술적·경제적·운영적 타당성을 종합 검토해요.",
      category: "analysis",
      triggers: ["타당성", "feasibility", "사업성", "viability"],
      frameworks: ["4-Axis Viability (Tech/Market/Finance/Org)"],
    },
    {
      name: "ai-biz-data-strategy",
      displayName: "Data Strategy",
      description: "데이터 수집·활용·거버넌스 전략을 수립해요.",
      category: "strategy",
      triggers: ["데이터 전략", "data strategy", "데이터 확보"],
      frameworks: ["Data Maturity Model", "DAMA-DMBOK"],
    },
    {
      name: "ai-biz-build-vs-buy",
      displayName: "Build vs Buy",
      description: "자체 개발과 외부 도입의 비용·리스크·속도를 비교 분석해요.",
      category: "strategy",
      triggers: ["빌드", "build vs buy", "자체개발", "외부도입"],
      frameworks: ["TCO Analysis", "Build-Buy-Partner Matrix"],
    },
    {
      name: "ai-biz-cost-model",
      displayName: "Cost Model",
      description: "사업 비용 구조를 모델링하고, 손익분기점을 산출해요.",
      category: "strategy",
      triggers: ["비용", "cost model", "원가", "BEP"],
      frameworks: ["AI Cost Stack (Data/Training/Inference/Infra/Ops)"],
    },
    {
      name: "ai-biz-pilot-design",
      displayName: "Pilot Design",
      description: "파일럿 프로젝트의 범위·일정·성공 기준을 설계해요.",
      category: "execution",
      triggers: ["파일럿", "pilot", "PoC", "시범사업"],
      frameworks: ["Lean Experiment Canvas", "PoC Success Criteria"],
    },
    {
      name: "ai-biz-scale-playbook",
      displayName: "Scale Playbook",
      description: "파일럿 성공 후 확대 전략과 실행 플레이북을 작성해요.",
      category: "execution",
      triggers: ["확대", "scale", "상용화", "rollout"],
      frameworks: ["Crossing the Chasm", "Diffusion of Innovation"],
    },
    {
      name: "ai-biz-partner-scorecard",
      displayName: "Partner Scorecard",
      description: "파트너사 후보를 정량 평가하고 우선순위를 매겨요.",
      category: "execution",
      triggers: ["파트너", "partner", "제휴", "alliance"],
      frameworks: ["Partner Evaluation Matrix", "Alliance Strategy Canvas"],
    },
    {
      name: "ai-biz-regulation-check",
      displayName: "Regulation Check",
      description: "관련 법규·인허가·컴플라이언스 요건을 점검해요.",
      category: "regulation",
      triggers: ["규제", "regulation", "컴플라이언스", "법규"],
      frameworks: ["AI Act", "GDPR", "AI기본법"],
    },
    {
      name: "ai-biz-ir-deck",
      displayName: "IR Deck",
      description: "투자자·경영진 보고용 IR 덱을 자동 생성해요.",
      category: "report",
      triggers: ["IR", "투자심의", "보고서", "presentation"],
      frameworks: ["12-Slide IR Deck Structure"],
    },
  ],
};

const PROCESS_FLOW: ProcessFlowData = {
  lifecycle: [
    { stage: 1, name: "수집", description: "내외부 데이터를 수집하고 정리해요.", tools: ["SR 접수", "데이터 크롤링", "인터뷰"] },
    { stage: 2, name: "발굴", description: "수집된 데이터에서 사업 기회를 발굴해요.", tools: ["ax-bd-discovery", "ai-biz 11종"] },
    { stage: 3, name: "형상화", description: "발굴된 기회를 구체적인 사업 형태로 다듬어요.", tools: ["BMC", "PRD 생성", "Prototype"] },
    { stage: 4, name: "검증및공유", description: "다중 관점에서 사업성을 검증하고 공유해요.", tools: ["멀티페르소나 평가", "Six Hats"] },
    { stage: 5, name: "제품화", description: "검증된 기회를 실제 제품/서비스로 구현해요.", tools: ["MVP", "PoC", "Offering Pack"] },
    { stage: 6, name: "GTM", description: "Go-to-Market 전략을 수립하고 시장에 진입해요.", tools: ["GTM 전략", "영업 자료"] },
  ],
  discovery: {
    types: [
      { code: "I", name: "Innovation", description: "혁신 기술 기반 신규 사업 기회", icon: "💡" },
      { code: "M", name: "Market", description: "시장 변화/트렌드 기반 기회", icon: "📈" },
      { code: "P", name: "Problem", description: "고객 문제 해결 기반 기회", icon: "🎯" },
      { code: "T", name: "Technology", description: "기술 역량 활용 기반 기회", icon: "⚙️" },
      { code: "S", name: "Service", description: "서비스 개선/확장 기반 기회", icon: "🔄" },
    ],
    stages: [
      { id: "2-0", name: "분류", coreFor: ["I", "M", "P", "T", "S"], normalFor: [], lightFor: [] },
      { id: "2-1", name: "벤치마크 해체", coreFor: ["S"], normalFor: ["M", "T"], lightFor: ["I", "P"] },
      { id: "2-2", name: "시장 신호 검증", coreFor: ["M"], normalFor: ["I", "P", "S"], lightFor: ["T"] },
      { id: "2-3", name: "경쟁 구도", coreFor: ["M", "S"], normalFor: ["I", "P"], lightFor: ["T"] },
      { id: "2-4", name: "기회 아이디에이션", coreFor: ["I", "P"], normalFor: ["M", "T", "S"], lightFor: [] },
      { id: "2-5", name: "핵심 아이템 선정", coreFor: ["I", "M", "P", "T", "S"], normalFor: [], lightFor: [] },
      { id: "2-6", name: "타겟 고객 정의", coreFor: ["P"], normalFor: ["I", "M", "S"], lightFor: ["T"] },
      { id: "2-7", name: "비즈니스 모델", coreFor: ["I", "M"], normalFor: ["P", "S"], lightFor: ["T"] },
    ],
    commitGate: {
      stage: "2-5",
      questions: [
        "시장 규모가 충분한가?",
        "우리가 이길 수 있는가?",
        "수익 모델이 성립하는가?",
        "실행 역량이 있는가?",
      ],
    },
  },
};

const TEAM_FAQ: TeamFaqData = {
  categories: ["general", "ax-bd", "troubleshooting"],
  items: [
    {
      id: "faq-g1",
      category: "general",
      question: "Foundry-X가 뭔가요?",
      answer: "Foundry-X는 AX 사업개발 업무를 AI 에이전트로 자동화하는 오케스트레이션 플랫폼이에요. Git을 단일 진실 공급원(SSOT)으로 사용해요.",
    },
    {
      id: "faq-g2",
      category: "general",
      question: "Claude Code(CC)는 어떻게 설치하나요?",
      answer: "npm install -g @anthropic-ai/claude-code 로 설치하고, claude 명령으로 실행해요. Anthropic API 키가 필요해요.",
    },
    {
      id: "faq-g3",
      category: "general",
      question: "팀에 합류하려면 어떻게 하나요?",
      answer: "관리자에게 초대 링크를 요청하세요. 이메일로 전송된 링크를 클릭하면 조직에 자동 가입돼요.",
    },
    {
      id: "faq-g4",
      category: "general",
      question: "스킬(Skill)이란 무엇인가요?",
      answer: "Claude Code에서 실행되는 전문화된 AI 에이전트 기능이에요. 각 스킬은 특정 분석/전략/실행 작업을 수행해요.",
    },
    {
      id: "faq-g5",
      category: "general",
      question: "프로세스 v8.2는 이전 버전과 무엇이 다른가요?",
      answer: "v8.2는 발굴 유형을 A/B/C 3유형에서 I/M/P/T/S 5유형으로 확장하고, 강도 라우팅(핵심/보통/간소)을 도입했어요.",
    },
    {
      id: "faq-a1",
      category: "ax-bd",
      question: "Cowork vs Claude Code — 어떤 걸 써야 하나요?",
      answer: "Cowork은 웹 브라우저에서, Claude Code는 터미널에서 동일한 프로세스를 실행해요. 본인에게 편한 환경을 선택하세요. 두 환경의 프로세스는 동일해요.",
    },
    {
      id: "faq-a2",
      category: "ax-bd",
      question: "ax-bd-discovery 오케스트레이터는 무엇인가요?",
      answer: "AX BD Discovery 2단계 발굴 프로세스를 자동 진행하는 메인 스킬이에요. 2-0(분류)부터 시작해 유형별로 적절한 하위 스킬을 순차 호출해요.",
    },
    {
      id: "faq-a3",
      category: "ax-bd",
      question: "5유형(I/M/P/T/S) 분류는 어떻게 결정되나요?",
      answer: "2-0 단계에서 3회 대화를 통해 결정해요. Innovation(기술 혁신), Market(시장 트렌드), Problem(고객 문제), Technology(기술 역량), Service(서비스 개선) 중 가장 적합한 유형을 선택해요.",
    },
    {
      id: "faq-t1",
      category: "troubleshooting",
      question: "스킬이 작동하지 않을 때 확인할 사항",
      answer: "1) claude --version으로 CC 버전 확인 → 2) .claude/skills/ 디렉토리에 스킬 파일 존재 확인 → 3) API 키 설정 확인 → 4) 문제 지속 시 에러 로그와 함께 팀 채널에 공유해 주세요.",
    },
    {
      id: "faq-t2",
      category: "troubleshooting",
      question: "2-5 Commit Gate에서 Drop 판정을 받으면?",
      answer: "Drop 판정은 현 시점에서 진행이 어렵다는 의미예요. 아이템은 보류 상태로 보관되며, 시장 상황 변화 등 조건이 달라지면 재진입할 수 있어요.",
    },
  ],
};

// ─── Public Functions ───

export function getSkillGuideData(): SkillGuideData {
  return SKILL_GUIDE;
}

export function getProcessFlowData(): ProcessFlowData {
  return PROCESS_FLOW;
}

export function getTeamFaqData(): TeamFaqData {
  return TEAM_FAQ;
}
