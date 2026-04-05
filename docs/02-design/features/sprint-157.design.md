---
code: FX-DSGN-S157
title: Sprint 157 Design — 리포트 5탭 + 팀 검토 Handoff + 공유/PDF Export
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair
---

# Sprint 157 Design — F348 + F349 + F350

## 1. 개요

Sprint 156에서 구축한 9탭 리포트 프레임(`discovery-report.tsx`)의 ComingSoon placeholder 5개(2-5~2-9)를 실제 탭 컴포넌트로 교체하고, 팀 검토 Handoff 패널과 공유/PDF Export 기능을 추가한다.

## 2. 데이터 타입 설계 (packages/shared)

### 2.1 탭 2-5: OpportunityScoringData
```typescript
export interface OpportunityScoringData {
  iceMatrix?: Array<{
    opportunity: string;
    impact: number;      // 1-10
    confidence: number;  // 1-10
    ease: number;        // 1-10
    totalScore: number;
  }>;
  goNoGoGate?: Array<{
    criterion: string;
    passed: boolean;
    note?: string;
  }>;
  recommendation?: string;
}
```

### 2.2 탭 2-6: CustomerPersonaData
```typescript
export interface CustomerPersonaData {
  personas?: Array<{
    name: string;
    role: string;
    demographics: string;
    goals: string[];
    painPoints: string[];
    behaviors: string[];
    quote?: string;
  }>;
  journeySteps?: Array<{
    stage: string;
    action: string;
    emotion: string;   // positive | neutral | negative
    touchpoint: string;
    opportunity: string;
  }>;
}
```

### 2.3 탭 2-7: BusinessModelData
```typescript
export interface BusinessModelData {
  bmc?: {
    keyPartners: string[];
    keyActivities: string[];
    keyResources: string[];
    valuePropositions: string[];
    customerRelationships: string[];
    channels: string[];
    customerSegments: string[];
    costStructure: string[];
    revenueStreams: string[];
  };
  unitEconomics?: {
    cac: number;
    ltv: number;
    arpu: number;
    grossMargin: number;
    paybackMonths: number;
    metrics: Array<{ label: string; value: string; unit: string }>;
  };
  revenueScenarios?: Array<{
    scenario: string;  // optimistic | base | pessimistic
    year1: number;
    year2: number;
    year3: number;
    assumptions: string[];
  }>;
}
```

### 2.4 탭 2-8: PackagingData
```typescript
export interface PackagingData {
  gtmStrategy?: {
    beachhead: string;
    targetSegment: string;
    positioning: string;
    channels: string[];
    pricing?: string;
  };
  executiveSummary?: {
    problem: string;
    solution: string;
    uniqueValue: string;
    targetMarket: string;
    businessModel: string;
    askAmount?: string;
  };
  milestones?: Array<{
    phase: string;
    deliverables: string[];
    timeline: string;
    kpis: string[];
  }>;
}
```

### 2.5 탭 2-9: PersonaEvalResultData
```typescript
export interface PersonaEvalResultData {
  overallScore?: number;
  overallVerdict?: 'Go' | 'Conditional' | 'NoGo';
  radarAxes?: Array<{ axis: string; score: number }>;
  personaResults?: Array<{
    personaId: string;
    personaName: string;
    personaRole: string;
    verdict: 'Go' | 'Conditional' | 'NoGo';
    score: number;
    summary: string;
    concerns: string[];
    conditions: string[];
  }>;
  consensusSummary?: string;
}
```

### 2.6 TeamReview / ExecutiveSummary 타입
```typescript
export interface TeamReviewVote {
  id: string;
  reviewerId: string;
  reviewerName: string;
  decision: 'Go' | 'Hold' | 'Drop';
  comment: string;
  createdAt: string;
}

export interface ExecutiveSummaryData {
  oneLiner: string;
  problem: string;
  solution: string;
  market: string;
  competition: string;
  businessModel: string;
  recommendation: string;
  openQuestions: string[];
}

export interface HandoffCheckItem {
  id: string;
  label: string;
  checked: boolean;
  requiredForGo: boolean;
}
```

## 3. 컴포넌트 설계

