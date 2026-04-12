---
code: FX-DSGN-S154
title: "Sprint 154 — DB 스키마 확장 + 강도 라우팅 UI + output_json POC"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair (AI Agent)
sprint: 154
f_items: [F342, F343]
phase: "Phase 15 — Discovery UI/UX 고도화 v2"
plan_ref: "[[FX-PLAN-S154]]"
---

# Sprint 154 Design — DB 스키마 확장 + 강도 라우팅 UI + output_json POC

## 1. 설계 개요

Phase 15 Foundation Sprint. 4개 D1 테이블 + 3개 API 서비스 + 강도 라우팅 UI 확장 + output_json 렌더링 POC.

### 설계 원칙
- 기존 `biz_items`/`biz_item_discovery_stages` 테이블과 FK 관계 유지
- `analysis-path-v82.ts`의 `ANALYSIS_PATH_MAP` 데이터를 프론트엔드에서 재사용
- WizardStepDetail 확장은 optional props로 하위 호환성 보장

---

## 2. DB 스키마 (D1 Migrations)

### 2.1 0098_persona_configs.sql

```sql
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  persona_role TEXT NOT NULL DEFAULT '',
  weights TEXT NOT NULL DEFAULT '{}',
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);

CREATE INDEX idx_apc_item ON ax_persona_configs(item_id);
CREATE INDEX idx_apc_org ON ax_persona_configs(org_id);
```

**weights JSON 구조** (7축, 합계 100):
```json
{
  "strategic_fit": 20,
  "market_potential": 15,
  "technical_feasibility": 15,
  "financial_viability": 15,
  "competitive_advantage": 10,
  "risk_assessment": 15,
  "team_readiness": 10
}
```

### 2.2 0099_persona_evals.sql

```sql
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL DEFAULT 'Conditional'
    CHECK(verdict IN ('Go', 'Conditional', 'NoGo')),
  summary TEXT NOT NULL DEFAULT '',
  concern TEXT,
  condition TEXT,
  eval_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
  eval_duration_ms INTEGER,
  eval_cost_usd REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);

CREATE INDEX idx_ape_item ON ax_persona_evals(item_id);
CREATE INDEX idx_ape_org ON ax_persona_evals(org_id);
CREATE INDEX idx_ape_verdict ON ax_persona_evals(verdict);
```

### 2.3 0100_discovery_reports.sql

```sql
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  report_json TEXT NOT NULL DEFAULT '{}',
  overall_verdict TEXT DEFAULT NULL
    CHECK(overall_verdict IN ('Go', 'Conditional', 'NoGo', NULL)),
  team_decision TEXT DEFAULT NULL
    CHECK(team_decision IN ('Go', 'Hold', 'Drop', NULL)),
  shared_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id)
);

CREATE INDEX idx_adr_item ON ax_discovery_reports(item_id);
CREATE INDEX idx_adr_org ON ax_discovery_reports(org_id);
CREATE INDEX idx_adr_shared ON ax_discovery_reports(shared_token);
```

### 2.4 0101_team_reviews.sql

```sql
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL CHECK(decision IN ('Go', 'Hold', 'Drop')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, reviewer_id)
);

CREATE INDEX idx_atr_item ON ax_team_reviews(item_id);
CREATE INDEX idx_atr_org ON ax_team_reviews(org_id);
CREATE INDEX idx_atr_reviewer ON ax_team_reviews(reviewer_id);
```

---

## 3. API 서비스 설계

### 3.1 PersonaConfigService

```typescript
class PersonaConfigService {
  constructor(private db: D1Database) {}

  // 기본 8인 페르소나 시딩
  async initDefaults(itemId: string, orgId: string): Promise<void>
  // CRUD
  async getByItem(itemId: string): Promise<PersonaConfig[]>
  async upsert(config: PersonaConfigInput): Promise<PersonaConfig>
  async updateWeights(itemId: string, personaId: string, weights: Weights): Promise<void>
}
```

**기본 8인 페르소나:**
| ID | 이름 | 역할 |
|----|------|------|
| strategy | 전략담당 | 사업 전략 및 비전 평가 |
| sales | 영업담당 | 고객 접점 및 수주 가능성 |
| ap-biz | AP사업담당 | 파트너십 및 서비스 확장성 |
| ai-tech | AI기술담당 | 기술 실현 가능성 및 차별화 |
| finance | 재무담당 | 수익성 및 투자 효율 |
| security | 보안담당 | 보안/규제 리스크 |
| partner | 파트너담당 | 외부 파트너 생태계 |
| product | 제품담당 | 제품 완성도 및 사용자 경험 |

### 3.2 PersonaEvalService

```typescript
class PersonaEvalService {
  constructor(private db: D1Database) {}

  async getByItem(itemId: string): Promise<PersonaEval[]>
  async save(eval_: PersonaEvalInput): Promise<PersonaEval>
  async getOverallVerdict(itemId: string): Promise<string>
}
```

### 3.3 DiscoveryReportService

