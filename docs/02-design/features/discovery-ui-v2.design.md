# Discovery UI/UX 고도화 v2 Design Document

> **Summary**: 멀티 페르소나 평가(2-9) + 9탭 리포트 + 강도 라우팅 + 팀 검토 — 4 Sprint 구현 설계
>
> **Project**: Foundry-X
> **Version**: Phase 15 (Sprint 154~157)
> **Author**: Sinclair Seo
> **Date**: 2026-04-05
> **Status**: Draft
> **Planning Doc**: [discovery-ui-v2.plan.md](../../01-plan/features/discovery-ui-v2.plan.md)
> **PRD**: [prd-final.md](../../specs/fx-discovery-ui-v2/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

- 기존 Discovery Wizard(F263~F270) 코드를 변경하지 않고 **확장(extend)** 으로 기능 추가
- AXIS DS 토큰 체계 위에 `--discovery-*` 시맨틱 토큰만 확장
- 4 Sprint 각각이 독립 동작하는 결과물을 산출 (점진적 전달)
- Gap Analysis Match Rate ≥ 90% 목표

### 1.2 Design Principles

- **Extend, Don't Modify**: 기존 컴포넌트에 props 추가만, 내부 로직 변경 없음
- **Data-Driven Rendering**: output_json → Zod 검증 → 컴포넌트 렌더링 (비정형 fallback 포함)
- **Progressive Enhancement**: 데모 모드 → API 키 입력 → 실제 평가 (graceful degradation)
- **Lazy Loading**: 9탭 리포트 각 탭을 React.lazy()로 코드 스플리팅

---

## 2. Architecture

### 2.1 Component Diagram

```
packages/web/src/
├── components/feature/discovery/
│   ├── (기존 유지)
│   │   ├── DiscoveryWizard.tsx      ← onNavigateStage prop 추가만
│   │   └── WizardStepDetail.tsx     ← intensity, onSkip props 추가만
│   │
│   ├── intensity/                   ← [F343] 신규
│   │   ├── IntensityIndicator.tsx   — ★핵심/○보통/△간소 뱃지
│   │   ├── IntensityMatrix.tsx      — 5유형×7단계 매트릭스 시각화
│   │   └── SkipStepOption.tsx       — 간소 단계 스킵 UI
│   │
│   ├── persona/                     ← [F344~F345] 신규
│   │   ├── PersonaCardGrid.tsx      — 8개 페르소나 카드 2×4 그리드
│   │   ├── WeightSliderPanel.tsx    — 7축 가중치 탭+슬라이더+합계 보정
│   │   ├── ContextEditor.tsx        — 좌측 리스트 + 우측 폼 Split Pane
│   │   ├── BriefingInput.tsx        — 자동 요약 + 수동 편집
│   │   ├── EvalProgress.tsx         — 8단계 순차 프로그레스 (SSE)
│   │   ├── EvalResults.tsx          — 종합 점수 + 판정 + Radar + 요약
│   │   └── PersonaEvalPage.tsx      — 2-9 전용 라우트 페이지
│   │
│   ├── report/                      ← [F346~F348] 신규
│   │   ├── common/
│   │   │   ├── StepHeader.tsx       — 단계 번호 + 제목 + 태그
│   │   │   ├── InsightBox.tsx       — gradient bg + left-border 인사이트
│   │   │   ├── MetricCard.tsx       — 큰 숫자 + 라벨 카드
│   │   │   ├── NextStepBox.tsx      — dashed border + 다음 연결 안내
│   │   │   └── HitlBadge.tsx        — green dot + 검증 완료 상태
│   │   ├── tabs/
│   │   │   ├── ReferenceAnalysisTab.tsx    — 2-1
│   │   │   ├── MarketValidationTab.tsx     — 2-2 (TAM 도넛)
│   │   │   ├── CompetitiveLandscapeTab.tsx — 2-3 (Porter Radar)
│   │   │   ├── OpportunityIdeationTab.tsx  — 2-4 (BMC 그리드)
│   │   │   ├── OpportunityScoringTab.tsx   — 2-5 (ICE 매트릭스)
│   │   │   ├── CustomerPersonaTab.tsx      — 2-6 (Persona 카드)
│   │   │   ├── BusinessModelTab.tsx        — 2-7 (Unit Economics)
│   │   │   ├── PackagingTab.tsx            — 2-8 (GTM 전략)
│   │   │   └── PersonaEvalResultTab.tsx    — 2-9 (Radar 차트)
│   │   └── DiscoveryReport.tsx      — 9탭 프레임 + Lazy 로딩
│   │
│   └── review/                      ← [F349~F350] 신규
│       ├── TeamReviewPanel.tsx      — Go/Hold/Drop 투표 + 코멘트
│       ├── ExecutiveSummary.tsx     — 1-Pager 자동 생성
│       ├── DecisionRecord.tsx       — 최종 결정 + 사유 + 타임스탬프
│       ├── HandoffChecklist.tsx     — 형상화 진입 조건 체크리스트
│       └── ShareExport.tsx          — 공유 링크 + PDF Export
│
├── routes/ax-bd/
│   ├── discovery-report.tsx         ← [F346] 신규 라우트
│   └── persona-eval.tsx             ← [F344] 신규 라우트

packages/api/src/
├── db/migrations/
│   ├── 0096_persona_configs.sql     ← [F342] 신규
│   ├── 0097_persona_evals.sql       ← [F342] 신규
│   ├── 0098_discovery_reports.sql   ← [F342] 신규
│   └── 0099_team_reviews.sql        ← [F342] 신규
│
├── services/
│   ├── persona-config-service.ts    ← [F342] 신규
│   ├── persona-eval-service.ts      ← [F342] 신규
│   ├── discovery-report-service.ts  ← [F342] 신규
│   └── team-review-service.ts       ← [F349] 신규
│
├── schemas/
│   ├── persona-config.ts            ← [F342] 신규
│   ├── persona-eval.ts              ← [F342] 신규
│   ├── discovery-report.ts          ← [F342] 신규
│   └── team-review.ts               ← [F349] 신규
│
└── routes/
    ├── ax-bd-persona-config.ts      ← [F342] 신규
    ├── ax-bd-persona-eval.ts        ← [F345] 신규
    ├── ax-bd-discovery-report.ts    ← [F346] 신규
    └── ax-bd-team-review.ts         ← [F349] 신규
```

### 2.2 Data Flow

```
[스킬 실행]                    [멀티 페르소나 평가]               [리포트 + 팀 검토]
    │                               │                               │
    ▼                               ▼                               ▼
ax_discovery_outputs          ax_persona_configs              ax_discovery_reports
  (output_json)               (weights, context)              (report_json, verdict)
    │                               │                               │
    │    ┌──────────────────┐       │                               │
    └───▶│ BriefingInput    │◀──────┘                               │
         │ (자동 요약)       │                                       │
         └────────┬─────────┘                                       │
                  ▼                                                 │
         ┌──────────────────┐                                       │
         │ Claude SSE API   │                                       │
         │ (8 페르소나 순차) │                                       │
         └────────┬─────────┘                                       │
                  ▼                                                 │
         ax_persona_evals ──────────────────────────────────────────┘
         (scores, verdict)           │
                                     ▼
                              ┌──────────────────┐
                              │ TeamReviewPanel   │
                              │ (Go/Hold/Drop)    │
                              └────────┬──────────┘
                                       ▼
                              ax_team_reviews
                              (decision, comment)
                                       │
                                       ▼
                              [형상화 3단계 Handoff]
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| PersonaEvalPage | PersonaConfigService, Claude API | 평가 설정 + AI 호출 |
| DiscoveryReport | DiscoveryReportService | 9탭 데이터 집계 |
| EvalResults | recharts (Radar, Bar) | 차트 시각화 |
| ShareExport | html2canvas | PDF 생성 |
| TeamReviewPanel | TeamReviewService | 투표 CRUD |
| IntensityIndicator | WizardStepDetail (props) | 강도 표시 |

---

## 3. Data Model

### 3.1 D1 Migration 0096: ax_persona_configs

```sql
-- 0096_persona_configs.sql
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,                    -- biz_items.id 참조
  persona_id TEXT NOT NULL,                 -- 'ax-expert'|'customer'|'ceo'|'biz-planning'|'ax-head'|'sales'|'execution'|'kt-group'
  weights TEXT NOT NULL DEFAULT '{}',       -- JSON: { roi: 15, strategy: 10, finance: 15, gtm: 25, tech: 15, risk: 10, synergy: 10 }
  context_json TEXT NOT NULL DEFAULT '{}',  -- JSON: { situation, priority, style, redlines[] }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, item_id, persona_id)
);
CREATE INDEX idx_persona_configs_item ON ax_persona_configs(tenant_id, item_id);
```

### 3.2 D1 Migration 0097: ax_persona_evals

```sql
-- 0097_persona_evals.sql
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',       -- JSON: { roi, strategy, finance, gtm, tech, risk, synergy } 각 0~100
  weighted_score REAL DEFAULT 0,           -- 가중 합산 점수
  verdict TEXT DEFAULT 'pending',          -- 'go'|'conditional'|'nogo'|'pending'
  summary TEXT DEFAULT '',                 -- 한줄 요약
  concern TEXT DEFAULT '',                 -- 핵심 우려사항
  condition TEXT DEFAULT '',               -- conditional 시 조건
  raw_response TEXT DEFAULT '',            -- Claude 원문 (감사용)
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, item_id, persona_id, version)
);
CREATE INDEX idx_persona_evals_item ON ax_persona_evals(tenant_id, item_id);
```

### 3.3 D1 Migration 0098: ax_discovery_reports

```sql
-- 0098_discovery_reports.sql
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  report_json TEXT NOT NULL DEFAULT '{}',  -- JSON: 9탭 데이터 (각 탭별 구조화)
  overall_score REAL DEFAULT 0,            -- 종합 점수
  overall_verdict TEXT DEFAULT 'pending',  -- 'go'|'conditional'|'nogo'|'pending'
  team_decision TEXT DEFAULT NULL,         -- 'go'|'hold'|'drop' (팀 최종)
  decided_by TEXT DEFAULT NULL,            -- 결정자 user_id
  decided_at TEXT DEFAULT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_discovery_reports_item ON ax_discovery_reports(tenant_id, item_id);
