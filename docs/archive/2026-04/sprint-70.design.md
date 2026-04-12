---
code: FX-DSGN-070
title: "Sprint 70 Design — F214 Web Discovery 대시보드"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 70
features: [F214]
req: [FX-REQ-206]
plan: "[[FX-PLAN-070]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 92% |
| **신규 파일** | 10 (pages 2, components 5, tests 3) |
| **수정 파일** | 3 (api-client.ts, sidebar.tsx, getting-started/page.tsx) |
| **API 의존** | Sprint 69 (F213) — viability, traffic-light, commit-gate, analysis-path |

---

## 1. 아키텍처 개요

```
[사용자]
   │
   ▼
 /ax-bd/discovery              ← 프로세스 시각화 + 아이템 목록
 /ax-bd/discovery/[id]         ← 아이템별 상세 (신호등 + Commit Gate)
   │
   ▼ fetchApi / postApi
 GET /biz-items                 ← 아이템 목록 (discovery_type 포함)
 GET /biz-items/:id/analysis-path   ← 유형별 분석 경로
 GET /ax-bd/viability/checkpoints/:id ← 체크포인트 이력
 GET /ax-bd/viability/traffic-light/:id ← 누적 신호등
 GET /ax-bd/viability/commit-gate/:id   ← Commit Gate
 GET /ax-bd/evaluations?bizItemId=:id   ← 멀티페르소나 평가 결과
```

---

## 2. 페이지 구조

### 2.1 `/ax-bd/discovery/page.tsx` — 프로세스 대시보드

```
┌─────────────────────────────────────────────┐
│ [h1] Discovery 프로세스 v8.2                │
│ [subtitle] AX BD 2단계 발굴 — 5유형 × 7단계│
├─────────────────────────────────────────────┤
│ [ProcessFlowV82]                            │
│   2-0 분류 → 5유형 분기 → 2-1~2-7 → 2-8~10│
├─────────────────────────────────────────────┤
│ [TypeRoutingMatrix]                         │
│   I  M  P  T  S  ×  2-1~2-7 강도 매트릭스  │
├─────────────────────────────────────────────┤
│ [h2] 사업 아이템 현황                        │
│ ┌──────┬──────┬──────┬──────┐               │
│ │ 아이템│ 유형 │ 신호등│ 진행  │              │
│ │ ...  │ ...  │ 🟢🟡🔴│ 4/7  │              │
│ └──────┴──────┴──────┴──────┘               │
└─────────────────────────────────────────────┘
```

### 2.2 `/ax-bd/discovery/[id]/page.tsx` — 아이템 상세

```
┌─────────────────────────────────────────────┐
│ [← 뒤로] [h1] {아이템 제목}  [Badge: Type I]│
│ [TrafficLightPanel]                         │
│   ● Go 3  ● Pivot 1  ● Drop 0  → 🟡 Yellow│
│   타임라인: 2-1 ✅ → 2-2 ✅ → 2-3 ⏳ → ... │
├─────────────────────────────────────────────┤
│ [AnalysisPathStepper] (기존 컴포넌트 재사용) │
│   유형별 분석 경로 + 강도 표시               │
├─────────────────────────────────────────────┤
│ [CommitGateCard] (2-5 전용)                 │
│   4질문 + 최종 결정 (commit/explore/drop)    │
├─────────────────────────────────────────────┤
│ [EvaluationSummaryCard]                     │
│   멀티페르소나 평가 점수 + 종합 판정         │
└─────────────────────────────────────────────┘
```

---

## 3. 컴포넌트 상세

### 3.1 ProcessFlowV82.tsx

프로세스 v8.2 전체 흐름을 시각화하는 정적 컴포넌트.

```typescript
// 상수 데이터로 렌더링 (API 호출 없음)
const PROCESS_STAGES = [
  { id: "2-0", name: "사업 아이템 분류", description: "AI Agent 3턴 대화로 5유형 분류" },
  { id: "2-1", name: "레퍼런스 분석", group: "branch" },
  { id: "2-2", name: "수요 시장 검증", group: "branch" },
  { id: "2-3", name: "경쟁·자사 분석", group: "branch" },
  { id: "2-4", name: "사업 아이템 도출", group: "branch" },
  { id: "2-5", name: "핵심 아이템 선정", group: "branch", isCommitGate: true },
  { id: "2-6", name: "타겟 고객 정의", group: "branch" },
  { id: "2-7", name: "비즈니스 모델 정의", group: "branch" },
  { id: "2-8", name: "패키징", group: "common" },
  { id: "2-9", name: "AI 멀티페르소나 평가", group: "common" },
  { id: "2-10", name: "최종 보고서", group: "common" },
];
```