```typescript
class DiscoveryReportService {
  constructor(private db: D1Database) {}

  async getByItem(itemId: string): Promise<DiscoveryReport | null>
  async upsert(report: DiscoveryReportInput): Promise<DiscoveryReport>
  async setTeamDecision(itemId: string, decision: string): Promise<void>
  async generateShareToken(itemId: string): Promise<string>
}
```

### 3.4 TeamReviewService (서비스만, 전용 파일 없이 team-reviews 라우트에 인라인)

CRUD 투표 + 집계 — 소규모이므로 라우트 파일에 직접 구현.

---

## 4. API 라우트 설계

### 4.1 persona-configs 라우트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ax-bd/persona-configs/:itemId` | 아이템별 페르소나 설정 조회 |
| POST | `/ax-bd/persona-configs/:itemId/init` | 기본 8인 시딩 |
| PUT | `/ax-bd/persona-configs/:itemId/:personaId` | 개별 설정 수정 |

### 4.2 persona-evals 라우트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ax-bd/persona-evals/:itemId` | 아이템별 평가 결과 조회 |
| POST | `/ax-bd/persona-evals/:itemId` | 평가 결과 저장 (단건) |
| GET | `/ax-bd/persona-evals/:itemId/verdict` | 종합 판정 조회 |

### 4.3 discovery-reports 라우트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ax-bd/discovery-reports/:itemId` | 리포트 조회 |
| PUT | `/ax-bd/discovery-reports/:itemId` | 리포트 생성/갱신 |
| POST | `/ax-bd/discovery-reports/:itemId/share` | 공유 토큰 생성 |

### 4.4 team-reviews 라우트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ax-bd/team-reviews/:itemId` | 아이템별 투표 조회 |
| POST | `/ax-bd/team-reviews/:itemId` | 투표 제출 (upsert) |
| GET | `/ax-bd/team-reviews/:itemId/summary` | 투표 집계 |

---

## 5. Frontend 컴포넌트 설계

### 5.1 IntensityIndicator.tsx (신규)

```typescript
interface IntensityIndicatorProps {
  intensity: 'core' | 'normal' | 'light';
  size?: 'sm' | 'md';
}
// ★핵심(green) / ○보통(blue) / △간소(gray) 배지
```

### 5.2 IntensityMatrix.tsx (신규)

```typescript
interface IntensityMatrixProps {
  discoveryType?: string;  // 현재 유형 하이라이트
  compact?: boolean;
}
// 5유형(I/M/P/T/S) × 7단계(2-1~2-7) 그리드
// analysis-path-v82.ts의 ANALYSIS_PATH_MAP 데이터를 하드코딩 (API 호출 불필요)
```

### 5.3 OutputJsonViewer.tsx (신규, POC)

```typescript
interface OutputJsonViewerProps {
  stageNum: string;       // "2-1", "2-2"
  outputJson: unknown;    // 비정형 JSON
}
// 1단계: JSON.stringify → pre 블록 렌더링
// 2단계: 주요 필드(title, summary, items) 감지 → 구조화 렌더링
```

### 5.4 WizardStepDetail.tsx (수정)

변경 사항:
1. **Props 추가**: `intensity?: 'core' | 'normal' | 'light'`
2. **Header 영역**: IntensityIndicator 배지 추가 (stage name 옆)
3. **간소(light) 단계**: "이 단계 건너뛰기" 버튼 추가 (status=pending일 때만)
4. 하위 호환: intensity prop 없으면 기존 동작 유지

---

## 6. Shared Types

### 6.1 discovery-v2.ts (신규)

```typescript
// packages/shared/src/discovery-v2.ts

export interface PersonaConfig {
  id: string;
  orgId: string;
  itemId: string;
  personaId: string;
  personaName: string;
  personaRole: string;
  weights: PersonaWeights;
  contextJson: Record<string, unknown>;
}

export interface PersonaWeights {
  strategic_fit: number;
  market_potential: number;
  technical_feasibility: number;
  financial_viability: number;
  competitive_advantage: number;
  risk_assessment: number;
  team_readiness: number;
}

export interface PersonaEval {
  id: string;
  orgId: string;
  itemId: string;
  personaId: string;
  scores: PersonaWeights;
  verdict: 'Go' | 'Conditional' | 'NoGo';
  summary: string;
  concern: string | null;
  condition: string | null;
}

export interface DiscoveryReport {
  id: string;
  orgId: string;
  itemId: string;
  reportJson: Record<string, unknown>;
  overallVerdict: 'Go' | 'Conditional' | 'NoGo' | null;
  teamDecision: 'Go' | 'Hold' | 'Drop' | null;
  sharedToken: string | null;
}

export interface TeamReview {
  id: string;
  orgId: string;
  itemId: string;
  reviewerId: string;
  reviewerName: string;
  decision: 'Go' | 'Hold' | 'Drop';
  comment: string | null;
}

export type Intensity = 'core' | 'normal' | 'light';
export type DiscoveryType = 'I' | 'M' | 'P' | 'T' | 'S';

// 강도 매트릭스 (analysis-path-v82.ts와 동일, 프론트엔드용)
export const INTENSITY_MATRIX: Record<string, Record<DiscoveryType, Intensity>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};
```