```

### 3.4 D1 Migration 0099: ax_team_reviews

```sql
-- 0099_team_reviews.sql
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  report_id TEXT NOT NULL,                 -- ax_discovery_reports.id 참조
  reviewer_id TEXT NOT NULL,               -- users.id 참조
  decision TEXT NOT NULL,                  -- 'go'|'hold'|'drop'
  comment TEXT DEFAULT '',
  version INTEGER DEFAULT 1,              -- optimistic locking
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, report_id, reviewer_id)
);
CREATE INDEX idx_team_reviews_report ON ax_team_reviews(tenant_id, report_id);
```

### 3.5 Entity Relationships

```
[biz_items] 1 ──── N [ax_persona_configs]   (아이템별 페르소나 설정)
     │      1 ──── N [ax_persona_evals]     (아이템별 평가 결과)
     │      1 ──── 1 [ax_discovery_reports]  (아이템별 통합 리포트)
     │
[ax_discovery_reports] 1 ──── N [ax_team_reviews]  (리포트별 팀원 투표)
     │
[biz_item_discovery_stages] → output_json → 리포트 데이터 소스
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | F-item |
|--------|------|-------------|------|--------|
| GET | /ax-bd/persona-configs/:itemId | 아이템의 페르소나 설정 조회 | Required | F342 |
| PUT | /ax-bd/persona-configs/:itemId | 페르소나 설정 저장/갱신 | Required | F342 |
| POST | /ax-bd/persona-eval | 멀티 페르소나 평가 실행 (SSE) | Required | F345 |
| GET | /ax-bd/persona-evals/:itemId | 아이템의 평가 결과 조회 | Required | F342 |
| GET | /ax-bd/discovery-report/:itemId | 통합 리포트 조회 (9탭 데이터 자동 집계) | Required | F346 |
| POST | /ax-bd/discovery-report/:itemId/generate | 리포트 생성/재생성 | Required | F346 |
| GET | /ax-bd/team-reviews/:reportId | 팀 투표 현황 조회 | Required | F349 |
| POST | /ax-bd/team-reviews/:reportId | 투표 등록/변경 | Required | F349 |
| POST | /ax-bd/team-reviews/:reportId/decide | 팀장 최종 결정 | Required | F349 |
| POST | /ax-bd/discovery-report/:itemId/share | 공유 토큰 생성 | Required | F350 |
| GET | /ax-bd/shared-report/:token | 공유 링크로 리포트 조회 | Public | F350 |

