---
code: FX-DSGN-S112
title: "Sprint 112 — F286+F287 BD 형상화 Phase F + D1/E2E Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-PLAN-S112]], [[FX-SPEC-001]], [[FX-BD-SHAPING-001]]"
---

# Sprint 112 Design: F286+F287 BD 형상화 Phase F + D1/E2E

## 1. 구현 순서 체크리스트

```
[1] D1 마이그레이션 0084 — shaping 4테이블 + 인덱스
[2] API 서비스: ShapingService (CRUD + 조인)
[3] API 스키마: shaping.ts (Zod 10종)
[4] API 라우트: shaping.ts (13 EP)
[5] API app.ts 라우트 등록
[6] API 테스트: shaping.test.ts (~35)
[7] 승인 워크플로 서비스: ShapingReviewService
[8] auto-reviewer 에이전트: .claude/agents/auto-reviewer.md
[9] Web 페이지: shaping.tsx (목록) + shaping-detail.tsx (에디터)
[10] Web 컴포넌트: ShapingRunCard, SectionReviewAction, ExpertReviewPanel
[11] Web router.tsx + sidebar.tsx 등록
[12] Web 테스트 (~10)
[13] E2E 테스트: shaping.spec.ts (~5 specs)
```

---

## 2. D1 마이그레이션 (F287)

### 파일: `packages/api/src/db/migrations/0084_shaping_tables.sql`

```sql
-- F287: BD 형상화 Phase F — shaping 이력 + 리뷰 + Six Hats 4테이블

-- 1. shaping_runs — 형상화 실행 이력
CREATE TABLE IF NOT EXISTS shaping_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  discovery_prd_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','completed','failed','escalated')),
  mode TEXT NOT NULL DEFAULT 'hitl'
    CHECK(mode IN ('hitl','auto')),
  current_phase TEXT NOT NULL DEFAULT 'A'
    CHECK(current_phase IN ('A','B','C','D','E','F')),
  total_iterations INTEGER NOT NULL DEFAULT 0,
  max_iterations INTEGER NOT NULL DEFAULT 3,
  quality_score REAL,
  token_cost INTEGER NOT NULL DEFAULT 0,
  token_limit INTEGER NOT NULL DEFAULT 500000,
  git_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_shaping_runs_tenant_status ON shaping_runs(tenant_id, status);
CREATE INDEX idx_shaping_runs_prd ON shaping_runs(discovery_prd_id);

-- 2. shaping_phase_logs — Phase별 실행 로그
CREATE TABLE IF NOT EXISTS shaping_phase_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('A','B','C','D','E','F')),
  round INTEGER NOT NULL DEFAULT 0,
  input_snapshot TEXT,
  output_snapshot TEXT,
  verdict TEXT CHECK(verdict IN ('PASS','MINOR_FIX','MAJOR_ISSUE','ESCALATED')),
  quality_score REAL,
  findings TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_phase_logs_run ON shaping_phase_logs(run_id, phase);

-- 3. shaping_expert_reviews — 전문가 리뷰 결과
CREATE TABLE IF NOT EXISTS shaping_expert_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  expert_role TEXT NOT NULL CHECK(expert_role IN ('TA','AA','CA','DA','QA')),
  review_body TEXT NOT NULL,
  findings TEXT,
  quality_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_expert_reviews_run ON shaping_expert_reviews(run_id);

-- 4. shaping_six_hats — Six Hats 토론 기록
CREATE TABLE IF NOT EXISTS shaping_six_hats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  hat_color TEXT NOT NULL CHECK(hat_color IN ('white','red','black','yellow','green','blue')),
  round INTEGER NOT NULL,
  opinion TEXT NOT NULL,
  verdict TEXT CHECK(verdict IN ('accept','concern','reject')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_six_hats_run ON shaping_six_hats(run_id, round);
```

### PRD §6 대비 변경사항

