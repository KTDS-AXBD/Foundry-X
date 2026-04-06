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
├── components/feature/discovery/   ← flat 구조 (intensity/, persona/, review/ 서브디렉토리 미생성)
│   ├── (기존 유지)
│   │   ├── DiscoveryWizard.tsx      ← onNavigateStage prop 추가만
│   │   └── WizardStepDetail.tsx     ← intensity, onSkip props 추가만
│   │
│   ├── IntensityIndicator.tsx       ← [F343] 신규 (설계: intensity/ 서브 → 실제: flat)
│   ├── IntensityMatrix.tsx          ← [F343] 신규
│   │   (SkipStepOption.tsx 미구현 — P2)
│   │
│   │   (persona/ 관련 컴포넌트 미구현 — F344~F345)
│   │
│   ├── report/                      ← [F346~F349] 신규
│   │   ├── StepHeader.tsx           — (common/ 서브 없이 flat)
│   │   ├── InsightBox.tsx
│   │   ├── MetricCard.tsx
│   │   ├── NextStepBox.tsx
│   │   ├── HITLBadge.tsx            — (HitlBadge → HITLBadge 대문자)
│   │   ├── TeamReviewPanel.tsx      — Go/Hold/Drop 투표 (review/ 아닌 report/ 위치)
│   │   ├── ShareReportButton.tsx    — 공유 링크 (ShareExport에서 분리)
│   │   ├── ExportPdfButton.tsx      — PDF Export (ShareExport에서 분리)
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
│   │   (DecisionRecord, ExecutiveSummary, HandoffChecklist 미구현 — P3)
│   │
│   └── ShapingTriggerPanel.tsx      ← 추가 구현 (설계 외)
│
├── routes/ax-bd/
│   ├── discovery-report.tsx         ← [F346] 신규 라우트
│   └── persona-eval.tsx             ← [F344] 신규 라우트 (미구현)

packages/api/src/
├── db/migrations/
│   ├── 0098_persona_configs.sql     ← [F344] 신규 (설계: 0096 → 실제: 0098)
│   ├── 0099_persona_evals.sql       ← [F345] 신규 (설계: 0097 → 실제: 0099)
│   ├── 0100_discovery_reports.sql   ← [F346] 신규 (설계: 0098 → 실제: 0100)
│   └── 0101_team_reviews.sql        ← [F342] 신규 (설계: 0099 → 실제: 0101)
│
├── services/
│   ├── persona-config-service.ts    ← [F344] 신규
│   ├── persona-eval-service.ts      ← [F345] 신규
│   ├── discovery-report-service.ts  ← [F346+F349] 신규
│   (team-review-service.ts 미존재 — 라우트에 인라인 구현)
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

### 3.1 D1 Migration 0098 (실제): ax_persona_configs

> **실제 마이그레이션**: `0098_persona_configs.sql` (Sprint 155 F344)
> `0096`/`0097`은 Phase 14 인프라 스킬(execution_events, loop_contexts)로 선점되어 번호 변경됨.
> 중복 `0098_discovery_reports.sql`은 Sprint 154의 초안으로, **실 적용은 `0100_discovery_reports.sql`**.

```sql
-- 0098_persona_configs.sql (실제)
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,                     -- tenant_id → org_id로 변경
  persona_id TEXT NOT NULL,                 -- 'strategy'|'sales'|'ap_biz'|'ai_tech'|'finance'|'security'|'partnership'|'product'
  weights TEXT NOT NULL DEFAULT '{}',       -- JSON: 페르소나별 가중치 (자유 형식)
  context_json TEXT NOT NULL DEFAULT '{}',  -- JSON: { situation, priority, style, redLines[] }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)               -- org_id 제외 (item_id + persona_id 조합으로 유일)
);
CREATE INDEX IF NOT EXISTS idx_persona_configs_item ON ax_persona_configs(item_id);
```

### 3.2 D1 Migration 0099: ax_persona_evals