### 4.2 핵심 API 상세

#### `POST /ax-bd/persona-eval` (SSE)

평가 실행. 8 페르소나를 **클라이언트 주도 순차 호출**로 처리 (Workers 30초 타임아웃 우회).

**Request:**
```json
{
  "itemId": "string",
  "personaId": "string",  // 1명씩 개별 호출
  "weights": { "roi": 15, "strategy": 10, ... },
  "context": { "situation": "...", "priority": "...", ... },
  "briefing": "string"    // 2-1~2-8 결과 요약
}
```

**Response (SSE Stream):**
```
event: progress
data: {"status": "evaluating", "persona": "ax-expert", "step": 1}

event: result
data: {"scores": {"roi": 82, ...}, "verdict": "go", "summary": "...", "concern": "...", "condition": ""}

event: done
data: {"personaId": "ax-expert", "savedId": "uuid"}
```

**Client-side 순차 호출 패턴:**
```typescript
// PersonaEvalPage.tsx
for (const persona of PERSONAS) {
  const response = await fetch('/ax-bd/persona-eval', {
    method: 'POST',
    body: JSON.stringify({ itemId, personaId: persona.id, weights, context, briefing }),
  });
  // SSE 스트리밍으로 진행상황 표시
  for await (const event of readSSE(response)) {
    updateProgress(persona.id, event);
  }
}
```