| PRD 원본 | 변경 | 이유 |
|----------|------|------|
| `org_id` | `tenant_id` | Foundry-X 코드베이스 컨벤션 통일 (모든 테이블이 tenant_id 사용) |
| FK REFERENCES 제약 | 제거 | D1은 외래 키를 지원하지만 인덱스 기반 조인이 안정적 — 기존 패턴 답습 |
| `git_path` 컬럼 | shaping_runs에 추가 | 산출물 Git 경로 기록 (Plan §4) |

---

## 3. API 서비스 설계

### 3.1 ShapingService (`packages/api/src/services/shaping-service.ts`)

```typescript
export class ShapingService {
  constructor(private db: D1Database) {}

  // ── shaping_runs CRUD ──
  async createRun(tenantId: string, params: CreateShapingRunInput): Promise<ShapingRun>
  async listRuns(tenantId: string, query: ListShapingRunsQuery): Promise<{ items: ShapingRun[]; total: number }>
  async getRunDetail(tenantId: string, runId: string): Promise<ShapingRunDetail | null>
  // ShapingRunDetail = ShapingRun + phaseLogs[] + expertReviews[] + sixHats[]
  async updateRun(tenantId: string, runId: string, params: UpdateShapingRunInput): Promise<ShapingRun | null>

  // ── shaping_phase_logs ──
  async addPhaseLog(runId: string, params: CreatePhaseLogInput): Promise<ShapingPhaseLog>
  async listPhaseLogs(runId: string): Promise<ShapingPhaseLog[]>

  // ── shaping_expert_reviews ──
  async addExpertReview(runId: string, params: CreateExpertReviewInput): Promise<ShapingExpertReview>
  async listExpertReviews(runId: string): Promise<ShapingExpertReview[]>

  // ── shaping_six_hats ──
  async addSixHats(runId: string, params: CreateSixHatsInput): Promise<ShapingSixHats>
  async listSixHats(runId: string): Promise<ShapingSixHats[]>
}
```

**패턴**: captured-engine의 `WorkflowPatternExtractorService` + `CapturedSkillGeneratorService` 패턴 답습.
- constructor에 `D1Database` 주입
- 모든 메서드에 `tenantId` 첫 파라미터
- ID 생성: `lower(hex(randomblob(16)))` (SQL DEFAULT) 또는 서비스에서 `crypto.randomUUID()`

### 3.2 ShapingReviewService (`packages/api/src/services/shaping-review-service.ts`)

```typescript
export class ShapingReviewService {
  constructor(private db: D1Database) {}

  // HITL 섹션별 리뷰
  async reviewSection(
    tenantId: string,
    runId: string,
    params: ReviewSectionInput,
    reviewerId: string,
  ): Promise<ReviewResult>
  // params.action: 'approved' | 'revision_requested' | 'rejected'
  // params.section: 섹션 이름 (e.g. "사업 타당성", "기술 실현성")
  // params.comment: 수정요청/반려 사유

  // 자동 모드: AI 3 페르소나 리뷰
  async autoReview(tenantId: string, runId: string): Promise<AutoReviewResult>
  // 3 페르소나 결과를 phase_logs에 기록
  // consensus: 3/3 Pass → run status='completed', 1+ Fail → status='escalated'

  // 2단계 PRD 대비 diff
  async getDiff(tenantId: string, runId: string): Promise<DiffResult>
  // discovery_prd_id로 원본 PRD 조회 → 최종 PRD와 diff
}
```

**상태 전환 다이어그램:**
```
running ──(Phase F 진입)──→ running (current_phase='F')
  │
  ├── HITL 전체 승인 ──→ completed
  ├── HITL 반려 ──→ failed (+ Phase A 회귀 메모)
  ├── 자동모드 3/3 Pass ──→ completed
  └── 자동모드 1+ Fail ──→ escalated (→ HITL 전환)
```

---

## 4. API 스키마 설계 (`packages/api/src/schemas/shaping.ts`)