### 3.1 F348 탭 컴포넌트 (5종)

모든 탭은 Sprint 156의 기존 패턴을 따른다:
- `Props: { data: unknown }`
- `parseData(raw: unknown): XxxData` 타입 변환
- `StepHeader` + `InsightBox` 공통 컴포넌트 활용
- 데이터 없을 시 "데이터가 아직 없어요" fallback 렌더링

| 컴포넌트 | 파일 경로 | 핵심 UI |
|---------|---------|---------|
| OpportunityScoringTab | `report/tabs/OpportunityScoringTab.tsx` | ICE 매트릭스 테이블(sortable) + Go/NoGo 게이트 체크리스트 |
| CustomerPersonaTab | `report/tabs/CustomerPersonaTab.tsx` | Persona 카드 그리드(2열) + Journey 플로우 |
| BusinessModelTab | `report/tabs/BusinessModelTab.tsx` | BMC 9블록 CSS Grid(3×3) + Unit Economics 카드 + 수익 시나리오 테이블 |
| PackagingTab | `report/tabs/PackagingTab.tsx` | GTM 전략 카드 + Executive Summary + 마일스톤 타임라인 |
| PersonaEvalResultTab | `report/tabs/PersonaEvalResultTab.tsx` | 종합 점수 배너(Go/Conditional/NoGo) + Recharts Radar + 페르소나별 아코디언 |

### 3.2 F349 팀 검토 컴포넌트 (4종)

| 컴포넌트 | 파일 경로 | 기능 |
|---------|---------|------|
| TeamReviewPanel | `report/TeamReviewPanel.tsx` | Go/Hold/Drop 라디오 버튼 + 코멘트 textarea + 제출 + 기존 투표 목록 |
| ExecutiveSummary | `report/ExecutiveSummary.tsx` | report_json 기반 1-pager 자동 생성 + 수동 편집 불가(읽기 전용) |
| DecisionRecord | `report/DecisionRecord.tsx` | 최종 결정(Go/Hold/Drop) + 사유 + 결정자 + 타임스탬프 |
| HandoffChecklist | `report/HandoffChecklist.tsx` | 형상화 진입 조건 체크리스트 (PRD 존재, 팀 승인, 리소스 확보 등) |

**API 호출 패턴**:
- 투표 조회: `GET /api/ax-bd/team-reviews/:itemId` (기존)
- 투표 제출: `POST /api/ax-bd/team-reviews/:itemId` (기존)
- Executive Summary: `GET /api/ax-bd/discovery-report/:itemId/summary` (신규)

### 3.3 F350 공유/PDF 컴포넌트 (2종)

| 컴포넌트 | 파일 경로 | 기능 |
|---------|---------|------|
| ShareReportButton | `report/ShareReportButton.tsx` | 기존 share-links API 호출 → 클립보드 복사 |
| ExportPdfButton | `report/ExportPdfButton.tsx` | html2canvas → jsPDF dynamic import → 다운로드 |

## 4. API 확장

### 4.1 Executive Summary 엔드포인트 (신규)

```
GET /api/ax-bd/discovery-report/:itemId/summary
```

- 기존 `discovery-report-service.ts`에 `generateSummary()` 메서드 추가
- report_json의 각 탭 핵심 데이터를 추출하여 ExecutiveSummaryData 형태로 반환
- AI 호출 없이 rule-based 집계 (비용 절약)

### 4.2 기존 라우트 활용 (수정 없음)

- `team-reviews.ts`: GET/POST 이미 구현됨 (Sprint 154)
- `share-links.ts`: POST/GET/DELETE 이미 구현됨 (Sprint 79)
- `discovery-report.ts`: GET 이미 구현됨 (Sprint 156)

## 5. discovery-report.tsx 수정 사항

### 5.1 lazy import 교체
```typescript
// Sprint 157: 나머지 5탭
const OpportunityScoringTab = lazy(() => import("@/components/feature/discovery/report/tabs/OpportunityScoringTab"));
const CustomerPersonaTab = lazy(() => import("@/components/feature/discovery/report/tabs/CustomerPersonaTab"));
const BusinessModelTab = lazy(() => import("@/components/feature/discovery/report/tabs/BusinessModelTab"));
const PackagingTab = lazy(() => import("@/components/feature/discovery/report/tabs/PackagingTab"));
const PersonaEvalResultTab = lazy(() => import("@/components/feature/discovery/report/tabs/PersonaEvalResultTab"));
```