#### `GET /ax-bd/discovery-report/:itemId`

9탭 데이터 자동 집계. `biz_item_discovery_stages` + `ax_discovery_outputs` + `ax_persona_evals`에서 데이터를 모아 `report_json`에 캐싱.

**Response:**
```json
{
  "id": "uuid",
  "itemId": "uuid",
  "overallScore": 73.2,
  "overallVerdict": "conditional",
  "teamDecision": null,
  "tabs": {
    "2-1": { "title": "레퍼런스 분석", "data": { ... }, "hitlStatus": "approved" },
    "2-2": { "title": "수요 시장 검증", "data": { ... }, "hitlStatus": "approved" },
    ...
    "2-9": { "title": "멀티 페르소나 평가", "data": { ... } }
  },
  "generatedAt": "2026-04-05T..."
}
```

---

## 5. UI/UX Design

### 5.1 화면 1: 유형별 강도 라우팅 [F343]

```
┌──────────────────────────────────────────────────────────┐
│  Type S · 기존서비스형  식봄 → KT DS Fooding              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                          │
│  ┌─ 2-1 ─┐ ┌─ 2-2 ─┐ ┌─ 2-3 ─┐ ┌─ 2-4 ─┐ ... ┌─ 2-7 ─┐│
│  │★ 핵심 │ │ △간소 │ │★ 핵심 │ │★ 핵심 │     │★ 핵심 ││
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘     └───┬───┘│
│      ●─────────●─────────●─────────●─── ... ─────●     │
│      ▲ 현재                                              │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Step 2-1 레퍼런스 분석  [★ 핵심 — 3레이어 해부]     ││
│  │  방법론: Competitive Analysis · 3-Layer · JTBD       ││
│  │  적용 스킬: [🔵 competitor] [🟠 ecosystem] ...       ││
│  │                                                      ││
│  │  △간소 → [스킵 가능]                                 ││
│  │  HITL ┃ [✅ 승인] [✏️ 수정] [🔄 재실행] [⏭ 스킵]  ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**IntensityIndicator 컴포넌트 props:**
```typescript
interface IntensityIndicatorProps {
  intensity: 'core' | 'normal' | 'light';  // ★핵심/○보통/△간소
  itemType: 'I' | 'M' | 'P' | 'T' | 'S';
  stageNum: string;  // '2-1' ~ '2-7'
}
```

**강도 매트릭스 데이터 (상수):**
```typescript
const INTENSITY_MATRIX: Record<string, Record<string, 'core'|'normal'|'light'>> = {
  'I': { '2-1': 'light', '2-2': 'core', '2-3': 'normal', '2-4': 'core', '2-5': 'core', '2-6': 'core', '2-7': 'normal' },
  'M': { '2-1': 'normal', '2-2': 'core', '2-3': 'core', '2-4': 'normal', '2-5': 'core', '2-6': 'core', '2-7': 'normal' },
  'P': { '2-1': 'light', '2-2': 'core', '2-3': 'core', '2-4': 'core', '2-5': 'core', '2-6': 'core', '2-7': 'core' },
  'T': { '2-1': 'core', '2-2': 'core', '2-3': 'core', '2-4': 'core', '2-5': 'core', '2-6': 'normal', '2-7': 'normal' },
  'S': { '2-1': 'core', '2-2': 'light', '2-3': 'core', '2-4': 'core', '2-5': 'normal', '2-6': 'normal', '2-7': 'core' },
};
```

### 5.2 화면 2: AI 멀티 페르소나 평가 [F344~F345]

```
┌──────────────────────────────────────────────────────────┐
│  2-9 AI 멀티 페르소나 사전 평가                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ... (×8)          │
│  │AX전문│ │고객사 │ │대표  │ │경영기획│                    │
│  │76.2  │ │68.4  │ │82.1  │ │71.3  │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                          │
│  ┌─ 가중치 (Layer 1) ──────────────────────────────────┐ │
│  │ 고객 ROI     ━━━━━━━━━━━━━━○─────── 30%             │ │
│  │ 전략 정렬도  ━━━○─────────────────── 05%             │ │
│  │ GTM 현실성   ━━━━━━━━━━━━━━━━━━━○── 35%             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ 평가 실행 ─────────────────────────────────────────┐ │
│  │ 📋 브리핑 (2-1~2-8 자동 요약)                       │ │
│  │                              [▶ 평가 실행]          │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Zustand Store (persona-eval-store.ts):**
```typescript
interface PersonaEvalStore {
  // 설정
  weights: Record<string, Record<string, number>>;  // persona → axis → weight
  contexts: Record<string, PersonaContext>;
  briefing: string;

  // 평가 상태
  evalStatus: Record<string, 'idle'|'evaluating'|'done'|'error'>;
  evalResults: Record<string, PersonaEvalResult>;
  overallScore: number | null;
  overallVerdict: 'go'|'conditional'|'nogo'|null;

  // 액션
  setWeight: (personaId: string, axis: string, value: number) => void;
  normalizeWeights: (personaId: string) => void;  // 합계 100% 보정
  startEval: (itemId: string) => Promise<void>;
  resetEval: () => void;
}
```

