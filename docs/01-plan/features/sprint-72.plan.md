---
code: FX-PLAN-072
title: "Sprint 72 Plan — F217 TestAgent 활성화"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 72
features: [F217]
req: [FX-REQ-209]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F217 TestAgent 활성화 — Web UI 연동 + 워크플로우 통합 |
| **Sprint** | 72 |
| **의존성** | F139 TestAgent 서비스 ✅, F216 리서치 ✅ |
| **목표** | Agent Dashboard에서 TestAgent 호출 UI + Orchestrator 실제 통합 + Sprint 워크플로우 트리거 |

| 관점 | 내용 |
|------|------|
| **Problem** | TestAgent API 2개 엔드포인트가 구현되어 있지만 Web UI 연동이 없어 실사용 불가 |
| **Solution** | TestAgentPanel 컴포넌트 + Agent Dashboard 카드 활성화 + Orchestrator executeTestGeneration 메서드 |
| **Function UX Effect** | Agent Dashboard에서 소스 코드 붙여넣기 → 테스트 코드 자동 생성 → 복사/다운로드 |
| **Core Value** | 6종 Agent 중 TestAgent 최초 활성화, 향후 나머지 Agent 활성화 패턴의 선례 |

---

## 1. 목표

1. **TestAgent Panel UI**: Agent Dashboard에서 TestAgent 전용 패널 — 소스 코드 입력 → 테스트 생성 + 커버리지 갭 분석
2. **Orchestrator 통합**: `agent-orchestrator.ts`에 `executeTestGeneration()` 메서드 추가, TestAgent를 오케스트레이션 흐름에 연결
3. **Agent Dashboard 카드**: TestAgent 카드를 활성 상태로 표시, 클릭 시 TestAgentPanel 진입
4. **Sprint 워크플로우 트리거**: Sprint 커밋 시 TestAgent API 자동 트리거 (선택적 UI 토글)

---

## 2. 범위

### In Scope

| 구분 | 항목 |
|------|------|
| 컴포넌트 | `TestAgentPanel.tsx` — 소스 코드 입력 + 테스트 생성 결과 표시 + 커버리지 갭 탭 |
| 컴포넌트 | `TestGenerationResult.tsx` — 생성된 vitest 코드 표시 + 복사 + 다운로드 |
| 컴포넌트 | `CoverageGapView.tsx` — 미커버 함수 목록 + 엣지케이스 추천 |
| 수정 | `agents/page.tsx` — TestAgent 카드 활성화 + TestAgentPanel 연결 |
| 수정 | `agent-orchestrator.ts` — `executeTestGeneration()` + `executeCoverageAnalysis()` 메서드 |
| 수정 | `api-client.ts` — `generateTests()` + `analyzeCoverageGaps()` 함수 |
| 수정 | `shared/agent.ts` — TestAgent 관련 응답 타입 추가 (TestGenerationResult, CoverageGapResult) |
| 테스트 | API 테스트: Orchestrator 통합 테스트 |
| 테스트 | Web 테스트: TestAgentPanel + TestGenerationResult + CoverageGapView |

### Out of Scope

| 항목 | 이유 |
|------|------|
| Monaco Editor 통합 | 1차 MVP는 textarea로 충분, 향후 개선 |
| 나머지 4종 Agent 활성화 | TestAgent 패턴 검증 후 Phase 5g에서 확장 |
| Agent SDK 연동 | Sprint 73 (F218) 범위 |
| CI/CD 파이프라인 통합 | Sprint 74 이후 |

---

## 3. 기술 설계 요약

### 3.1 Web 컴포넌트 구조

```
packages/web/src/components/feature/
├── TestAgentPanel.tsx          # 신규 — 탭 전환 (생성/커버리지)
├── TestGenerationResult.tsx    # 신규 — vitest 코드 표시 + 복사
└── CoverageGapView.tsx         # 신규 — 미커버 함수 + 엣지케이스
```

### 3.2 API 호출 흐름

```
[TestAgentPanel]
  ├── "테스트 생성" 클릭
  │   → POST /agents/test/generate
  │   → TestGenerationResult 표시
  │
  └── "커버리지 갭" 탭
      → POST /agents/test/coverage-gaps
      → CoverageGapView 표시
```

### 3.3 Orchestrator 통합

```typescript
// 기존: setter만 정의
setTestAgent(agent: TestAgent): void

// 추가: 실제 실행 메서드
async executeTestGeneration(sourceCode: string, options?: TestGenOptions): Promise<TestGenerationResult>
async executeCoverageAnalysis(sourceFiles: Record<string, string>, testFiles?: Record<string, string>): Promise<CoverageGapResult>
```

### 3.4 Shared Types 추가

```typescript
// packages/shared/src/agent.ts에 추가
export interface TestGenerationResult {
  testFiles: Array<{ path: string; content: string; testCount: number; framework: string }>;
  totalTestCount: number;
  coverageEstimate: number;
  edgeCases: Array<{ function: string; case: string; category: string }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface CoverageGapResult {
  analyzedFiles: number;
  uncoveredFunctions: Array<{ file: string; function: string; complexity: string; priority: string }>;
  missingEdgeCases: Array<{ file: string; function: string; suggestedCases: string[] }>;
  overallCoverage: number;
  tokensUsed: number;
  model: string;
}
```

---

## 4. 구현 순서

| 순서 | 작업 | 예상 변경 파일 |
|------|------|---------------|
| 1 | Shared Types 추가 | `packages/shared/src/agent.ts` |
| 2 | Orchestrator 메서드 추가 + 테스트 | `packages/api/src/services/agent-orchestrator.ts`, 테스트 |
| 3 | Web API Client 함수 추가 | `packages/web/src/lib/api-client.ts` |
| 4 | TestGenerationResult 컴포넌트 | `packages/web/src/components/feature/TestGenerationResult.tsx` |
| 5 | CoverageGapView 컴포넌트 | `packages/web/src/components/feature/CoverageGapView.tsx` |
| 6 | TestAgentPanel 컴포넌트 | `packages/web/src/components/feature/TestAgentPanel.tsx` |
| 7 | Agent Dashboard 카드 연결 | `packages/web/src/app/(app)/agents/page.tsx` |
| 8 | Web 컴포넌트 테스트 | `packages/web/src/__tests__/` |

---

## 5. 성공 기준

| 기준 | 측정 방법 |
|------|----------|
| Agent Dashboard에서 TestAgent 카드 표시 | UI 확인 |
| 소스 코드 입력 → 테스트 생성 결과 표시 | POST /agents/test/generate 호출 성공 |
| 커버리지 갭 분석 결과 표시 | POST /agents/test/coverage-gaps 호출 성공 |
| Orchestrator 통합 동작 | 단위 테스트 통과 |
| typecheck + lint + 기존 테스트 통과 | `turbo typecheck && turbo test` |

---

## 6. 리스크

| 리스크 | 완화 |
|--------|------|
| TestAgent LLM 응답이 vitest 비호환 | 프롬프트에 vitest 패턴 예시 주입 (기존 test-agent-prompts.ts 활용) |
| Agent Dashboard 기존 구조 변경 범위 | 카드 추가만, 기존 PlannerAgent 로직 미변경 |
| API 응답 시간 > 15초 | 로딩 상태 UI + 타임아웃 처리 |
