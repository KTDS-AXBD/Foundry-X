---
code: FX-DSGN-S164
title: "Sprint 164 Design — 에이전트 자기 평가 연동 + Rule 효과 측정 + 운영 지표 대시보드"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S164]], [[FX-SPEC-001]]"
---

# Sprint 164 Design: Rule 효과 측정 + 운영 지표 대시보드

## 1. Overview

Phase 17 마지막 Sprint. Guard Rail 배치 효과를 정량 측정하고, 하네스 인프라 활용률을 대시보드로 시각화한다.

### 1.1 F-items

| F-item | 제목 | 핵심 산출물 |
|--------|------|-------------|
| F361 | 에이전트 자기 평가 연동 + Rule 효과 측정 | effectiveness_score 컬럼 + API 1개 |
| F362 | 운영 지표 대시보드 | API 3개 + Dashboard 탭 (차트 4개) |

---

## 2. Data Layer

### 2.1 D1 Migration — `0109_grp_effectiveness.sql`

```sql
-- guard_rail_proposals 확장: Rule 효과 측정 컬럼 4개
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_score REAL;
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_measured_at TEXT;
ALTER TABLE guard_rail_proposals ADD COLUMN pre_deploy_failures INTEGER;
ALTER TABLE guard_rail_proposals ADD COLUMN post_deploy_failures INTEGER;
```

### 2.2 기존 테이블 활용 (변경 없음)

| 테이블 | 활용 | 쿼리 패턴 |
|--------|------|-----------|
| `execution_events` | 에이전트/스킬 월간 활용률 | `GROUP BY source, strftime('%Y-%m', created_at)` |
| `skill_executions` | Skill 실행 이력 | `JOIN skill_lineage ON skill_id` |
| `skill_lineage` | DERIVED/CAPTURED 구분 | `derivation_type` 필터 |
| `failure_patterns` | Rule 효과 전/후 비교 | `created_at` window 비교 |
| `guard_rail_proposals` | 승인된 Rule 기준점 | `status = 'approved'`, `reviewed_at` |

---

## 3. Shared Types — `packages/shared/src/metrics.ts`

```typescript
// ── Rule 효과 측정 ──
export interface RuleEffectiveness {
  proposalId: string;
  ruleFilename: string;
  patternId: string;
  preDeployFailures: number;
  postDeployFailures: number;
  effectivenessScore: number; // 0~100, 높을수록 효과적
  measuredAt: string | null;
  status: 'measuring' | 'measured' | 'insufficient_data';
}

export interface RuleEffectivenessResponse {
  items: RuleEffectiveness[];
  averageScore: number;
  totalRules: number;
  measuredRules: number;
}

// ── Skill 재사용률 ──
export interface SkillReuseData {
  skillId: string;
  derivationType: 'manual' | 'derived' | 'captured' | 'forked';
  totalExecutions: number;
  reuseCount: number; // 다른 skill에서 파생되어 실행된 횟수
  reuseRate: number;  // 0~100
}

export interface SkillReuseResponse {
  items: SkillReuseData[];
  overallReuseRate: number;
  derivedCount: number;
  capturedCount: number;
}

// ── 에이전트/스킬 활용률 ──
export interface AgentUsageData {
  source: string;
  month: string; // YYYY-MM
  eventCount: number;
  isUnused: boolean; // 월 0회
}

export interface AgentUsageResponse {
  items: AgentUsageData[];
  totalSources: number;
  activeSources: number;
  unusedSources: string[];
}

// ── 통합 운영 지표 ──
export interface MetricsOverview {
  ruleEffectiveness: {
    averageScore: number;
    totalRules: number;
    measuredRules: number;
  };
  skillReuse: {
    overallReuseRate: number;
    derivedCount: number;
    capturedCount: number;
  };
  agentUsage: {
    totalSources: number;
    activeSources: number;
    unusedCount: number;
  };
  period: string; // YYYY-MM
}
```

---

## 4. API Design

### 4.1 Zod Schemas — `packages/api/src/schemas/metrics-schema.ts`

Plan FR-01~FR-10에 대응하는 스키마:

| Schema | 용도 |
|--------|------|
| `RuleEffectivenessSchema` | 단일 Rule 효과 |
| `RuleEffectivenessResponseSchema` | 효과 목록 + 요약 |
| `SkillReuseSchema` / `SkillReuseResponseSchema` | 재사용률 |
| `AgentUsageSchema` / `AgentUsageResponseSchema` | 활용률 |
| `MetricsOverviewSchema` | 통합 운영 지표 |

### 4.2 Services

#### 4.2.1 `rule-effectiveness-service.ts`

```typescript
class RuleEffectivenessService {
  constructor(private db: D1Database) {}

  // FR-02: Rule 효과 점수 산출
  async measureAll(tenantId: string, windowDays?: number): Promise<RuleEffectiveness[]>
  // FR-01: execution_events에서 agent 실패 패턴 추출 (self-eval 대용)
  async getAgentFailureWeights(tenantId: string): Promise<Record<string, number>>
  // FR-03: effectiveness_score 저장
  async saveScore(proposalId: string, score: RuleEffectiveness): Promise<void>
}
```