**8 페르소나 정의 (상수):**
```typescript
const PERSONAS = [
  { id: 'ax-expert', name: 'AX 전문가', color: '#3182f6', title: '사업개발 전문가', keyValue: 'GTM 현실성', first: true },
  { id: 'customer', name: '고객사', color: '#00b493', title: '잠재 고객', keyValue: '고객 ROI' },
  { id: 'ceo', name: 'KT DS 대표', color: '#6c63ff', title: '경영진', keyValue: '전략 정렬' },
  { id: 'biz-planning', name: '경영기획', color: '#f59e0b', title: '재무 분석가', keyValue: '재무 타당성' },
  { id: 'ax-head', name: 'AX 본부장', color: '#8b5cf6', title: '사업 총괄', keyValue: '전략 부합' },
  { id: 'sales', name: '영업', color: '#22c55e', title: '현장 영업', keyValue: '고객 니즈' },
  { id: 'execution', name: '수행', color: '#f04452', title: '프로젝트 수행', keyValue: '기술 실현성' },
  { id: 'kt-group', name: 'KT그룹', color: '#e8321a', title: '그룹 시너지', keyValue: '그룹 연계', kt: true },
] as const;
```

**7 평가축:**
```typescript
const EVAL_AXES = [
  { id: 'roi', label: '고객 ROI', sub: 'Customer ROI' },
  { id: 'strategy', label: '전략 정렬도', sub: 'Strategic Alignment' },
  { id: 'finance', label: '재무 타당성', sub: 'Financial Viability' },
  { id: 'gtm', label: 'GTM 현실성', sub: 'Go-to-Market' },
  { id: 'tech', label: '기술 실현성', sub: 'Technical Feasibility' },
  { id: 'risk', label: '리스크 수준', sub: 'Risk Assessment' },
  { id: 'synergy', label: '그룹 시너지', sub: 'Group Synergy' },
] as const;
```

### 5.3 화면 3: 9탭 리포트 [F346~F348]

각 탭의 렌더링 컴포넌트와 데이터 소스:

