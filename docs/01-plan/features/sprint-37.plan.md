---
code: FX-PLAN-037
title: "Sprint 37 — ArchitectAgent + TestAgent (F138+F139)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-37
sprint: 37
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F138: ArchitectAgent + F139: TestAgent |
| Sprint | 37 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — F136 ModelRouter + F137 EvaluatorOptimizer 후속) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 2개 (ArchitectAgent, TestAgent) |
| 신규 테스트 | 30개+ |
| AgentTaskType 추가 | 2종 (architecture-review, test-generation 활용) |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트가 코드 생성/리뷰만 수행 — 설계 문서 검토, 아키텍처 판단, 테스트 자동 생성은 사람이 직접 수행. ReviewerAgent만 존재하여 에이전트 역할이 단일적 |
| **Solution** | F138: ArchitectAgent — 설계 문서 검토 + 모듈 의존성 분석 + 아키텍처 판단 + 개선 제안. F139: TestAgent — 변경 코드 기반 테스트 자동 생성 + 커버리지 갭 분석 |
| **Function UX Effect** | PR에서 아키텍처 영향 자동 분석 + 테스트 자동 생성 제안. PlannerAgent 계획 수립 시 ArchitectAgent가 설계 검증, TestAgent가 테스트 계획 보강 |
| **Core Value** | F136 ModelRouter로 ArchitectAgent=Opus, TestAgent=Sonnet 자동 배정. F137 EvaluatorOptimizer 통합으로 설계/테스트 품질 자동 개선 루프 구현 토대 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F138 — ArchitectAgent:**
- `ArchitectAgent` 서비스 구현 — LLM 기반 아키텍처 분석 전문 에이전트
- `analyzeArchitecture(request)` — PR diff 또는 설계 문서 기반 아키텍처 영향 분석
- `reviewDesignDoc(document)` — Design 문서 품질 평가 + 개선 제안
- `analyzeDependencies(files)` — 모듈 간 의존성 분석 + 순환 참조 감지
- `POST /agents/architect/analyze` API — 아키텍처 분석 실행
- `POST /agents/architect/review-design` API — 설계 문서 리뷰
- AgentOrchestrator 통합 — `spec-analysis` 태스크 시 ArchitectAgent 자동 위임
- EvaluatorOptimizer 통합 — SpecComplianceCriteria 활용한 설계 품질 자동 개선

**F139 — TestAgent:**
- `TestAgent` 서비스 구현 — 변경 코드 기반 테스트 자동 생성 전문 에이전트
- `generateTests(request)` — PR diff 기반 테스트 코드 생성 (vitest 형식)
- `analyzeCoverage(files)` — 파일별 테스트 커버리지 갭 분석
- `suggestEdgeCases(functionSignature)` — 함수 시그니처 기반 엣지 케이스 추천
- `POST /agents/test/generate` API — 테스트 생성 실행
- `POST /agents/test/coverage-gaps` API — 커버리지 갭 분석
- AgentOrchestrator 통합 — `test-generation` 태스크 시 TestAgent 자동 위임
- EvaluatorOptimizer 통합 — TestCoverageCriteria 활용한 테스트 품질 자동 개선

### 1.2 성공 기준

| 기준 | 목표 |
|------|------|
| F138 단위 테스트 | 15개+ 통과 |
| F139 단위 테스트 | 15개+ 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck + lint | 에러 0건 |
| AgentOrchestrator 통합 | spec-analysis → ArchitectAgent, test-generation → TestAgent 위임 확인 |

### 1.3 비목표 (Non-Goals)

- 실제 LLM 호출 기반 프로덕션 운용 (이번 Sprint은 서비스 구조 + 단위 테스트)
- Web UI 변경 (에이전트 분석 결과 시각화는 후속)
- 프로덕션 배포 (Sprint 36+37 합산 일괄 배포 예정)
- SecurityAgent/QAAgent 구현 (F140/F141, 후속 Sprint)
- PlannerAgent와의 워크플로우 통합 (ArchitectAgent→PlannerAgent 파이프라인은 후속)

---

## 2. 배경 (Context)

### 2.1 관련 문서