```sql
-- 0099_persona_evals.sql (Sprint 155 F345)
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,                    -- tenant_id → org_id
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',       -- JSON: { businessViability, strategicFit, customerValue, techMarket, execution, financialFeasibility, competitiveDiff, scalability } 각 0~10
  verdict TEXT NOT NULL DEFAULT 'pending', -- 'green'|'keep'|'red'|'pending' (go/conditional/nogo → green/keep/red 변경)
  summary TEXT,                            -- 한줄 요약
  concerns TEXT,                           -- JSON 배열: 핵심 우려사항 목록
  condition TEXT,                          -- keep 판정 시 조건 (nullable)
  eval_metadata TEXT DEFAULT '{}',         -- JSON: 추가 메타데이터 (모델, 토큰수 등)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)              -- version 컬럼 미구현 (P3 항목)
);
CREATE INDEX IF NOT EXISTS idx_persona_evals_item ON ax_persona_evals(item_id);
```

**평가 점수 축 (8축):**
```
businessViability, strategicFit, customerValue, techMarket,
execution, financialFeasibility, competitiveDiff, scalability
(설계의 7축 roi/strategy/finance/gtm/tech/risk/synergy → 실제 8축으로 변경)
```

### 3.3 D1 Migration 0100: ax_discovery_reports

```sql
-- 0100_discovery_reports.sql (Sprint 156 F346 — 실제 적용)
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,  -- item_id → biz_item_id
  org_id TEXT NOT NULL,                   -- tenant_id → org_id
  report_json TEXT NOT NULL DEFAULT '{}', -- JSON: 9탭 데이터
  overall_verdict TEXT CHECK (overall_verdict IN ('go','conditional','hold','drop')),
  team_decision TEXT CHECK (team_decision IN ('go','hold','drop')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id)
);
CREATE INDEX IF NOT EXISTS idx_adr_biz_item ON ax_discovery_reports(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_adr_org ON ax_discovery_reports(org_id);
```

> 참고: Sprint 154의 초안(`0098_discovery_reports.sql`)에는 `shared_token`, `overall_score`, `decided_by` 컬럼이 있었으나,
> 실 적용 버전(`0100_discovery_reports.sql`)에서는 제거됨.

### 3.4 D1 Migration 0101: ax_team_reviews

```sql
-- 0101_team_reviews.sql (Sprint 154 F342)
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,                   -- tenant_id → org_id
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,  -- report_id → item_id (직접 biz_item 참조)
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL CHECK(decision IN ('Go', 'Hold', 'Drop')),  -- 대문자 enum
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_atr_item ON ax_team_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_atr_org ON ax_team_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_atr_reviewer ON ax_team_reviews(reviewer_id);
```

> **FK 변경**: 설계의 `report_id → ax_discovery_reports.id`에서 `item_id → biz_items.id`로 단순화됨.

### 3.5 Entity Relationships

```
[biz_items] 1 ──── N [ax_persona_configs]    (아이템별 페르소나 설정, item_id FK)
     │      1 ──── N [ax_persona_evals]      (아이템별 평가 결과, item_id FK)
     │      1 ──── 1 [ax_discovery_reports]  (아이템별 통합 리포트, biz_item_id FK)
     │      1 ──── N [ax_team_reviews]       (아이템별 팀원 투표, item_id FK — report_id 아님)
     │
[biz_item_discovery_stages] → output_json → 리포트 데이터 소스
[bd_artifacts] → output_text → 탭별 콘텐츠 소스
```