| 탭 | 컴포넌트 | 차트 | 데이터 소스 (output_json 키) |
|----|---------|------|---------------------------|
| 2-1 | ReferenceAnalysisTab | - | `competitors`, `jtbd`, `benchmarks` |
| 2-2 | MarketValidationTab | Recharts Doughnut (TAM/SAM/SOM) | `market_size`, `pain_points`, `roi` |
| 2-3 | CompetitiveLandscapeTab | Recharts Radar (Porter 5F) | `swot`, `porter`, `positioning` |
| 2-4 | OpportunityIdeationTab | - | `hmw`, `bmc_draft`, `core_features` |
| 2-5 | OpportunityScoringTab | Bar (ICE scores) | `ice_scores`, `go_nogo_gate` |
| 2-6 | CustomerPersonaTab | - | `personas`, `journey`, `icp` |
| 2-7 | BusinessModelTab | Bar (수익 시나리오) | `bmc_final`, `unit_economics`, `revenue` |
| 2-8 | PackagingTab | - | `gtm_strategy`, `beachhead`, `north_star` |
| 2-9 | PersonaEvalResultTab | Radar (7축) | `ax_persona_evals` 테이블 직접 |

**output_json 렌더링 전략:**
```typescript
// output_json이 비정형일 수 있으므로 Zod safeParse + fallback
const TabRenderer = ({ stageNum, data }: { stageNum: string; data: unknown }) => {
  const parsed = tabSchemas[stageNum].safeParse(data);
  if (parsed.success) {
    return <StructuredTabView data={parsed.data} />;
  }
  // fallback: JSON 트리 뷰 (비정형 데이터도 표시)
  return <JsonTreeView data={data} />;
};
```

### 5.4 화면 4: 팀 검토 [F349]

```
┌──────────────────────────────────────────────────────────┐
│  팀 검토 & 의사결정                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                          │
│  Executive Summary (자동 생성)                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ■ 아이템: Enterprise Agent Catalog                   ││
│  │ ■ 유형: Type S | 종합 점수: 73.2 | 판정: Conditional ││
│  │ ■ TAM ₩2.4조 / SAM ₩4,800억 / SOM ₩180억          ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  팀원 투표                                               │
│  ┌────┬────┬────┬────┬────┬────┬────┐                   │
│  │민원│기욱│정원│경임│혜윤│은영│성용│                   │
│  │ Go │Hold│ Go │ Go │Drop│ Go │ Go │                   │
│  └────┴────┴────┴────┴────┴────┴────┘                   │
│                                                          │
│  [Go 5 / Hold 1 / Drop 1]                               │
│                                                          │
│  최종 결정: [Go ▼]  사유: [________________]             │
│                                    [결정 확정]            │
│                                                          │
│  ┌─ Handoff Checklist ─────────────────────────────────┐ │
│  │ [x] BMC 완성본 존재                                  │ │
│  │ [x] Go/Conditional 판정                              │ │
│  │ [ ] 팀장 최종 승인                                   │ │
│  │ → 체크 완료 시 [3단계 형상화 시작] 버튼 활성화       │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 5.5 디자인 시스템 — Discovery 시맨틱 토큰

```css
/* packages/web/src/styles/discovery-tokens.css */
:root {
  --discovery-mint: #00b493;
  --discovery-mint-bg: #e6faf8;
  --discovery-blue: #3182f6;
  --discovery-blue-bg: #e8f3ff;
  --discovery-amber: #f59e0b;
  --discovery-amber-bg: #fff5e6;
  --discovery-red: #f04452;
  --discovery-red-bg: #ffe8ea;
  --discovery-purple: #8b5cf6;
  --discovery-purple-bg: #f0e8ff;
}