```typescript
import { z } from "zod";

// ── Create Run ──
export const createShapingRunSchema = z.object({
  discoveryPrdId: z.string().min(1),
  mode: z.enum(["hitl", "auto"]).default("hitl"),
  gitPath: z.string().max(500).optional(),
  maxIterations: z.number().int().min(1).max(10).optional().default(3),
  tokenLimit: z.number().int().min(10000).max(2000000).optional().default(500000),
});

// ── Update Run ──
export const updateShapingRunSchema = z.object({
  status: z.enum(["running", "completed", "failed", "escalated"]).optional(),
  currentPhase: z.enum(["A", "B", "C", "D", "E", "F"]).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  tokenCost: z.number().int().min(0).optional(),
  gitPath: z.string().max(500).optional(),
});

// ── List Runs Query ──
export const listShapingRunsQuerySchema = z.object({
  status: z.enum(["running", "completed", "failed", "escalated"]).optional(),
  mode: z.enum(["hitl", "auto"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ── Phase Log ──
export const createPhaseLogSchema = z.object({
  phase: z.enum(["A", "B", "C", "D", "E", "F"]),
  round: z.number().int().min(0).default(0),
  inputSnapshot: z.string().max(50000).optional(),
  outputSnapshot: z.string().max(50000).optional(),
  verdict: z.enum(["PASS", "MINOR_FIX", "MAJOR_ISSUE", "ESCALATED"]).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  findings: z.string().max(50000).optional(),
  durationMs: z.number().int().min(0).optional(),
});

// ── Expert Review ──
export const createExpertReviewSchema = z.object({
  expertRole: z.enum(["TA", "AA", "CA", "DA", "QA"]),
  reviewBody: z.string().min(1).max(100000),
  findings: z.string().max(50000).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
});

// ── Six Hats ──
export const createSixHatsSchema = z.object({
  hatColor: z.enum(["white", "red", "black", "yellow", "green", "blue"]),
  round: z.number().int().min(1),
  opinion: z.string().min(1).max(50000),
  verdict: z.enum(["accept", "concern", "reject"]).optional(),
});

// ── HITL Review ──
export const reviewSectionSchema = z.object({
  action: z.enum(["approved", "revision_requested", "rejected"]),
  section: z.string().min(1).max(200),
  comment: z.string().max(5000).optional(),
});

// ── Auto Review Result (내부 사용) ──
export const autoReviewResultSchema = z.object({
  persona: z.string(),
  pass: z.boolean(),
  reasoning: z.string(),
});
```

---

## 5. API 라우트 설계 (`packages/api/src/routes/shaping.ts`)

```typescript
export const shapingRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── F287: CRUD 10 EP ───

// 1) POST /shaping/runs
// 2) GET /shaping/runs  (listShapingRunsQuerySchema)
// 3) GET /shaping/runs/:runId  (조인: run + logs + reviews + hats)
// 4) PATCH /shaping/runs/:runId  (updateShapingRunSchema)
// 5) POST /shaping/runs/:runId/phase-logs
// 6) GET /shaping/runs/:runId/phase-logs
// 7) POST /shaping/runs/:runId/expert-reviews
// 8) GET /shaping/runs/:runId/expert-reviews
// 9) POST /shaping/runs/:runId/six-hats
// 10) GET /shaping/runs/:runId/six-hats

// ─── F286: 승인 워크플로 3 EP ───

// 11) POST /shaping/runs/:runId/review  (reviewSectionSchema)
// 12) POST /shaping/runs/:runId/auto-review  (no body — 서버측 AI 호출)
// 13) GET /shaping/runs/:runId/diff  (discovery_prd_id 기반 diff)
```

**app.ts 등록:**
```typescript
import { shapingRoute } from "./routes/shaping.js";
// ...
app.route("/api", shapingRoute); // tenantGuard 내부에 위치
```

---

## 6. auto-reviewer 에이전트 (F286)

### 파일: `.claude/agents/auto-reviewer.md`

