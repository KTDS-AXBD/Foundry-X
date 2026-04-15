// AI Foundry OS Deep Dive v0.3 — 구조화된 콘텐츠 데이터
// Source: docs/specs/AI_Foundry_OS_DeepDive_v0.3.html
// Updated: 2026-04-16 Sprint 298

export interface DetailList {
  heading?: string;
  items: string[];
}

export interface SubSection {
  code: string;       // "A-1", "A-2", etc.
  title: string;
  tagline?: string;
  lede: string;       // 1~2줄 소개
  detail: {
    kind: "pipeline" | "cards" | "grid" | "flow" | "matrix" | "callout";
    data: unknown;    // kind별 schema
  };
}

export interface Plane {
  id: "input" | "control" | "takeaway";
  code: "A" | "B" | "C";
  label: string;
  korean: string;
  accent: string;     // hex color
  accentSoft: string;
  tagline: string;
  thesis: string;
  sections: SubSection[];
}

// ───────────────────────────────────────────────────────────────────
// Plane A — Input Plane (경험 → Spec 자산화)
// ───────────────────────────────────────────────────────────────────

const inputPlane: Plane = {
  id: "input",
  code: "A",
  label: "Input Plane",
  korean: "경험의 자산화",
  accent: "#d4a54c",
  accentSoft: "#3a2f14",
  tagline: "왜 Spec이 AI 개발의 필요충분조건인가",
  thesis:
    "kt ds 20년+ SI/ITO 경험은 형태가 제각각이다. 돌아가는 코드, 산출·운영 문서, 담당자 암묵지 — 이 셋을 AI가 다시 쓸 수 있는 구조로 바꾸는 게 Decode-X의 역할.",

  sections: [
    // A-1 Pipeline
    {
      code: "A-1",
      title: "원시 경험 → Spec 변환 파이프라인",
      tagline: "SOURCE → PROCESS → OUTPUT",
      lede:
        "3종 원시 경험(코드·문서·암묵지)을 Decode-X 4단계 처리로 통과시키면 Business·Technical·Quality 3종 Spec 자산이 생성된다.",
      detail: {
        kind: "pipeline",
        data: {
          sources: [
            {
              n: 1,
              name: "SI/ITO 코드",
              summary: "레거시 소스코드 저장소, 패키지, DB 스키마",
              items: ["Java/Spring, COBOL, PL/SQL 등", "DDL·프로시저·배치 잡", "환경설정·IaC 스크립트"],
            },
            {
              n: 2,
              name: "SI/ITO 문서",
              summary: "프로젝트 공식 산출물 + 운영 문서",
              items: [
                "SI 산출물: 요건정의서, 설계서, 테스트 시나리오",
                "운영문서: Runbook, 장애이력, 변경관리 로그",
                "KMS 등록 지식, FAQ, 기술 리포트",
              ],
            },
            {
              n: 3,
              name: "암묵지 (Tacit)",
              summary: "담당자 머릿속에만 있는 비정형 지식",
              items: [
                "담당자 Knowledge (인터뷰·워크숍)",
                "운영/개발 Lesson & Learned",
                "화이트보드 메모, Slack/회의록, 노션",
              ],
            },
          ],
          processes: [
            {
              code: "2-1",
              name: "코드 구조 분석",
              subtitle: "Local · AST",
              summary: "AST 파싱 · 의존성 그래프 · 데이터 모델 리버스",
              items: ["모듈·클래스·함수 추출", "Call Graph · DB 테이블 관계", "API 엔드포인트 시그니처"],
            },
            {
              code: "2-2",
              name: "문서 의미 분석",
              subtitle: "AI · RAG",
              summary: "LLM+RAG로 비정형 문서를 섹션·개념 단위로 쪼개 의미 추출",
              items: ["DocumentParser (보유)", "요건·정책·규칙 추출", "용어사전 자동 생성"],
            },
            {
              code: "2-3",
              name: "암묵지 인터뷰",
              subtitle: "HITL",
              summary: "Agent가 담당자에게 구조화 질문 → 답변을 Spec 조각으로 변환",
              items: ["TA Agent · AI Makers 활용", "회의록 Agent 연계", "답변 → KG 노드 자동 등록"],
            },
            {
              code: "2-4",
              name: "정합성 검증",
              subtitle: "SDD",
              summary: "코드·문서·암묵지 3자 Cross-check — Gap ≥ 90% 달성까지 반복",
              items: [],
            },
          ],
          outputs: [
            {
              glyph: "📘",
              name: "Business Spec",
              summary: "사업·업무 규칙 관점",
              items: ["정책 정의서 (Policy Spec)", "업무 프로세스·의사결정 규칙", "도메인 용어집 · KPI 정의"],
            },
            {
              glyph: "📗",
              name: "Technical Spec",
              summary: "시스템·구현 관점",
              items: ["아키텍처 정의서", "서비스 구성도 · API 명세", "데이터 모델 · 인터페이스 계약"],
            },
            {
              glyph: "📙",
              name: "Quality Spec",
              summary: "비기능·품질 관점",
              items: ["성능·보안·SLA 기준", "테스트 계약 (Test Contract)", "운영 Runbook · 장애 대응 절차"],
            },
          ],
          terminus: "3종 Spec을 노드·엣지로 연결해 L4 Ontology에 저장 → Asset Layer로 유통",
        },
      },
    },

    // A-2 Spec Definition (3종 상세 구성요소 — 사용자가 명시 요구)
    {
      code: "A-2",
      title: "Spec의 정의 — 무엇이 나와야 Spec인가",
      tagline: "AI와 사람이 동일한 의미로 해석 가능한 구조화된 계약",
      lede:
        "Spec은 단순 문서가 아니라 AI와 사람이 동일한 의미로 해석 가능한 구조화된 계약. 3가지 관점(사업·시스템·비기능)으로 분리되어 서로를 보완한다.",
      detail: {
        kind: "cards",
        data: [
          {
            id: "business",
            glyph: "📘",
            name: "Business Spec",
            purpose: '"무엇을 왜" — 사업·업무 관점',
            components: [
              "목적·KPI·대상 사용자",
              "업무 규칙 (if-then)",
              "정책·승인 체계",
              "용어사전 (도메인 표준)",
            ],
            example:
              "퇴직연금 중도인출 사유 판정 규칙 — 주택구입/의료비/학자금 등 분기 조건, 소득증빙 필수 서류, 한도 계산식",
          },
          {
            id: "technical",
            glyph: "📗",
            name: "Technical Spec",
            purpose: '"어떻게" — 시스템 구현 관점',
            components: [
              "아키텍처 정의서 (Layer 구조)",
              "서비스 구성도 (컴포넌트·IF)",
              "API 명세 (OpenAPI, Zod 스키마)",
              "데이터 모델 (ERD·DDL)",
            ],
            example:
              '"인증/결제" 반제품 — MSA 서비스 구성도 5개 컴포넌트, JWT+OAuth2 인증 플로우, 결제 Idempotency 키 설계',
          },
          {
            id: "quality",
            glyph: "📙",
            name: "Quality Spec",
            purpose: '"얼마나 잘" — 비기능 관점',
            components: [
              "성능 목표 (RPS·Latency)",
              "보안 요구 (Mask·암호화·감사)",
              "테스트 계약 (단위·통합·E2E)",
              "운영 Runbook · SLA",
            ],
            example:
              "연말정산 반제품 — 피크 1만 TPS, 개인정보 필드 AES-256, 테스트 케이스 300건, 롤백 15분 이내",
          },
        ],
      },
    },

    // A-3 AI-Ready 6 Criteria
    {
      code: "A-3",
      title: "AI 개발의 필요충분조건 — 6가지 기준",
      tagline: "Foundry-X가 자동 생산 가능해지는 조건",
      lede:
        "Spec이 아래 6가지를 모두 충족해야 Foundry-X가 자동으로 Code·Test·Agent를 생성할 수 있다. 한 가지라도 빠지면 반제품화 불가.",
      detail: {
        kind: "grid",
        data: [
          {
            n: "①",
            title: "기계 판독 가능",
            tag: "Machine-readable",
            body: "Markdown/YAML/JSON 등 구조화 포맷. 자연어만으로는 부족 — 스키마가 있어야 함",
          },
          {
            n: "②",
            title: "의미 일관성",
            tag: "Semantic Consistency",
            body: "같은 용어는 같은 뜻. KG 용어사전과 연결되어 중의성 제거",
          },
          {
            n: "③",
            title: "테스트 가능",
            tag: "Testable",
            body: "Spec에서 바로 테스트 케이스가 도출 가능. TDD Red Phase의 입력",
          },
          {
            n: "④",
            title: "추적 가능",
            tag: "Traceable",
            body: "Spec ↔ Code ↔ Test 3자 매핑이 KG로 연결. Gap 측정 가능",
          },
          {
            n: "⑤",
            title: "완결성",
            tag: "Completeness",
            body: "Business + Technical + Quality 3종 모두 존재. 한쪽만 있으면 구현 불가",
          },
          {
            n: "⑥",
            title: "사람 리뷰 가능",
            tag: "Human-reviewable",
            body: "AI만 이해하는 게 아니라 도메인 전문가가 10분 내 검토 가능한 가독성",
          },
        ],
      },
    },

    // A-4 실전 사례 — 퇴직연금
    {
      code: "A-4",
      title: "실전 사례 — 퇴직연금 중도인출 반제품화 (Type 1)",
      tagline: "경험 → Spec → AI 반제품 E2E 플로우",
      lede:
        "DeepDive 원본이 상정한 대표 시나리오. 실제 kt ds AX BD팀이 파일럿으로 선정한 도메인은 LPON(온누리상품권 취소)으로, Decode-X `반제품-스펙/pilot-lpon-cancel/` 에 완성 상태로 존재한다.",
      detail: {
        kind: "flow",
        data: [
          {
            phase: "SOURCE",
            body: "기존 퇴직연금 SI 코드 + 운영 매뉴얼 + 현업 담당자 인터뷰",
          },
          {
            phase: "DECODE-X",
            body: "AST로 judgment 로직 추출 / 매뉴얼에서 정책 추출 / 담당자 엣지케이스 캡처",
          },
          {
            phase: "SPEC 산출",
            body: "Business: 인출사유 6종 규칙 · Technical: REST API + ERD · Quality: 규제 준수 테스트 200건",
          },
          {
            phase: "반제품",
            body: "Foundry-X가 Spec 읽고 Code + Test 자동 생성 → Type 1 소스 딜리버리 → 신규 고객사 투입",
            terminus: true,
          },
        ],
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────
// Plane B — Control Plane (3대 자산)
// ───────────────────────────────────────────────────────────────────

const controlPlane: Plane = {
  id: "control",
  code: "B",
  label: "Control Plane",
  korean: "실행팀 3대 자산",
  accent: "#3fb08a",
  accentSoft: "#0f2e24",
  tagline: "Harness · AI Engine · Ontology",
  thesis:
    "수행팀(AX사업1팀·AX사업2팀 등)이 프로젝트 착수 시 가방에 넣어가야 할 것. 이 3가지가 갖춰져 있어야 Spec만 들고도 반제품이 나온다.",

  sections: [
    {
      code: "B-1",
      title: "3대 자산 구성",
      tagline: "판단 프레임 · 생산 엔진 · 맥락 사전",
      lede:
        "각 자산은 방법론/도구/모듈/인프라로 세분된다. 왼쪽부터 Harness(사람의 판단) → AI Engine(기계의 생산) → Ontology(공통 의미).",
      detail: {
        kind: "cards",
        data: [
          {
            id: "harness",
            glyph: "⚙",
            name: "Harness Engineering",
            purpose: "판단의 프레임",
            components: [
              "6단계 사업개발 프로세스 (수집→발굴→형상화→검증→제품화→GTM)",
              "5가지 판단 하네스 — KT연계성·사업성·리스크·AI-Ready Data·구체화",
              "TDD Red→Green 사이클 (Vitest 3.x 템플릿)",
              "F-item Lifecycle 6단계 — Idea → Planning → Design → Impl → Verify → Done",
            ],
            tools: [
              "분석 프레임워크 — BMC · TAM/SAM/SOM · PESTEL · 5 Forces · AI Red Teaming",
              "PRD/Prototype 템플릿 4종 (사업기획서·Offering·PRD·Prototype)",
              "Harness 체크리스트 자동화 — Agent 자동 점검 + HITL 승인",
            ],
          },
          {
            id: "engine",
            glyph: "🧠",
            name: "AI Engine",
            purpose: "반제품 생산 엔진",
            components: [
              "Foundry-X Orchestrator — Lead Agent (Anthropic 패턴). Spec 읽고 task 분해 → Worker Agent 위임 → 산출물 병합",
              "Multi-Agent Worker Pool 12종 — RFP·TA·Makers·SQL·회의록 Agent를 Agents-as-Tools로 연결",
              "RAG Pipeline — Spec/KG에서 관련 컨텍스트 검색 → Agent 주입 + 시멘틱 캐싱",
              "SDD Triangle Engine — Spec↔Code↔Test 3자 Gap 자동 측정, 90% 미달 시 PDCA-iterator 자동 루프",
              "Evaluator-Optimizer — G-Eval·Braintrust 통합. 생성물 품질 자동 평가 후 재생성",
            ],
            tools: [
              "Agent Runtime — 세션 격리 · 장시간 실행 · Streaming SSE (Cloudflare Workers · D1)",
              "코드박스 Appliance — 폐쇄망 고객사 현장 배포용 AI 코드 개발 환경",
            ],
          },
          {
            id: "ontology",
            glyph: "🔗",
            name: "Ontology",
            purpose: "맥락·용어 사전",
            components: [
              "Knowledge Graph Core — Spec·Code·Test·Agent·산출물을 노드·엣지로 저장. shared/kg.ts SSOT",
              "Spec Asset Schema — Business·Technical·Quality 표준 스키마 (YAML/JSON + Zod 검증)",
              "도메인 용어사전 Glossary — 금융·공공·통신 도메인별 표준 용어",
              "Relationship Registry — 구현한다/테스트한다/의존한다/대체한다 등 엣지 타입 표준",
              "XAI (Explainability) — AI 결정 근거를 KG 경로(노드·엣지)로 자동 생성. 감사·규제 대응",
            ],
            tools: [
              "KG 구축 프로세스 — Decode-X 산출물 자동 등록 → 용어 충돌 감지 → 도메인 전문가 Merge 승인",
              "Ontology MCP (Palantir 참조) — KG를 MCP 서버로 노출. '27 도입 검토",
            ],
          },
        ],
      },
    },

    // B-2 Handoff 5단계
    {
      code: "B-2",
      title: "수행팀 Handoff — Spec 받은 후 개발 흐름",
      tagline: "Spec → Plan → Design → Impl → Verify",
      lede:
        "Spec을 들고 수행팀에 넘겼을 때 실제 개발 순서. 각 단계에서 Control Plane 3대 자산이 어떻게 투입되는지를 명시.",
      detail: {
        kind: "flow",
        data: [
          { phase: "1. Spec 수령", body: "Business/Technical/Quality Spec 3종 + KG 링크" },
          { phase: "2. Plan 작성", body: "Harness 5종 체크 + Sprint 배정" },
          { phase: "3. Design", body: "AI Engine이 Spec 기반 Design doc 초안 생성 → HITL 리뷰" },
          { phase: "4. Impl (TDD)", body: "Red: 테스트 자동 생성 / Green: Orchestrator 코드 생성" },
          { phase: "5. Verify", body: "SDD Triangle Gap ≥ 90% + PDCA 자동 개선", terminus: true },
        ],
      },
    },

    // B-3 3×5 매트릭스
    {
      code: "B-3",
      title: "3대 자산 투입 매트릭스",
      tagline: "단계 × 자산 교차 투입 관계",
      lede:
        "개발 단계별로 어떤 자산이 어떻게 투입되는지의 매트릭스. 한 단계라도 자산 공급이 빠지면 다음 단계가 막힌다.",
      detail: {
        kind: "matrix",
        data: {
          columns: ["Harness Engineering", "AI Engine", "Ontology"],
          rows: [
            {
              phase: "1. Spec 수령",
              cells: ["Exit 조건 체크리스트", "—", "KG 노드 탐색 · 용어사전 매칭"],
            },
            {
              phase: "2. Plan 작성",
              cells: ["5 하네스 판단 / Sprint 템플릿", "TA Agent · Makers 연계", "유사 사례 KG 검색"],
            },
            {
              phase: "3. Design",
              cells: ["Design 표준 템플릿", "Foundry-X Orchestrator 초안 생성", "Spec Schema Validation"],
            },
            {
              phase: "4. Impl (TDD)",
              cells: [
                "Red→Green 체크리스트",
                "Multi-Agent Worker · 코드박스 · RAG",
                "Relationship Registry로 의존성 추적",
              ],
            },
            {
              phase: "5. Verify",
              cells: [
                "Gap ≥ 90% 기준",
                "SDD Triangle · Evaluator-Optimizer",
                "XAI 경로 기반 설명 자동 생성",
              ],
            },
          ],
        },
      },
    },

    // B-4 메타 적용 — Foundry-X 자체
    {
      code: "B-4",
      title: "실전 사례 — Foundry-X 자체 개발 현황 (메타 적용)",
      tagline: "방법론 자기증명 — Sprint 298 누적",
      lede:
        "현재 Foundry-X가 자기 자신을 개발하는 데 이 방법론을 그대로 적용하는 중. 3대 자산·6단계·Harness·Gap Analysis가 모두 코드로 돌아간다.",
      detail: {
        kind: "matrix",
        data: {
          columns: ["현재 적용 현황"],
          rows: [
            {
              phase: "Harness",
              cells: ["F-item Lifecycle 6단계 · TDD Red→Green · Sprint Worktree · 5 Rules (sprint-ops.md 등)"],
            },
            {
              phase: "AI Engine",
              cells: ["cli/api/web/shared 4패키지 · Claude Squad 멀티에이전트 · PDCA-iterator · Gap Analysis"],
            },
            {
              phase: "Ontology",
              cells: [
                "SPEC.md §5 F-item SSOT · shared/kg.ts · FX-REQ 코드 체계 · 용어사전 (axbd·plugin·sso·methodology)",
              ],
            },
            {
              phase: "성과",
              cells: ["Phase 1~44 완료 · Sprint 298까지 진행 · SI 개발 시간 30%+ 절감 목표 사전 검증 중"],
            },
          ],
        },
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────
// Plane C — Takeaway (대표 보고 요약)
// ───────────────────────────────────────────────────────────────────

const takeawayPlane: Plane = {
  id: "takeaway",
  code: "C",
  label: "Takeaway",
  korean: "대표 보고 요약",
  accent: "#e25c5c",
  accentSoft: "#2e1213",
  tagline: "3문장 요약",
  thesis: "이 전체 구조가 사업 단위로 설득력을 가지려면 다음 3가지를 동시에 증명해야 한다.",

  sections: [
    {
      code: "C-1",
      title: "경험의 자산화",
      tagline: "Input Plane 결론",
      lede:
        "SI/ITO 코드·문서·암묵지 3종을 Decode-X 파이프라인으로 Business·Technical·Quality Spec 3종으로 변환. Spec은 6가지 기준(기계판독·의미일관·테스트가능·추적가능·완결성·인간검토)을 충족해야 AI 개발의 필요충분조건.",
      detail: {
        kind: "callout",
        data: {
          tone: "input",
          label: "Input Plane",
          metric: "3소스 → 4단계 → 3종 Spec",
        },
      },
    },
    {
      code: "C-2",
      title: "실행팀 3대 자산",
      tagline: "Control Plane 결론",
      lede:
        "Harness(판단 프레임) · AI Engine(생산 엔진) · Ontology(맥락 사전). 수행팀은 이 3가지와 Spec을 들고 5단계(Spec→Plan→Design→Impl→Verify)를 돌리면 반제품이 나온다.",
      detail: {
        kind: "callout",
        data: {
          tone: "control",
          label: "Control Plane",
          metric: "3자산 × 5단계",
        },
      },
    },
    {
      code: "C-3",
      title: "메타 검증 진행 중",
      tagline: "방법론 자기증명",
      lede:
        "Foundry-X 자체가 이 방식으로 개발되고 있어 방법론 자기증명이 이미 Sprint 298까지 누적. '26 하반기 SI/ITO 파일럿으로 외부 고객 적용 검증 예정.",
      detail: {
        kind: "callout",
        data: {
          tone: "takeaway",
          label: "Validation",
          metric: "Sprint 298 누적 · '26 하반기 파일럿",
        },
      },
    },
  ],
};

// ───────────────────────────────────────────────────────────────────

export const DEEPDIVE: {
  meta: { version: string; date: string; source: string; sprint: number; phase: number };
  planes: Plane[];
} = {
  meta: {
    version: "v0.3",
    date: "2026-04-15",
    source: "docs/specs/AI_Foundry_OS_DeepDive_v0.3.html",
    sprint: 298,
    phase: 44,
  },
  planes: [inputPlane, controlPlane, takeawayPlane],
};

export type { Plane as PlaneType, SubSection as SubSectionType };