/* 단계별 색상 매핑 */
[data-step="2-1"], [data-step="2-2"] { --step-color: var(--discovery-mint); --step-bg: var(--discovery-mint-bg); }
[data-step="2-3"], [data-step="2-4"] { --step-color: var(--discovery-blue); --step-bg: var(--discovery-blue-bg); }
[data-step="2-5"], [data-step="2-6"], [data-step="2-7"] { --step-color: var(--discovery-amber); --step-bg: var(--discovery-amber-bg); }
[data-step="2-8"] { --step-color: var(--discovery-red); --step-bg: var(--discovery-red-bg); }
[data-step="2-9"] { --step-color: var(--discovery-purple); --step-bg: var(--discovery-purple-bg); }
```

### 5.6 Component List (전체)

| Component | Location | F-item | Responsibility |
|-----------|----------|--------|----------------|
| IntensityIndicator | `discovery/intensity/` | F343 | ★핵심/○보통/△간소 뱃지 |
| IntensityMatrix | `discovery/intensity/` | F343 | 5유형×7단계 매트릭스 시각화 |
| SkipStepOption | `discovery/intensity/` | F343 | 간소 단계 스킵 UI |
| PersonaCardGrid | `discovery/persona/` | F344 | 8개 카드 2×4 그리드 |
| WeightSliderPanel | `discovery/persona/` | F344 | 7축 슬라이더 + 합계 보정 |
| ContextEditor | `discovery/persona/` | F344 | 좌측 리스트 + 우측 폼 |
| BriefingInput | `discovery/persona/` | F344 | 자동 요약 + 수동 편집 |
| EvalProgress | `discovery/persona/` | F345 | 8단계 프로그레스 (SSE) |
| EvalResults | `discovery/persona/` | F345 | 점수+판정+Radar+요약 |
| PersonaEvalPage | `discovery/persona/` | F344 | 2-9 라우트 페이지 |
| StepHeader | `discovery/report/common/` | F346 | 단계 번호+제목+태그 |
| InsightBox | `discovery/report/common/` | F346 | gradient 인사이트 박스 |
| MetricCard | `discovery/report/common/` | F346 | 큰 숫자+라벨 카드 |
| NextStepBox | `discovery/report/common/` | F346 | 다음 연결 안내 |
| HitlBadge | `discovery/report/common/` | F346 | 검증 완료 뱃지 |
| DiscoveryReport | `discovery/report/` | F346 | 9탭 프레임 + Lazy |
| 9 Tab Components | `discovery/report/tabs/` | F347~F348 | 각 탭 렌더링 |
| TeamReviewPanel | `discovery/review/` | F349 | 투표+코멘트 |
| ExecutiveSummary | `discovery/review/` | F349 | 1-Pager 자동 생성 |
| DecisionRecord | `discovery/review/` | F349 | 결정+사유+시간 |
| HandoffChecklist | `discovery/review/` | F349 | 형상화 진입 조건 |
| ShareExport | `discovery/review/` | F350 | 공유 링크+PDF |

---

## 6. Error Handling

| Scenario | Handling | UI |
|----------|----------|-----|
| Claude API 호출 실패 | 3회 재시도 → fallback 데모 모드 | EvalProgress에 에러 표시 + 재시도 버튼 |
| output_json 비정형 | Zod safeParse → JsonTreeView fallback | 구조화 뷰 대신 JSON 트리 표시 |
| 투표 version 충돌 | Optimistic lock → 재로딩 안내 | "다른 팀원이 수정했어요. 새로고침" 토스트 |
| 공유 토큰 만료 | 401 → "링크가 만료되었어요" | 만료 안내 페이지 |
| PDF Export 실패 | html2canvas 에러 → 수동 안내 | "브라우저 인쇄(Ctrl+P)를 사용하세요" |
| API 타임아웃 (30초) | 페르소나 1명씩 개별 호출로 우회 | 개별 진행률 표시 |

---

## 7. Security Considerations

- [x] 기존 JWT + RBAC 인증 체계 활용 (추가 구현 없음)
- [ ] 공유 링크 토큰: crypto.randomUUID() + 7일 만료 + DB 저장
- [ ] Claude API 키: Workers Secret (기존 ANTHROPIC_API_KEY)
- [ ] 투표 데이터: tenant_id 기반 격리 (기존 멀티테넌시)
- [ ] 입력 검증: Zod 스키마 (기존 require-zod-schema ESLint 룰)
- [ ] Rate Limiting: 평가 API에 1분당 5회 제한 (비용 방지)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | F-item |
|------|--------|------|--------|
| Unit | 서비스 CRUD + Zod 스키마 | Vitest + in-memory SQLite | F342 |
| Unit | 강도 매트릭스 로직 + 컴포넌트 | Vitest | F343 |
| Unit | 가중치 합계 보정 + 평가 결과 파싱 | Vitest | F344~F345 |
| Unit | 리포트 데이터 집계 로직 | Vitest | F346 |
| Integration | API 라우트 (Hono app.request) | Vitest | F342, F345, F346, F349 |
| Component | React 컴포넌트 렌더링 | Vitest + @testing-library/react | F343~F350 |

### 8.2 Test Cases (Key)

**Sprint 154:**
- [ ] D1 마이그레이션 4건 성공 (스키마 검증)
- [ ] PersonaConfigService CRUD 동작
- [ ] IntensityIndicator: 5유형 × 3강도 조합 렌더링
- [ ] output_json POC: 기존 데이터 2탭 렌더링 성공/fallback

**Sprint 155:**
- [ ] WeightSliderPanel: 합계 100% 자동보정 정확성
- [ ] Claude SSE API: 정상 응답 파싱 + 에러 재시도
- [ ] EvalResults: Radar 차트 데이터 매핑
- [ ] 데모 모드: 하드코딩 데이터로 전체 플로우

**Sprint 156:**
- [ ] DiscoveryReport: 9탭 Lazy 로딩 + 탭 전환
- [ ] MarketValidationTab: TAM/SAM/SOM 도넛 차트
- [ ] CompetitiveLandscapeTab: Porter 5F Radar 차트
- [ ] 비정형 output_json → JsonTreeView fallback

**Sprint 157:**
- [ ] TeamReviewPanel: 투표 저장 + version 충돌 처리
- [ ] Handoff: Go 판정 시 형상화 버튼 활성화
- [ ] 공유 링크: 토큰 생성 + 만료 검증
- [ ] PDF Export: 차트 포함 PDF 생성 성공

---

## 9. Implementation Order (Sprint별)

### Sprint 154 (F342+F343)
1. [ ] D1 migration 0096~0099 작성 + 로컬 적용
2. [ ] PersonaConfigService + Zod 스키마 + 라우트
3. [ ] PersonaEvalService + Zod 스키마
4. [ ] DiscoveryReportService + Zod 스키마 + 라우트
5. [ ] IntensityIndicator + IntensityMatrix 컴포넌트
6. [ ] WizardStepDetail에 intensity/onSkip props 추가
7. [ ] output_json POC (기존 데이터 2탭 렌더링 검증)
8. [ ] 단위 테스트 ~120건

### Sprint 155 (F344+F345)
1. [ ] `pnpm add recharts` (packages/web)
2. [ ] PersonaCardGrid 컴포넌트
3. [ ] WeightSliderPanel + 합계 100% 보정 로직
4. [ ] ContextEditor (Split Pane)
5. [ ] BriefingInput (ax_discovery_outputs 자동 집계)
6. [ ] persona-eval-store.ts (Zustand)
7. [ ] POST /ax-bd/persona-eval (Claude SSE)
8. [ ] EvalProgress (8단계 순차)
9. [ ] EvalResults (Radar 차트 + 판정)
10. [ ] PersonaEvalPage 라우트
11. [ ] 데모 모드 fallback
12. [ ] 단위 테스트 ~200건

### Sprint 156 (F346+F347)
1. [ ] discovery-tokens.css (시맨틱 토큰)
2. [ ] StepHeader, InsightBox, MetricCard, NextStepBox, HitlBadge
3. [ ] GET /ax-bd/discovery-report/:itemId (집계 API)
4. [ ] DiscoveryReport 9탭 프레임 + Lazy
5. [ ] ReferenceAnalysisTab (2-1)
6. [ ] MarketValidationTab (2-2) + TAM 도넛
7. [ ] CompetitiveLandscapeTab (2-3) + Porter Radar
8. [ ] OpportunityIdeationTab (2-4) + BMC 그리드
9. [ ] JsonTreeView fallback
10. [ ] 단위 테스트 ~150건

### Sprint 157 (F348+F349+F350)
1. [ ] 5탭 완성: 2-5 ~ 2-9
2. [ ] TeamReviewPanel (투표 + 코멘트 + optimistic locking)
3. [ ] ExecutiveSummary 자동 생성
4. [ ] DecisionRecord + HandoffChecklist
5. [ ] POST /ax-bd/team-reviews 라우트
6. [ ] 공유 토큰 생성 + 공유 링크 라우트
7. [ ] html2canvas PDF Export
8. [ ] 단위 테스트 ~100건

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-05 | Initial draft — Plan + PRD 기반 Design 작성 | Sinclair Seo |