---

## 7. 테스트 설계

### 7.1 API 테스트 (4파일)

| 테스트 파일 | 검증 항목 |
|------------|-----------|
| `persona-configs.test.ts` | initDefaults 8인 시딩, getByItem, upsert, updateWeights |
| `persona-evals.test.ts` | save, getByItem, getOverallVerdict (3종 판정 로직) |
| `discovery-reports.test.ts` | upsert, getByItem, setTeamDecision, generateShareToken |
| `team-reviews.test.ts` | 투표 제출(upsert), 집계(summary), 중복 투표 방지 |

### 7.2 mock-d1.ts 추가 SQL

4개 신규 테이블의 CREATE TABLE을 `mock-d1.ts`에 추가.

---

## 8. 파일 매핑 (구현 순서)

| # | 파일 | F-item | 작업 |
|---|------|--------|------|
| 1 | `packages/shared/src/discovery-v2.ts` | F342 | 신규 — shared types |
| 2 | `packages/api/src/db/migrations/0098_persona_configs.sql` | F342 | 신규 |
| 3 | `packages/api/src/db/migrations/0099_persona_evals.sql` | F342 | 신규 |
| 4 | `packages/api/src/db/migrations/0100_discovery_reports.sql` | F342 | 신규 |
| 5 | `packages/api/src/db/migrations/0101_team_reviews.sql` | F342 | 신규 |
| 6 | `packages/api/src/schemas/persona-config-schema.ts` | F342 | 신규 |
| 7 | `packages/api/src/schemas/persona-eval-schema.ts` | F342 | 신규 |
| 8 | `packages/api/src/schemas/discovery-report-schema.ts` | F342 | 신규 |
| 9 | `packages/api/src/schemas/team-review-schema.ts` | F342 | 신규 |
| 10 | `packages/api/src/services/persona-config-service.ts` | F342 | 신규 |
| 11 | `packages/api/src/services/persona-eval-service.ts` | F342 | 신규 |
| 12 | `packages/api/src/services/discovery-report-service.ts` | F342 | 신규 |
| 13 | `packages/api/src/routes/persona-configs.ts` | F342 | 신규 |
| 14 | `packages/api/src/routes/persona-evals.ts` | F342 | 신규 |
| 15 | `packages/api/src/routes/discovery-reports.ts` | F342 | 신규 |
| 16 | `packages/api/src/routes/team-reviews.ts` | F342 | 신규 |
| 17 | `packages/api/src/index.ts` | F342 | 수정 — 라우트 등록 |
| 18 | `packages/api/src/__tests__/helpers/mock-d1.ts` | F342 | 수정 — 4테이블 추가 |
| 19 | `packages/api/src/__tests__/persona-configs.test.ts` | F342 | 신규 |
| 20 | `packages/api/src/__tests__/persona-evals.test.ts` | F342 | 신규 |
| 21 | `packages/api/src/__tests__/discovery-reports.test.ts` | F342 | 신규 |
| 22 | `packages/api/src/__tests__/team-reviews.test.ts` | F342 | 신규 |
| 23 | `packages/web/src/components/feature/discovery/IntensityIndicator.tsx` | F343 | 신규 |
| 24 | `packages/web/src/components/feature/discovery/IntensityMatrix.tsx` | F343 | 신규 |
| 25 | `packages/web/src/components/feature/discovery/OutputJsonViewer.tsx` | F343 | 신규 |
| 26 | `packages/web/src/components/feature/discovery/WizardStepDetail.tsx` | F343 | 수정 |

---

## 9. 리스크 & 완화

| 리스크 | 완화 |
|--------|------|
| 마이그레이션 번호 0098~0101 이미 사용 가능성 | `ls migrations/*.sql | sort | tail -1`로 확인 — 현재 0097까지 확인됨 |
| FK biz_items(id) 미존재 시 | `CREATE TABLE IF NOT EXISTS` + ON DELETE CASCADE |
| output_json 비정형 | POC는 JSON.stringify 폴백 + 구조화 시도 (실패해도 raw 표시) |
| WizardStepDetail 하위 호환 | intensity prop optional + 기본값 undefined → 기존 렌더 유지 |

---

## 10. 완료 기준 (Gap Analysis 체크리스트)

- [ ] 0098~0101 마이그레이션 4건 SQL 작성
- [ ] mock-d1.ts에 4테이블 추가
- [ ] PersonaConfigService + 라우트 + 스키마 + 테스트
- [ ] PersonaEvalService + 라우트 + 스키마 + 테스트
- [ ] DiscoveryReportService + 라우트 + 스키마 + 테스트
- [ ] TeamReview 라우트 + 스키마 + 테스트
- [ ] shared/discovery-v2.ts 타입 정의
- [ ] IntensityIndicator 컴포넌트
- [ ] IntensityMatrix 5×7 그리드
- [ ] OutputJsonViewer POC
- [ ] WizardStepDetail intensity prop 통합
- [ ] 라우트 등록 (index.ts)
- [ ] typecheck 통과
- [ ] lint 통과
- [ ] 테스트 전체 통과