UI: 카드 기반 흐름도, 2-0에서 5갈래 분기 표시, HITL 뱃지 포함.

### 3.2 TypeRoutingMatrix.tsx

5유형 × 7단계 강도 매트릭스 테이블.

```typescript
interface TypeRoutingMatrixProps {
  selectedType?: DiscoveryType; // 선택된 유형 강조
}
// ANALYSIS_PATH_MAP 데이터를 테이블로 렌더링
// 강도별 색상: core → blue bg, normal → gray bg, light → transparent
```

### 3.3 TrafficLightPanel.tsx

```typescript
interface TrafficLightPanelProps {
  trafficLight: {
    bizItemId: string;
    summary: { go: number; pivot: number; drop: number; pending: number };
    commitGate: { decision: string; decidedAt: string } | null;
    checkpoints: Array<{
      stage: string;
      decision: string;
      question: string;
      reason?: string;
      decidedAt: string;
    }>;
    overallSignal: "green" | "yellow" | "red";
  };
}
```

UI: 원형 신호등 + 3색 카운트 카드 + 체크포인트 타임라인.

### 3.4 CommitGateCard.tsx

```typescript
interface CommitGateCardProps {
  gate: {
    question1Answer?: string;
    question2Answer?: string;
    question3Answer?: string;
    question4Answer?: string;
    finalDecision: "commit" | "explore_alternatives" | "drop";
    reason?: string;
    decidedAt: string;
  } | null;
}
```

### 3.5 EvaluationSummaryCard.tsx

```typescript
interface EvaluationSummaryCardProps {
  bizItemId: string;
  evaluations: Array<{
    id: string;
    evaluatorType: string;
    score: number;
    verdict: string;
    summary: string;
  }>;
}
```

---

## 4. API 클라이언트 추가 (api-client.ts)

```typescript
// ─── Sprint 70: Viability API Types (F214) ───

export interface ViabilityCheckpoint {
  id: string;
  bizItemId: string;
  orgId: string;
  stage: string;
  decision: "go" | "pivot" | "drop";
  question: string;
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface TrafficLightResponse {
  bizItemId: string;
  summary: { go: number; pivot: number; drop: number; pending: number };
  commitGate: { decision: string; decidedAt: string } | null;
  checkpoints: ViabilityCheckpoint[];
  overallSignal: "green" | "yellow" | "red";
}

export interface CommitGateResponse {
  id: string;
  bizItemId: string;
  question1Answer: string | null;
  question2Answer: string | null;
  question3Answer: string | null;
  question4Answer: string | null;
  finalDecision: "commit" | "explore_alternatives" | "drop";
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface AnalysisPathResponse {
  discoveryType: string;
  typeName: string;
  stages: Array<{
    stage: string;
    stageName: string;
    intensity: "core" | "normal" | "light";
    question: string;
  }>;
  commitGateQuestions: string[];
}

export async function getTrafficLight(bizItemId: string): Promise<TrafficLightResponse> {
  return fetchApi(`/ax-bd/viability/traffic-light/${bizItemId}`);
}

export async function getCommitGate(bizItemId: string): Promise<CommitGateResponse> {
  return fetchApi(`/ax-bd/viability/commit-gate/${bizItemId}`);
}

export async function getViabilityCheckpoints(bizItemId: string): Promise<{ checkpoints: ViabilityCheckpoint[] }> {
  return fetchApi(`/ax-bd/viability/checkpoints/${bizItemId}`);
}

export async function getAnalysisPath(bizItemId: string): Promise<AnalysisPathResponse> {
  return fetchApi(`/biz-items/${bizItemId}/analysis-path`);
}
```

---

## 5. 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `components/sidebar.tsx` | AX BD 그룹에 "Discovery 프로세스" 메뉴 추가 (Map icon) |
| `lib/api-client.ts` | Viability/TrafficLight/CommitGate/AnalysisPath 타입 + 함수 |
| `(app)/getting-started/page.tsx` | AX BD Discovery 퀵스타트 카드 추가 |

---

## 6. 테스트 계획

| 테스트 파일 | 대상 | 예상 케이스 |
|------------|------|-----------|
| `ProcessFlowV82.test.tsx` | ProcessFlowV82 | 렌더링, 단계 표시, HITL 뱃지 (~5) |
| `TrafficLightPanel.test.tsx` | TrafficLightPanel | green/yellow/red 신호, 타임라인 (~6) |
| `discovery-page.test.tsx` | 페이지 통합 | 목록 렌더링, 유형 필터, 라우팅 (~8) |

**총 예상**: ~19 tests