**효과 측정 알고리즘:**
1. approved + deployed 상태의 Rule 조회
2. `reviewed_at` 기준 전 N일 / 후 N일 failure_patterns 집계
3. `score = max(0, (1 - post/pre) * 100)` (pre=0이면 'insufficient_data')

#### 4.2.2 `metrics-service.ts`

```typescript
class MetricsService {
  constructor(private db: D1Database) {}

  // FR-05: Skill 재사용률
  async getSkillReuse(tenantId: string): Promise<SkillReuseResponse>
  // FR-06: 에이전트/스킬 활용률
  async getAgentUsage(tenantId: string, month?: string): Promise<AgentUsageResponse>
  // FR-07: 미사용 항목 감지
  async getUnusedItems(tenantId: string): Promise<string[]>
  // FR-08: 통합 운영 지표
  async getOverview(tenantId: string): Promise<MetricsOverview>
}
```

### 4.3 Routes

#### 4.3.1 `guard-rail.ts` 확장 — `GET /guard-rail/effectiveness`

| Method | Path | Response | FR |
|--------|------|----------|----|
| GET | `/guard-rail/effectiveness` | `RuleEffectivenessResponse` | FR-04 |

Query params: `windowDays` (default 14)

#### 4.3.2 `metrics.ts` 신규

| Method | Path | Response | FR |
|--------|------|----------|----|
| GET | `/metrics/overview` | `MetricsOverview` | FR-08 |
| GET | `/metrics/skill-reuse` | `SkillReuseResponse` | FR-05 |
| GET | `/metrics/agent-usage` | `AgentUsageResponse` | FR-06 |

---

## 5. Web Dashboard

### 5.1 라우트 구조

```
web/src/routes/dashboard.metrics.tsx    — 메인 페이지 (탭 없이 3-section 레이아웃)
web/src/components/feature/
  ├── AgentUsageChart.tsx    — 에이전트/스킬 활용률 수평 바 차트
  ├── SkillReuseChart.tsx    — DERIVED/CAPTURED 재사용률 도넛 차트
  ├── RuleEffectChart.tsx    — Rule별 효과 점수 바 차트
  └── UnusedHighlight.tsx    — 미사용 항목 경고 카드
```

### 5.2 컴포넌트 명세

#### `dashboard.metrics.tsx` (FR-09, FR-10)
- 페이지 로드 시 `/api/metrics/overview` + `/api/guard-rail/effectiveness` 호출
- 3-section 수직 레이아웃: Rule 효과 → 활용률 → 재사용률
- 하단에 UnusedHighlight 카드

#### `AgentUsageChart.tsx`
- Props: `items: AgentUsageData[]`
- 수평 바 차트 (CSS div 기반, 라이브러리 미사용)
- source별 이벤트 수, 미사용은 빨간색 하이라이트

#### `SkillReuseChart.tsx`
- Props: `items: SkillReuseData[], overallRate: number`
- 도넛 차트 (SVG 기반) — DERIVED/CAPTURED/manual/forked 4색
- 중앙에 전체 재사용률 %

#### `RuleEffectChart.tsx`
- Props: `items: RuleEffectiveness[]`
- 수평 바 차트 — 효과 점수 0~100
- measuring 상태는 회색 + 아이콘

#### `UnusedHighlight.tsx`
- Props: `unusedSources: string[]`
- 미사용 항목 경고 카드 (노란색 배경)
- 0개이면 "모든 인프라가 활용되고 있습니다" 초록 메시지

### 5.3 네비게이션 연결

기존 `orchestration.tsx` 또는 Sidebar에서 "운영 지표" 링크 추가. React Router 파일 기반 라우팅이므로 `dashboard.metrics.tsx` 파일 생성만으로 `/dashboard/metrics` 경로 활성화.

---

## 6. 검증 항목 (Gap Analysis 기준)

| # | 항목 | 판정 기준 |
|---|------|-----------|
| D-01 | D1 migration 0109 존재 + 4 컬럼 ALTER | SQL 파일 확인 |
| D-02 | shared/src/metrics.ts 타입 4종 export | import 가능 |
| D-03 | metrics-schema.ts Zod 스키마 | parse 테스트 |
| D-04 | rule-effectiveness-service.ts measureAll() | 단위 테스트 |
| D-05 | metrics-service.ts 4 메서드 | 단위 테스트 |
| D-06 | GET /guard-rail/effectiveness 200 | API 테스트 |
| D-07 | GET /metrics/overview 200 | API 테스트 |
| D-08 | GET /metrics/skill-reuse 200 | API 테스트 |
| D-09 | GET /metrics/agent-usage 200 | API 테스트 |
| D-10 | dashboard.metrics.tsx 렌더링 | 파일 존재 + export |
| D-11 | AgentUsageChart 컴포넌트 | 파일 존재 |
| D-12 | SkillReuseChart 컴포넌트 | 파일 존재 |
| D-13 | RuleEffectChart 컴포넌트 | 파일 존재 |
| D-14 | UnusedHighlight 컴포넌트 | 파일 존재 |
| D-15 | app.ts 라우트 등록 | metricsRoute import + app.route |
| D-16 | Sidebar 네비게이션 링크 | "운영 지표" 항목 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial design — 기존 인프라 활용 방안 + 컴포넌트 명세 | Sinclair Seo |