| 문서 | 참조 |
|------|------|
| Agent Evolution PRD | `docs/specs/agent-evolution/prd-final.md` §4.1 A4(F138), A5(F139) |
| ReviewerAgent (참조 패턴) | `packages/api/src/services/reviewer-agent.ts` |
| PlannerAgent (참조 패턴) | `packages/api/src/services/planner-agent.ts` |
| ModelRouter (S36) | `packages/api/src/services/model-router.ts` |
| EvaluatorOptimizer (S36) | `packages/api/src/services/evaluator-optimizer.ts` |
| EvaluationCriteria (S36) | `packages/api/src/services/evaluation-criteria.ts` |
| Agent Runner 팩토리 | `packages/api/src/services/agent-runner.ts` |
| Execution Types | `packages/api/src/services/execution-types.ts` |
| Agent Orchestrator | `packages/api/src/services/agent-orchestrator.ts` |
| Prompt Utils (S34) | `packages/api/src/services/prompt-utils.ts` |
| Sprint 36 Plan | `docs/01-plan/features/sprint-36.plan.md` |

### 2.2 현재 상태 (As-Is)

**역할 에이전트:**
```
Agent Orchestrator
├── executeTask(request) → createRoutedRunner(env, taskType) → Runner.execute()
├── 역할별 전문화 없음 — 모든 태스크가 범용 Runner로 실행
├── ReviewerAgent — PR 리뷰 전문 (유일한 역할 에이전트)
└── PlannerAgent — 작업 계획 수립 (LLM 기반)

AgentTaskType: 7종 정의됨
├── "code-review"       → ReviewerAgent와 연결 (간접)
├── "spec-analysis"     → 범용 Runner 실행 (전문 에이전트 없음)
├── "test-generation"   → 범용 Runner 실행 (전문 에이전트 없음)
├── "code-generation"   → 범용 Runner 실행
├── "policy-evaluation" → 범용 Runner 실행
├── "skill-query"       → 범용 Runner 실행
└── "ontology-lookup"   → 범용 Runner 실행
```

**문제점:**
1. `spec-analysis` 태스크가 범용 Runner로 실행 — 아키텍처 맥락 없이 단순 텍스트 분석
2. `test-generation` 태스크가 범용 Runner로 실행 — 프로젝트 테스트 컨벤션 무시
3. F136 ModelRouter가 최적 모델을 선택하지만, 전문 프롬프트/파싱 로직 없음
4. F137 EvaluatorOptimizer와 연결된 전문 평가 기준이 제한적

### 2.3 목표 상태 (To-Be)

**F138 — ArchitectAgent:**
```
ArchitectAgent (서비스)
├── analyzeArchitecture(request)
│   ├── FileContextCollector로 관련 파일 수집
│   ├── ARCHITECT_SYSTEM_PROMPT + 아키텍처 맥락 주입
│   ├── createRoutedRunner(env, "spec-analysis") → Opus급 모델
│   └── JSON 파싱 → ArchitectureAnalysisResult
│       ├── impactSummary: 변경 영향 요약
│       ├── dependencyAnalysis: 모듈 의존성 매핑
│       ├── riskAssessment: 아키텍처 리스크 평가
│       ├── designScore: 0-100 설계 품질 점수
│       └── recommendations: 개선 제안 목록
│
├── reviewDesignDoc(document)
│   ├── DESIGN_REVIEW_PROMPT + 설계 원칙 주입
│   └── DesignReviewResult (completeness, consistency, feasibility)
│
└── analyzeDependencies(files)
    ├── import 분석 + 모듈 그래프 구축
    └── DependencyAnalysis (circular, coupling, cohesion)
```

**F139 — TestAgent:**
```
TestAgent (서비스)
├── generateTests(request)
│   ├── FileContextCollector로 변경 파일 + 기존 테스트 수집
│   ├── TEST_GENERATION_PROMPT + vitest 컨벤션 주입
│   ├── createRoutedRunner(env, "test-generation") → Sonnet급 모델
│   └── JSON 파싱 → TestGenerationResult
│       ├── testFiles: 생성된 테스트 파일 목록
│       ├── testCount: 테스트 케이스 수
│       ├── coverageEstimate: 추정 커버리지
│       └── edgeCases: 감지된 엣지 케이스
│
├── analyzeCoverage(files)
│   ├── 기존 테스트 파일 매칭 (*.test.ts 패턴)
│   └── CoverageGapResult (uncoveredFunctions, missingEdgeCases)
│
└── suggestEdgeCases(functionSignature)
    ├── 함수 시그니처 분석 (파라미터 타입, 반환 타입)
    └── EdgeCaseSuggestion[] (boundary, null, error, concurrency)
```