```markdown
---
name: auto-reviewer
description: BD 형상화 Phase F — AI 자가 리뷰 3 페르소나 (HITL 대체)
tools: Read, Grep, Glob
---

3 페르소나 관점에서 형상화 PRD를 독립 리뷰:

1. **product-owner**: 사업 KPI 달성 경로가 명확하고 현실적인가?
2. **tech-lead**: 기술적 모호함 없이 개발팀이 즉시 착수 가능한가?
3. **end-user**: 핵심 가치가 직관적으로 이해되고 매력적인가?

판정: 3 Pass → 자동 승인 / 1 Fail → HITL 에스컬레이션
```

---

## 7. Web 페이지 설계 (F286)

### 7.1 목록 페이지: `packages/web/src/routes/ax-bd/shaping.tsx`

```
┌───────────────────────────────────────────────────┐
│  BD 형상화                                    [+ New] │
├───────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐      │
│ │ [running 🔄] 헬스케어 AI 플랫폼           │      │
│ │ Quality: 0.87 │ Phase: E │ Mode: HITL   │      │
│ │ Created: 2026-04-03 14:00               │      │
│ └─────────────────────────────────────────┘      │
│ ┌─────────────────────────────────────────┐      │
│ │ [completed ✅] GIVC 영상면접 도구          │      │
│ │ Quality: 0.92 │ Phase: F │ Mode: Auto   │      │
│ │ Completed: 2026-04-02 18:30             │      │
│ └─────────────────────────────────────────┘      │
└───────────────────────────────────────────────────┘
```

**구현:**
- `fetchApi<{ items: ShapingRun[]; total: number }>("/shaping/runs")` 호출
- 상태별 필터 탭: all / running / completed / escalated
- 카드 클릭 → `/ax-bd/shaping/:runId`

### 7.2 에디터 페이지: `packages/web/src/routes/ax-bd/shaping-detail.tsx`

```
┌───────────────────────────────────────────┬──────────────────────┐
│  ← 형상화 목록                              │  전문가 리뷰          │
│                                           │                      │
│  [running 🔄] 헬스케어 AI 플랫폼             │  [TA] [AA] [CA] [DA] [QA] │
│  Quality: 0.87 │ Phase: E │ Mode: HITL    │                      │
│                                           │  TA 리뷰:             │
│  ── 섹션 1: 사업 타당성 ──────────────────  │  시스템 아키텍처      │
│  │ 마크다운 렌더링 내용...                   │  확장성 설계가 ...    │
│  │ ...                                    │  ...                 │
│  │ [✅ 승인] [📝 수정요청] [❌ 반려]         │                      │
│  ──────────────────────────────────────── │                      │
│                                           │                      │
│  ── 섹션 2: 기술 실현성 ──────────────────  │                      │
│  │ 마크다운 렌더링 내용...                   │                      │
│  │ [✅ 승인] [📝 수정요청] [❌ 반려]         │                      │
│  ──────────────────────────────────────── │                      │
│                                           │                      │
│  ── 변경 이력 (diff) ────────────────────  │                      │
│  │ + 추가된 내용 (녹색)                     │                      │
│  │ - 삭제된 내용 (빨간색)                    │                      │
├───────────────────────────────────────────┤                      │
│  [전체 승인] [자동 리뷰 실행]                 │                      │
└───────────────────────────────────────────┴──────────────────────┘
```

**구현 상세:**
- `fetchApi<ShapingRunDetail>(\`/shaping/runs/${runId}\`)` — run + logs + reviews + hats 전체
- 마크다운 렌더링: `<ReactMarkdown remarkPlugins={[remarkGfm]}>` (ArtifactDetail.tsx 패턴)
- 섹션 분할: PRD 본문을 `## ` 헤딩 기준으로 split
- 인라인 액션: `SectionReviewAction` 컴포넌트 — 버튼 클릭 → 모달(사유 입력) → `POST /shaping/runs/:runId/review`
- 사이드 패널: `ExpertReviewPanel` — expert_role 탭 전환, review_body 마크다운 렌더링
- 하단 diff: `GET /shaping/runs/:runId/diff` 결과를 `+/-` 색상으로 표시
- 자동 리뷰: `POST /shaping/runs/:runId/auto-review` → 결과 새로고침