### 5.2 ComingSoon → 실제 컴포넌트 교체
```typescript
<TabsContent value="2-5"><OpportunityScoringTab data={report.tabs["2-5"]} /></TabsContent>
<TabsContent value="2-6"><CustomerPersonaTab data={report.tabs["2-6"]} /></TabsContent>
<TabsContent value="2-7"><BusinessModelTab data={report.tabs["2-7"]} /></TabsContent>
<TabsContent value="2-8"><PackagingTab data={report.tabs["2-8"]} /></TabsContent>
<TabsContent value="2-9"><PersonaEvalResultTab data={report.tabs["2-9"]} /></TabsContent>
```

### 5.3 헤더 영역 추가
- 팀 검토 섹션: 리포트 탭 아래에 별도 섹션으로 추가
- 공유/PDF 버튼: 헤더 우측에 배치

## 6. 테스트 계획

### 6.1 API 테스트
| 테스트 | 파일 |
|--------|------|
| Executive Summary 생성 | `__tests__/routes/executive-summary.test.ts` |

### 6.2 Web 컴포넌트 테스트
| 테스트 | 파일 |
|--------|------|
| 5탭 데이터 파싱 + 렌더링 | `__tests__/discovery-report-tabs.test.tsx` |
| TeamReviewPanel 투표 | `__tests__/team-review-panel.test.tsx` |
| ExportPdfButton | `__tests__/export-pdf.test.tsx` |

## 7. 디자인 시스템 토큰

| 탭 범위 | 토큰 | 값 |
|---------|------|-----|
| 2-5~2-7 | `--discovery-amber` | #f59e0b |
| 2-8 | `--discovery-red` | #f04452 |
| 2-9 | `--discovery-purple` | #8b5cf6 |
| Go 배지 | `--verdict-go` | #22c55e |
| Conditional 배지 | `--verdict-conditional` | #f59e0b |
| NoGo 배지 | `--verdict-nogo` | #ef4444 |

## 8. Gap Analysis 항목 (Design ↔ Implementation 검증용)

| # | 검증 항목 | 합격 기준 |
|---|---------|----------|
| 1 | OpportunityScoringTab 렌더링 | ICE 매트릭스 테이블 + Go/NoGo 게이트 표시 |
| 2 | CustomerPersonaTab 렌더링 | Persona 카드 + Journey 플로우 표시 |
| 3 | BusinessModelTab 렌더링 | BMC 9블록 Grid + Unit Economics 표시 |
| 4 | PackagingTab 렌더링 | GTM 전략 + Executive Summary 표시 |
| 5 | PersonaEvalResultTab 렌더링 | Radar 차트 + 판정 배너 + 페르소나 상세 |
| 6 | discovery-report.tsx lazy import | 5탭 모두 ComingSoon 대신 실제 컴포넌트 |
| 7 | Shared 타입 5종 | discovery-report.ts에 5개 인터페이스 export |
| 8 | TeamReviewPanel 투표 | Go/Hold/Drop 선택 + 코멘트 + 제출 동작 |
| 9 | ExecutiveSummary 표시 | report 데이터 기반 1-pager 렌더링 |
| 10 | DecisionRecord | 최종 결정 + 사유 + 타임스탬프 |
| 11 | HandoffChecklist | 형상화 진입 조건 체크리스트 |
| 12 | ShareReportButton | 공유 링크 생성 + 클립보드 복사 |
| 13 | ExportPdfButton | PDF 다운로드 동작 |
| 14 | Executive Summary API | GET /discovery-report/:itemId/summary 응답 |
| 15 | api-client.ts 함수 | fetchExecutiveSummary, fetchTeamReviews 존재 |
| 16 | TypeScript 컴파일 | turbo typecheck PASS |
| 17 | 테스트 통과 | 신규 테스트 파일 전체 PASS |