> **설계 변경**: `ax_team_reviews`는 `report_id` 대신 `item_id`로 직접 `biz_items`를 참조.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | F-item | 상태 |
|--------|------|-------------|------|--------|------|
| GET | /ax-bd/persona-configs/:itemId | 아이템의 페르소나 설정 조회 | Required | F342 | ✅ 구현 |
| PUT | /ax-bd/persona-configs/:itemId | 페르소나 설정 저장/갱신 | Required | F342 | ✅ 구현 |
| POST | /ax-bd/persona-configs/:itemId/init | 기본 8인 페르소나 시딩 | Required | F342 | ✅ 추가 구현 |
| POST | /ax-bd/persona-eval | 멀티 페르소나 평가 실행 (SSE) | Required | F345 | ✅ 구현 |
| GET | /ax-bd/persona-evals/:itemId | 아이템의 평가 결과 조회 | Required | F342 | ✅ 구현 |
| GET | /ax-bd/persona-evals/:itemId/verdict | 평가 종합 판정 조회 | Required | F345 | ✅ 추가 구현 |
| PATCH | /ax-bd/persona-configs/:itemId/:personaId/weights | 특정 페르소나 가중치 수정 | Required | F344 | ✅ 추가 구현 |
| GET | /ax-bd/discovery-report/:itemId | 통합 리포트 조회 (9탭 데이터 자동 집계) | Required | F346 | ✅ 구현 |
| GET | /ax-bd/discovery-report/:itemId/summary | Executive Summary 조회 | Required | F349 | ✅ 추가 구현 |
| GET | /ax-bd/discovery-reports/:itemId | 리포트 조회 (별도 경로) | Required | F342 | ✅ 추가 구현 |
| PUT | /ax-bd/discovery-reports/:itemId | 리포트 생성/갱신 | Required | F346 | ✅ 추가 구현 |
| POST | /ax-bd/discovery-reports/:itemId/share | 공유 토큰 생성 | Required | F350 | ✅ 구현 |
| GET | /ax-bd/team-reviews/:itemId | 팀 투표 현황 조회 | Required | F349 | ✅ 구현 (`:reportId` → `:itemId`) |
| POST | /ax-bd/team-reviews/:itemId | 투표 등록/변경 | Required | F349 | ✅ 구현 |
| GET | /ax-bd/team-reviews/:itemId/summary | 투표 집계 | Required | F349 | ✅ 추가 구현 |
| POST | /ax-bd/team-reviews/:itemId/decide | 팀장 최종 결정 | Required | F349 | ❌ 미구현 (P1) |
| GET | /ax-bd/shared-report/:token | 공유 링크로 리포트 조회 | Public | F350 | ❌ 미구현 (P2) |

> **경로 변경**: 팀 검토 API의 파라미터명이 설계의 `:reportId`에서 `:itemId`로 변경됨 (DB FK 변경에 따른 연쇄 변경).

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
event: eval_start
data: {"personaId": "strategy", "personaName": "전략기획팀장", "index": 0, "total": 8}

event: eval_complete
data: {"personaId": "strategy", "scores": {"businessViability": 8.2, ...}, "verdict": "green", "summary": "...", "concerns": ["..."], "index": 0}

event: final_result
data: {"overallScore": 76.4, "verdict": "green", "verdictCounts": {"green": 5, "keep": 2, "red": 1}, "concerns": [...]}
```

> **변경 사항**:
> - `progress` → `eval_start` (평가 시작 이벤트)
> - `result` → `eval_complete` (개별 평가 완료)
> - `done` → `final_result` (전체 종합 결과)
> - `verdict` 값: `go/conditional/nogo` → `green/keep/red`
> - `concern` (단수) → `concerns` (배열)

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
  "bizItemId": "uuid",
  "title": "아이템 제목",
  "type": "I|M|P|T|S",
  "completedStages": ["2-1", "2-2", ...],
  "overallProgress": 78,
  "tabs": {
    "2-1": { ... },
    "2-2": { ... },
    ...
    "2-9": { ... }
  }
}
```

> **변경 사항**: `itemId` → `bizItemId`, `overallScore`/`overallVerdict`/`teamDecision` 제거,
> `completedStages`/`overallProgress`/`title`/`type` 추가. tabs 안의 각 항목은 `bd_artifacts.output_text` 파싱 결과.

**persona-eval 목록 API Response (`{ items }` 키):**
```json
{
  "items": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "personaId": "strategy",
      "scores": { "businessViability": 8.2, ... },
      "verdict": "green",
      "summary": "...",
      "concerns": ["..."],
      "createdAt": "2026-04-05T..."
    }
  ]
}
```

> persona-configs 조회 응답도 `{ items: [...] }` 구조 (설계의 `{ data: [...] }` 아님).

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