### 7.3 컴포넌트

| 컴포넌트 | 파일 | Props |
|----------|------|-------|
| ShapingRunCard | `components/feature/shaping/ShapingRunCard.tsx` | `{ run: ShapingRun; onClick: () => void }` |
| SectionReviewAction | `components/feature/shaping/SectionReviewAction.tsx` | `{ runId: string; section: string; onReview: (result) => void }` |
| ExpertReviewPanel | `components/feature/shaping/ExpertReviewPanel.tsx` | `{ reviews: ShapingExpertReview[] }` |

### 7.4 라우터 + 사이드바

**router.tsx 추가:**
```typescript
{ path: "ax-bd/shaping", lazy: () => import("@/routes/ax-bd/shaping") },
{ path: "ax-bd/shaping/:runId", lazy: () => import("@/routes/ax-bd/shaping-detail") },
```

**sidebar.tsx 추가:**
- "형상화" 메뉴 항목 (ax-bd 섹션 하위, "발굴" 아래)

---

## 8. 공유 타입 (`packages/shared/src/ax-bd.ts` 확장)

```typescript
// ── Shaping Types ──
export interface ShapingRun {
  id: string;
  tenantId: string;
  discoveryPrdId: string;
  status: "running" | "completed" | "failed" | "escalated";
  mode: "hitl" | "auto";
  currentPhase: "A" | "B" | "C" | "D" | "E" | "F";
  totalIterations: number;
  maxIterations: number;
  qualityScore: number | null;
  tokenCost: number;
  tokenLimit: number;
  gitPath: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ShapingPhaseLog {
  id: string;
  runId: string;
  phase: "A" | "B" | "C" | "D" | "E" | "F";
  round: number;
  inputSnapshot: string | null;
  outputSnapshot: string | null;
  verdict: "PASS" | "MINOR_FIX" | "MAJOR_ISSUE" | "ESCALATED" | null;
  qualityScore: number | null;
  findings: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ShapingExpertReview {
  id: string;
  runId: string;
  expertRole: "TA" | "AA" | "CA" | "DA" | "QA";
  reviewBody: string;
  findings: string | null;
  qualityScore: number | null;
  createdAt: string;
}

export interface ShapingSixHats {
  id: string;
  runId: string;
  hatColor: "white" | "red" | "black" | "yellow" | "green" | "blue";
  round: number;
  opinion: string;
  verdict: "accept" | "concern" | "reject" | null;
  createdAt: string;
}

export interface ShapingRunDetail extends ShapingRun {
  phaseLogs: ShapingPhaseLog[];
  expertReviews: ShapingExpertReview[];
  sixHats: ShapingSixHats[];
}

export interface ReviewResult {
  runId: string;
  section: string;
  action: "approved" | "revision_requested" | "rejected";
  newStatus: string;
}

export interface AutoReviewResult {
  runId: string;
  results: Array<{
    persona: string;
    pass: boolean;
    reasoning: string;
  }>;
  consensus: "approved" | "escalated";
  newStatus: string;
}
```

---

## 9. 테스트 설계

### 9.1 API 테스트 (`packages/api/src/__tests__/shaping.test.ts`)