**AgentOrchestrator 통합:**
```
AgentOrchestrator.executeTask(request)
├── taskType === "spec-analysis"     → ArchitectAgent.analyzeArchitecture()
├── taskType === "test-generation"   → TestAgent.generateTests()
├── taskType === "code-review"       → ReviewerAgent (기존)
└── 기타                              → 범용 Runner (기존)
```

---

## 3. 구현 계획 (Implementation Plan)

### 3.1 파일 변경 목록

#### F138 — ArchitectAgent

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/api/src/services/architect-agent.ts` | 신규 | ArchitectAgent 서비스 — analyzeArchitecture + reviewDesignDoc + analyzeDependencies |
| 2 | `packages/api/src/services/architect-prompts.ts` | 신규 | 아키텍처 분석용 시스템 프롬프트 + 파싱 유틸 |
| 3 | `packages/api/src/routes/agent.ts` | 수정 | 2개 엔드포인트 추가 (POST /agents/architect/analyze, POST /agents/architect/review-design) |
| 4 | `packages/api/src/schemas/agent.ts` | 수정 | ArchitectureAnalysisRequest/Result + DesignReviewRequest/Result 스키마 |
| 5 | `packages/api/src/services/agent-orchestrator.ts` | 수정 | spec-analysis → ArchitectAgent 위임 로직 |
| 6 | `packages/api/src/__tests__/architect-agent.test.ts` | 신규 | ArchitectAgent 단위 테스트 15개+ |

#### F139 — TestAgent

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 7 | `packages/api/src/services/test-agent.ts` | 신규 | TestAgent 서비스 — generateTests + analyzeCoverage + suggestEdgeCases |
| 8 | `packages/api/src/services/test-agent-prompts.ts` | 신규 | 테스트 생성용 시스템 프롬프트 + vitest 컨벤션 |
| 9 | `packages/api/src/routes/agent.ts` | 수정 | 2개 엔드포인트 추가 (POST /agents/test/generate, POST /agents/test/coverage-gaps) |
| 10 | `packages/api/src/schemas/agent.ts` | 수정 | TestGenerationRequest/Result + CoverageGapRequest/Result 스키마 |
| 11 | `packages/api/src/services/agent-orchestrator.ts` | 수정 | test-generation → TestAgent 위임 로직 |
| 12 | `packages/api/src/__tests__/test-agent.test.ts` | 신규 | TestAgent 단위 테스트 15개+ |

### 3.2 구현 순서 (Agent Team 2-Worker 병렬)

```
Worker 1 (F138): ArchitectAgent
  Step 1: architect-prompts.ts — 시스템 프롬프트 3종 (analyze, review-design, dependencies)
  Step 2: architect-agent.ts — ArchitectAgent 서비스 (3 메서드 + JSON 파싱)
  Step 3: agent.ts schemas — Architecture 요청/응답 스키마 4종
  Step 4: agent.ts routes — POST /agents/architect/analyze + /review-design
  Step 5: architect-agent.test.ts — 15개+ 테스트

Worker 2 (F139): TestAgent
  Step 1: test-agent-prompts.ts — 시스템 프롬프트 3종 (generate, coverage, edge-cases)
  Step 2: test-agent.ts — TestAgent 서비스 (3 메서드 + JSON 파싱)
  Step 3: agent.ts schemas — Test 요청/응답 스키마 4종
  Step 4: agent.ts routes — POST /agents/test/generate + /coverage-gaps
  Step 5: test-agent.test.ts — 15개+ 테스트

리더:
  Step 1: Worker 완료 후 agent.ts routes/schemas merge (충돌 해소)
  Step 2: agent-orchestrator.ts 통합 — taskType 기반 에이전트 위임
  Step 3: 통합 검증 (typecheck + lint + test)
  Step 4: PDCA 분석 (gap-detector)