**8 페르소나 정의 (실제 `BIZ_PERSONAS` 상수 — `biz-persona-prompts.ts`):**
```typescript
const BIZ_PERSONAS = [
  { id: 'strategy',    name: '전략기획팀장', role: 'KT DS 전략기획팀장 (15년차)',   focus: ['전략적합성', '시장규모', '성장잠재력'] },
  { id: 'sales',       name: '영업총괄부장', role: 'KT DS 영업총괄부장 (20년차)',   focus: ['수주확보 가능성', '기존고객 확장', '영업난이도'] },
  { id: 'ap_biz',      name: 'AP사업본부장', role: 'KT DS AP사업본부장 (18년차)',  focus: ['기술실현 가능성', '자원투입비', '타임라인'] },
  { id: 'ai_tech',     name: 'AI기술본부장', role: 'KT DS AI기술본부장 (12년차)',  focus: ['기술차별성', 'AI 적합성', '데이터 확보'] },
  { id: 'finance',     name: '경영기획팀장', role: 'KT DS 경영기획팀장 (15년차)',  focus: ['재무타당성', 'ROI', '투자회수기간'] },
  { id: 'security',    name: '보안전략팀장', role: 'KT DS 보안전략팀장 (13년차)',  focus: ['보안위험', '컴플라이언스', '데이터 거버넌스'] },
  { id: 'partnership', name: '대외협력팀장', role: 'KT DS 대외협력팀장 (14년차)', focus: ['파트너십', '규제환경', '시장진입 장벽'] },
  { id: 'product',     name: '기술사업화PM',  role: 'KT DS 기술사업화PM (10년차)',  focus: ['사업화 실행력', '리스크', 'MVP 가능성'] },
] as const;
```

> **변경**: `ax-expert/customer/ceo/biz-planning/ax-head/kt-group` → `strategy/sales/ap_biz/ai_tech/finance/security/partnership/product`
> ID 스타일: kebab-case → snake_case

**판정(verdict) 값 변경:**
```
설계: 'go' | 'conditional' | 'nogo'
실제: 'green' | 'keep' | 'red' | 'pending'

판정 기준:
- green: 8명 중 5명 이상 green 판정
- red:   8명 중 3명 이상 red 판정
- keep:  그 외
```

**8 평가축 (실제 SCORE_KEYS — persona-eval-service.ts):**
```typescript
const SCORE_KEYS = [
  'businessViability',      // 사업 타당성 (0~10)
  'strategicFit',           // 전략 부합도
  'customerValue',          // 고객 가치
  'techMarket',             // 기술·시장 성숙도
  'execution',              // 실행 가능성
  'financialFeasibility',   // 재무 타당성
  'competitiveDiff',        // 경쟁 차별성
  'scalability',            // 확장성
] as const;
```

> **변경**: 7축(roi/strategy/finance/gtm/tech/risk/synergy) → 8축으로 확장. 점수 범위 0~100 → 0~10.

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

> **위치 변경**: 별도 `discovery-tokens.css` 파일이 아닌, `packages/web/src/app/globals.css` `:root` 블록에 통합됨.

```css
/* packages/web/src/app/globals.css — :root 블록 내 실제 값 */
:root {
  --discovery-mint: #00b493;
  --discovery-mint-bg: #e6f9f4;     /* 설계: #e6faf8 → 실제: #e6f9f4 */
  --discovery-blue: #3182f6;
  --discovery-blue-bg: #e8f1fe;     /* 설계: #e8f3ff → 실제: #e8f1fe */
  --discovery-amber: #f59e0b;
  --discovery-amber-bg: #fef3c7;    /* 설계: #fff5e6 → 실제: #fef3c7 */
  --discovery-red: #f04452;
  --discovery-red-bg: #fee2e2;      /* 설계: #ffe8ea → 실제: #fee2e2 */
  --discovery-purple: #8b5cf6;
  --discovery-purple-bg: #f3e8ff;   /* 설계: #f0e8ff → 실제: #f3e8ff */
}

/* 단계별 색상 매핑 — [P3 미구현] data-step CSS 선택자는 현재 globals.css에 없음.
   StepHeader, InsightBox 등 각 컴포넌트에서 인라인 스타일로 색상을 직접 적용 중.
[data-step="2-1"], [data-step="2-2"] { --step-color: var(--discovery-mint); --step-bg: var(--discovery-mint-bg); }
[data-step="2-3"], [data-step="2-4"] { --step-color: var(--discovery-blue); --step-bg: var(--discovery-blue-bg); }
[data-step="2-5"], [data-step="2-6"], [data-step="2-7"] { --step-color: var(--discovery-amber); --step-bg: var(--discovery-amber-bg); }
[data-step="2-8"] { --step-color: var(--discovery-red); --step-bg: var(--discovery-red-bg); }
[data-step="2-9"] { --step-color: var(--discovery-purple); --step-bg: var(--discovery-purple-bg); }
*/
```

### 5.6 Component List (전체 — 실제 파일 경로 기준)