| 그룹 | 케이스 | 수 |
|------|--------|---|
| POST /shaping/runs | 성공 생성 (hitl/auto), 잘못된 mode → 400, discoveryPrdId 누락 → 400 | 3 |
| GET /shaping/runs | 목록 조회 (페이지네이션), status 필터, 빈 결과 | 3 |
| GET /shaping/runs/:runId | 상세 조인 (logs+reviews+hats), 미존재 → 404 | 2 |
| PATCH /shaping/runs/:runId | 상태/Phase 갱신, 미존재 → 404 | 2 |
| POST /phase-logs | 성공 추가, 잘못된 phase → 400 | 2 |
| GET /phase-logs | 목록 조회 | 1 |
| POST /expert-reviews | 성공 추가, 잘못된 role → 400 | 2 |
| GET /expert-reviews | 목록 조회 | 1 |
| POST /six-hats | 성공 추가, 잘못된 hat → 400 | 2 |
| GET /six-hats | 목록 조회 | 1 |
| POST /review (HITL) | 승인→completed, 수정요청, 반려→failed | 3 |
| POST /auto-review | 3/3 Pass→completed, 1 Fail→escalated | 2 |
| GET /diff | 정상 diff, discovery_prd 미존재 → 404 | 2 |
| **테넌트 격리** | 다른 tenant 데이터 접근 불가 | 2 |
| **합계** | | **~28** |

### 9.2 테스트 헬퍼 수정

`packages/api/src/__tests__/helpers/mock-d1.ts`에 0084 SQL 추가:
```typescript
// shaping_runs, shaping_phase_logs, shaping_expert_reviews, shaping_six_hats
```

### 9.3 Web 테스트 (`packages/web/src/__tests__/shaping.test.tsx`)

| 케이스 | 수 |
|--------|---|
| ShapingRunCard 렌더링 (status별 배지) | 3 |
| SectionReviewAction 버튼 클릭 → 모달 | 2 |
| ExpertReviewPanel 탭 전환 | 2 |
| 목록 페이지 렌더링 | 1 |
| 에디터 페이지 마크다운 렌더링 | 2 |
| **합계** | **~10** |

### 9.4 E2E 테스트 (`packages/web/e2e/shaping.spec.ts`)

| Spec | 시나리오 |
|------|----------|
| 1 | 형상화 목록 페이지 접근 + 카드 표시 |
| 2 | 형상화 상세 페이지 마크다운 렌더링 |
| 3 | 섹션별 승인 모달 → 승인 클릭 |
| 4 | 전문가 리뷰 사이드 패널 탭 전환 |
| 5 | 자동 리뷰 버튼 클릭 → 결과 표시 |

---

## 10. 변경 파일 최종 목록

### 신규 (~15)

| # | 파일 |
|---|------|
| 1 | `packages/api/src/db/migrations/0084_shaping_tables.sql` |
| 2 | `packages/api/src/services/shaping-service.ts` |
| 3 | `packages/api/src/services/shaping-review-service.ts` |
| 4 | `packages/api/src/schemas/shaping.ts` |
| 5 | `packages/api/src/routes/shaping.ts` |
| 6 | `packages/api/src/__tests__/shaping.test.ts` |
| 7 | `.claude/agents/auto-reviewer.md` |
| 8 | `packages/web/src/routes/ax-bd/shaping.tsx` |
| 9 | `packages/web/src/routes/ax-bd/shaping-detail.tsx` |
| 10 | `packages/web/src/components/feature/shaping/ShapingRunCard.tsx` |
| 11 | `packages/web/src/components/feature/shaping/SectionReviewAction.tsx` |
| 12 | `packages/web/src/components/feature/shaping/ExpertReviewPanel.tsx` |
| 13 | `packages/web/src/__tests__/shaping.test.tsx` |
| 14 | `packages/web/e2e/shaping.spec.ts` |

### 수정 (~5)

| # | 파일 | 변경 |
|---|------|------|
| 1 | `packages/api/src/app.ts` | `import { shapingRoute }` + `app.route("/api", shapingRoute)` |
| 2 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 0084 SQL 추가 |
| 3 | `packages/shared/src/ax-bd.ts` | Shaping 타입 추가 |
| 4 | `packages/web/src/router.tsx` | shaping 라우트 2개 |
| 5 | `packages/web/src/components/sidebar.tsx` | "형상화" 메뉴 |