```

### 3.3 병렬 가능 분석

| 요소 | W1 (F138) | W2 (F139) | 충돌 |
|------|:---------:|:---------:|:----:|
| architect-agent.ts | ✅ 신규 | — | 없음 |
| architect-prompts.ts | ✅ 신규 | — | 없음 |
| test-agent.ts | — | ✅ 신규 | 없음 |
| test-agent-prompts.ts | — | ✅ 신규 | 없음 |
| agent.ts routes | ✅ 추가 | ✅ 추가 | ⚠️ 같은 파일 — 서로 다른 엔드포인트, 리더가 merge |
| agent.ts schemas | ✅ 추가 | ✅ 추가 | ⚠️ 같은 파일 — 서로 다른 스키마, 리더가 merge |
| agent-orchestrator.ts | — | — | 없음 — 리더 Step에서 양쪽 통합 |
| execution-types.ts | — | — | 없음 — 기존 타입 재활용 |

**충돌 전략**: Sprint 36과 동일. `agent.ts` routes/schemas에서 W1과 W2가 각각 다른 엔드포인트/스키마를 추가하므로, 리더가 Step 1에서 수동 merge. `agent-orchestrator.ts` 통합은 리더 전용.

---

## 4. 기술 설계 요약

### 4.1 F138 — ArchitectAgent 핵심 인터페이스

```typescript
interface ArchitectureAnalysisResult {
  impactSummary: string;
  designScore: number;          // 0-100
  dependencyAnalysis: {
    affectedModules: string[];
    circularDependencies: string[][];
    couplingScore: number;      // 0-100 (낮을수록 좋음)
  };
  riskAssessment: Array<{
    risk: string;
    severity: "critical" | "high" | "medium" | "low";
    mitigation: string;
  }>;
  recommendations: Array<{
    category: "structure" | "pattern" | "dependency" | "performance";
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

interface DesignReviewResult {
  completenessScore: number;    // 0-100
  consistencyScore: number;     // 0-100
  feasibilityScore: number;     // 0-100
  overallScore: number;
  missingElements: string[];
  inconsistencies: string[];
  suggestions: string[];
  tokensUsed: number;
  model: string;
}
```

### 4.2 F138 — ARCHITECT_SYSTEM_PROMPT (핵심)

```typescript
const ARCHITECT_SYSTEM_PROMPT = `You are an architecture reviewer for the Foundry-X platform.
Analyze the given code changes or design document and return a structured JSON response.

Evaluate against these criteria:
1. Module cohesion: Does each module have a single, well-defined responsibility?
2. Coupling: Are inter-module dependencies minimal and well-abstracted?
3. Design patterns: Are patterns applied correctly? Any anti-patterns?
4. Scalability: Will the architecture handle growth?
5. SDD compliance: Does it align with Spec-Driven Development principles?

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "impactSummary": "Brief architecture impact summary",
  "designScore": 0-100,
  "dependencyAnalysis": {
    "affectedModules": ["module names"],
    "circularDependencies": [["a", "b", "a"]],
    "couplingScore": 0-100
  },
  "riskAssessment": [
    { "risk": "description", "severity": "critical|high|medium|low", "mitigation": "suggestion" }
  ],
  "recommendations": [
    { "category": "structure|pattern|dependency|performance", "suggestion": "description", "priority": "high|medium|low" }
  ]
}`;
```

### 4.3 F139 — TestAgent 핵심 인터페이스

```typescript
interface TestGenerationResult {
  testFiles: Array<{
    path: string;
    content: string;
    testCount: number;
    framework: "vitest";
  }>;
  totalTestCount: number;
  coverageEstimate: number;     // 0-100
  edgeCases: Array<{
    function: string;
    case: string;
    category: "boundary" | "null" | "error" | "concurrency" | "type";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

interface CoverageGapResult {
  analyzedFiles: number;
  uncoveredFunctions: Array<{
    file: string;
    function: string;
    complexity: "simple" | "moderate" | "complex";
    priority: "high" | "medium" | "low";
  }>;
  missingEdgeCases: Array<{
    file: string;
    function: string;
    suggestedCases: string[];
  }>;
  overallCoverage: number;      // 0-100 추정치
}
```

### 4.4 F139 — TEST_GENERATION_PROMPT (핵심)

```typescript
const TEST_GENERATION_PROMPT = `You are a test engineer for the Foundry-X platform.
Generate vitest test code for the given source files.

PROJECT CONVENTIONS:
- Framework: vitest 3.x with TypeScript
- Pattern: describe() → it() blocks with clear naming
- Mock strategy: External services only — use actual implementations for internal modules
- D1 mock: In-memory SQLite via test helper (see existing patterns)
- Assertion: expect().toBe/toEqual/toContain — no chai
- File naming: {module}.test.ts in __tests__/ directory
- Import style: import { ... } from "../services/{module}.js"

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "testFiles": [
    {
      "path": "packages/api/src/__tests__/module.test.ts",
      "content": "import { describe, it, expect } from 'vitest'; ...",
      "testCount": 5,
      "framework": "vitest"
    }
  ],
  "totalTestCount": 5,
  "coverageEstimate": 85,
  "edgeCases": [
    { "function": "functionName", "case": "description", "category": "boundary|null|error" }
  ]
}`;
```

### 4.5 AgentOrchestrator 통합 패턴

```typescript
// agent-orchestrator.ts — executeTask 확장
async executeTask(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
  // 역할 에이전트 위임 (taskType 기반)
  switch (request.taskType) {
    case "spec-analysis":
      return this.architectAgent.analyzeArchitecture(request);
    case "test-generation":
      return this.testAgent.generateTests(request);
    case "code-review":
      // 기존 ReviewerAgent 경로 (변경 없음)
      break;
    default:
      // 범용 Runner 실행 (기존 로직)
      break;
  }
}
```

### 4.6 기존 에이전트 패턴 참조

| 패턴 | ReviewerAgent | PlannerAgent | ArchitectAgent (신규) | TestAgent (신규) |
|------|:---:|:---:|:---:|:---:|
| LLM 의존 | ✅ LLMService | ✅ API Key | ✅ createRoutedRunner | ✅ createRoutedRunner |
| 프롬프트 분리 | inline | planner-prompts.ts | architect-prompts.ts | test-agent-prompts.ts |
| JSON 파싱 | parseLlmJson | parseLlmJson | parseLlmJson 재사용 | parseLlmJson 재사용 |
| D1 저장 | ❌ | ✅ agent_plans | ❌ (결과만 반환) | ❌ (결과만 반환) |
| SSE 이벤트 | ❌ | ✅ plan.* | 선택 (후속) | 선택 (후속) |
| EvaluatorOptimizer | ❌ | ❌ | ✅ 연동 가능 | ✅ 연동 가능 |
| ModelRouter | ❌ (기존) | ❌ (기존) | ✅ spec-analysis→Opus | ✅ test-generation→Sonnet |

---

## 5. 테스트 계획

### F138 테스트 (architect-agent.test.ts, 15개+)

| # | 테스트 | 카테고리 |
|---|--------|----------|
| 1 | analyzeArchitecture — 변경 파일 기반 영향 분석 반환 | Happy path |
| 2 | analyzeArchitecture — 순환 의존성 감지 | Detection |
| 3 | analyzeArchitecture — designScore 0-100 범위 검증 | Validation |
| 4 | analyzeArchitecture — 빈 diff 시 기본 응답 | Edge case |
| 5 | analyzeArchitecture — LLM JSON 파싱 실패 시 폴백 | Error handling |
| 6 | reviewDesignDoc — 완전성/일관성/실현성 점수 반환 | Happy path |
| 7 | reviewDesignDoc — 누락 요소 감지 | Detection |
| 8 | reviewDesignDoc — 빈 문서 시 에러 | Edge case |
| 9 | analyzeDependencies — 모듈 그래프 구축 | Happy path |
| 10 | analyzeDependencies — 순환 참조 감지 + 경로 반환 | Detection |
| 11 | POST /agents/architect/analyze — 200 + 분석 결과 | API |
| 12 | POST /agents/architect/analyze — 잘못된 요청 400 | API |
| 13 | POST /agents/architect/analyze — 인증 없음 401 | API |
| 14 | POST /agents/architect/review-design — 200 + 리뷰 결과 | API |
| 15 | createRoutedRunner spec-analysis → Opus 모델 선택 확인 | Integration |

### F139 테스트 (test-agent.test.ts, 15개+)

| # | 테스트 | 카테고리 |
|---|--------|----------|
| 1 | generateTests — 변경 파일 기반 vitest 코드 생성 | Happy path |
| 2 | generateTests — testCount가 실제 it() 블록 수와 일치 | Validation |
| 3 | generateTests — 기존 테스트 패턴 반영 (mock 전략) | Convention |
| 4 | generateTests — 빈 diff 시 기본 응답 | Edge case |
| 5 | generateTests — LLM JSON 파싱 실패 시 폴백 | Error handling |
| 6 | analyzeCoverage — 테스트 없는 함수 감지 | Detection |
| 7 | analyzeCoverage — 기존 테스트 매칭 (*.test.ts 패턴) | Pattern matching |
| 8 | analyzeCoverage — 빈 파일 목록 시 기본 응답 | Edge case |
| 9 | suggestEdgeCases — 파라미터 타입 기반 엣지 케이스 | Happy path |
| 10 | suggestEdgeCases — nullable 파라미터 null 케이스 | Detection |
| 11 | POST /agents/test/generate — 200 + 테스트 코드 | API |
| 12 | POST /agents/test/generate — 잘못된 요청 400 | API |
| 13 | POST /agents/test/generate — 인증 없음 401 | API |
| 14 | POST /agents/test/coverage-gaps — 200 + 갭 분석 | API |
| 15 | createRoutedRunner test-generation → Sonnet 모델 선택 확인 | Integration |

---

## 6. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| agent.ts routes/schemas 양쪽 Worker 동시 수정 | Merge 충돌 | Sprint 36과 동일 전략: 리더가 수동 merge |
| ArchitectAgent 프롬프트 품질 — 아키텍처 분석 정확도 | 낮은 designScore 신뢰도 | Mock 기반 단위 테스트 우선, 프로덕션 LLM 연동은 후속 |
| TestAgent vitest 컨벤션 주입 복잡도 | 생성 테스트가 프로젝트 패턴과 불일치 | 기존 테스트 파일을 프롬프트 예시로 주입 (few-shot) |
| agent-orchestrator.ts 위임 로직 양쪽 Worker 충돌 | Orchestrator 통합 오류 | Orchestrator 수정은 리더 전용 Step — Worker는 수정 금지 |
| Sprint 36 커밋이 merge 전 | Worker가 S36 코드 참조 불가 | Sprint 36 커밋 확인 후 Worker 시작, 또는 master HEAD 기준 |

---

## 7. Agent Team Worker 프롬프트 가이드

### Worker 1 (F138) — 핵심 지시사항

```
[목표] ArchitectAgent 서비스 구현 — 아키텍처 분석 + 설계 문서 리뷰 + 의존성 분석

[참조 패턴]
- ReviewerAgent: packages/api/src/services/reviewer-agent.ts (LLM 프롬프트 + JSON 파싱)
- PlannerAgent: packages/api/src/services/planner-agent.ts (FileContextCollector 사용)
- prompt-utils.ts: parseLlmJson() 함수 재사용

[수정 허용 파일]
- packages/api/src/services/architect-agent.ts (신규)
- packages/api/src/services/architect-prompts.ts (신규)
- packages/api/src/routes/agent.ts (엔드포인트 추가만)
- packages/api/src/schemas/agent.ts (스키마 추가만)
- packages/api/src/__tests__/architect-agent.test.ts (신규)

[수정 금지] CLAUDE.md, SPEC.md, INDEX.md, agent-orchestrator.ts, 기타 모든 파일
```

### Worker 2 (F139) — 핵심 지시사항

```
[목표] TestAgent 서비스 구현 — 테스트 자동 생성 + 커버리지 갭 분석 + 엣지 케이스 추천

[참조 패턴]
- ReviewerAgent: packages/api/src/services/reviewer-agent.ts (LLM 프롬프트 + JSON 파싱)
- prompt-utils.ts: parseLlmJson() 함수 재사용
- 기존 테스트 파일 패턴: packages/api/src/__tests__/*.test.ts

[수정 허용 파일]
- packages/api/src/services/test-agent.ts (신규)
- packages/api/src/services/test-agent-prompts.ts (신규)
- packages/api/src/routes/agent.ts (엔드포인트 추가만)
- packages/api/src/schemas/agent.ts (스키마 추가만)
- packages/api/src/__tests__/test-agent.test.ts (신규)

[수정 금지] CLAUDE.md, SPEC.md, INDEX.md, agent-orchestrator.ts, 기타 모든 파일
```