> 실제 경로: `packages/web/src/components/feature/discovery/`
> **구조 변경**: 설계의 서브디렉토리(`intensity/`, `persona/`, `review/`) 대신 **flat 구조**로 구현됨.
> `report/` 서브디렉토리와 `report/tabs/`만 유지.

| Component | 실제 파일 경로 | F-item | Responsibility | 상태 |
|-----------|--------------|--------|----------------|------|
| IntensityIndicator | `discovery/IntensityIndicator.tsx` | F343 | ★핵심/○보통/△간소 뱃지 | ✅ |
| IntensityMatrix | `discovery/IntensityMatrix.tsx` | F343 | 5유형×7단계 매트릭스 | ✅ |
| SkipStepOption | — | F343 | 간소 단계 스킵 UI | ❌ 미구현 (P2) |
| PersonaCardGrid | — | F344 | 8개 카드 2×4 그리드 | ❌ 미구현 |
| WeightSliderPanel | — | F344 | 8축 슬라이더 + 합계 보정 | ❌ 미구현 |
| ContextEditor | — | F344 | 좌측 리스트 + 우측 폼 | ❌ 미구현 |
| BriefingInput | — | F344 | 자동 요약 + 수동 편집 | ❌ 미구현 |
| EvalProgress | — | F345 | 8단계 프로그레스 (SSE) | ❌ 미구현 |
| EvalResults | — | F345 | 점수+판정+Radar+요약 | ❌ 미구현 |
| PersonaEvalPage | — | F344 | 2-9 라우트 페이지 | ❌ 미구현 |
| StepHeader | `discovery/report/StepHeader.tsx` | F346 | 단계 번호+제목+태그 | ✅ |
| InsightBox | `discovery/report/InsightBox.tsx` | F346 | gradient 인사이트 박스 | ✅ |
| MetricCard | `discovery/report/MetricCard.tsx` | F346 | 큰 숫자+라벨 카드 | ✅ |
| NextStepBox | `discovery/report/NextStepBox.tsx` | F346 | 다음 연결 안내 | ✅ |
| HITLBadge | `discovery/report/HITLBadge.tsx` | F346 | 검증 완료 뱃지 (HitlBadge → HITLBadge) | ✅ |
| ShareReportButton | `discovery/report/ShareReportButton.tsx` | F350 | 공유 링크 버튼 (분리됨) | ✅ |
| ExportPdfButton | `discovery/report/ExportPdfButton.tsx` | F350 | PDF 내보내기 버튼 (분리됨) | ✅ |
| TeamReviewPanel | `discovery/report/TeamReviewPanel.tsx` | F349 | 투표+코멘트 | ✅ (`review/` → `report/`로 이동) |
| 9 Tab Components | `discovery/report/tabs/*.tsx` | F347~F348 | 각 탭 렌더링 | ✅ |
| DecisionRecord | — | F349 | 결정+사유+시간 | ❌ 미구현 (P3) |
| ExecutiveSummary | — | F349 | 1-Pager 자동 생성 | ❌ 미구현 |
| HandoffChecklist | — | F349 | 형상화 진입 조건 | ❌ 미구현 |
| ShapingTriggerPanel | `discovery/ShapingTriggerPanel.tsx` | F349 | 형상화 트리거 패널 (추가 구현) | ✅ |

> **추가 구현** (Design에 없음): `AutoAdvanceToggle`, `CheckpointApproverInfo`, `CheckpointReviewPanel`,
> `DiscoveryTour`, `HelpAgentChat`, `HitlReviewPanel`, `OutputJsonViewer`, `PipelineErrorPanel`,
> `PipelineMonitorDashboard`, `PipelinePermissionEditor`, `PipelineStatusBadge`, `PipelineTimeline`
>
> **설계와 다른 점**: `ShareExport` (단일) → `ShareReportButton` + `ExportPdfButton` (2개 분리),
> `HitlBadge` → `HITLBadge` (대문자), `review/` 서브디렉토리 미생성 → `report/`에 통합.

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
- [ ] 공유 링크 토큰: crypto.randomUUID() + **30일 만료** + DB 저장 (설계 7일 → 실제 30일)
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
| 0.2 | 2026-04-06 | 역갱신 — Gap Analysis 기반 20개 항목 실제 구현에 맞춰 보정 (§2.1 경로·§3 스키마·§4 API·§5.2 페르소나·§5.5 CSS·§5.6 컴포넌트·§7 보안) | Sinclair Seo |
