---
code: FX-DSGN-S105
title: "Sprint 105 — F276 DERIVED 엔진 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-268]], [[FX-PLAN-S105]], [[FX-DSGN-S103]], [[FX-DSGN-S104]]"
---

# Sprint 105: F276 DERIVED 엔진 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F276: Track C DERIVED 엔진 |
| Sprint | 105 |
| 상위 Plan | [[FX-PLAN-S105]] |
| 핵심 | D1 3테이블 + 패턴 추출 + 스킬 후보 생성 + HITL 승인 워크플로우 + API 8개 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 반복 성공 패턴이 암묵지 — 데이터 기반 스킬 최적화 불가 |
| Solution | DERIVED 엔진: skill_executions 분석 → 패턴 추출 → 스킬 후보 생성 → HITL 승인 |
| Function UX Effect | BD 단계별 고성공률 패턴 자동 추출, 승인 한 번으로 레지스트리 등록 |
| Core Value | 스킬 자가 진화 — 사용할수록 좋아지는 BD 도구 생태계 핵심 엔진 |

## §1 데이터 모델

### 1.1 derived_patterns — 성공 패턴 저장소

```sql
CREATE TABLE IF NOT EXISTS derived_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL
    CHECK(pipeline_stage IN ('collection', 'discovery', 'shaping', 'validation', 'productization', 'gtm')),
  discovery_stage TEXT
    CHECK(discovery_stage IS NULL OR discovery_stage IN (
      '2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9', '2-10'
    )),
  pattern_type TEXT NOT NULL DEFAULT 'single'
    CHECK(pattern_type IN ('single', 'chain')),
  skill_ids TEXT NOT NULL,  -- JSON array: ["skill_a", "skill_b"]
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  sample_count INTEGER NOT NULL CHECK(sample_count >= 1),
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'consumed', 'expired')),
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX idx_dp_tenant_stage ON derived_patterns(tenant_id, pipeline_stage, status);
CREATE INDEX idx_dp_confidence ON derived_patterns(confidence DESC);
CREATE INDEX idx_dp_status ON derived_patterns(status, expires_at);
```

### 1.2 derived_candidates — 스킬 후보

```sql
CREATE TABLE IF NOT EXISTS derived_candidates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general', 'bd-process', 'analysis', 'generation', 'validation', 'integration')),
  prompt_template TEXT NOT NULL,
  source_skills TEXT NOT NULL,  -- JSON: [{"skillId": "x", "contribution": 0.6}]
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(review_status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX idx_dc_tenant_status ON derived_candidates(tenant_id, review_status);
CREATE INDEX idx_dc_pattern ON derived_candidates(pattern_id);
```

### 1.3 derived_reviews — HITL 리뷰 이력

```sql
CREATE TABLE IF NOT EXISTS derived_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK(action IN ('approved', 'rejected', 'revision_requested')),
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dr_candidate ON derived_reviews(candidate_id);
CREATE INDEX idx_dr_tenant ON derived_reviews(tenant_id, created_at);
```

## §2 API 설계

### 2.1 엔드포인트 목록

| # | Method | Path | 설명 | Zod Schema |
|---|--------|------|------|------------|
| 1 | POST | `/api/skills/derived/extract` | 패턴 추출 실행 | extractPatternsSchema |
| 2 | GET | `/api/skills/derived/patterns` | 패턴 목록 조회 | listPatternsQuerySchema |
| 3 | GET | `/api/skills/derived/patterns/:patternId` | 패턴 상세 | — |
| 4 | POST | `/api/skills/derived/generate` | 패턴 → 스킬 후보 생성 | generateCandidateSchema |
| 5 | GET | `/api/skills/derived/candidates` | 후보 목록 조회 | listCandidatesQuerySchema |
| 6 | GET | `/api/skills/derived/candidates/:candidateId` | 후보 상세 | — |
| 7 | POST | `/api/skills/derived/candidates/:candidateId/review` | HITL 리뷰 | reviewCandidateSchema |
| 8 | GET | `/api/skills/derived/stats` | 엔진 통계 | — |

### 2.2 Zod 스키마

```typescript
// schemas/derived-engine.ts

export const extractPatternsSchema = z.object({
  pipelineStage: z.enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"]).optional(),
  discoveryStage: z.string().regex(/^2-\d{1,2}$/).optional(),
  minSampleCount: z.number().int().min(1).max(100).optional().default(5),
  minSuccessRate: z.number().min(0).max(1).optional().default(0.70),
  includeChains: z.boolean().optional().default(true),
});

export const listPatternsQuerySchema = z.object({
  pipelineStage: z.enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"]).optional(),
  status: z.enum(["active", "consumed", "expired"]).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const generateCandidateSchema = z.object({
  patternId: z.string().min(1),
  nameOverride: z.string().max(200).optional(),
  categoryOverride: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).optional(),
});

export const listCandidatesQuerySchema = z.object({
  reviewStatus: z.enum(["pending", "approved", "rejected", "revision_requested"]).optional(),
  category: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const reviewCandidateSchema = z.object({
  action: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().max(2000).optional(),
  modifiedPrompt: z.string().max(50000).optional(),
});
```

## §3 서비스 설계

### 3.1 PatternExtractorService

```
class PatternExtractorService {
  constructor(db: D1Database)

  extract(tenantId, params: ExtractParams) → { patterns: DerivedPattern[], count: number }
  getPatterns(tenantId, params: ListPatternsParams) → { patterns: DerivedPattern[], total: number }
  getPatternById(tenantId, patternId) → DerivedPattern | null
  getPatternDetail(tenantId, patternId) → DerivedPatternDetail
    // DerivedPatternDetail = DerivedPattern + { skills: SkillRegistryEntry[], sampleExecutions: SkillExecutionRecord[] }
  expireStale() → number  // 만료된 패턴 정리
}
```

**패턴 추출 알고리즘:**

#### 단일 스킬 패턴 (pattern_type='single')

```sql
-- Step 1: BD 단계별 스킬 성공률 집계
SELECT
  se.skill_id,
  ps.stage AS pipeline_stage,
  ds.stage_id AS discovery_stage,
  COUNT(*) AS sample_count,
  SUM(CASE WHEN se.status = 'completed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS success_rate,
  AVG(se.cost_usd) AS avg_cost_usd,
  AVG(se.duration_ms) AS avg_duration_ms
FROM skill_executions se
  LEFT JOIN pipeline_stages ps ON se.biz_item_id = ps.biz_item_id
  LEFT JOIN discovery_stages ds ON se.biz_item_id = ds.biz_item_id
WHERE se.tenant_id = ?
GROUP BY se.skill_id, ps.stage, ds.stage_id
HAVING sample_count >= :minSampleCount AND success_rate >= :minSuccessRate
```

```
-- Step 2: Wilson score lower bound 계산 (TypeScript)
confidence = wilsonScore(successRate, sampleCount, 0.95)
// z = 1.96 (95% CI)
// wilson = (p + z²/2n ± z√(p(1-p)/n + z²/4n²)) / (1 + z²/n)
// → lower bound 사용
```

#### 스킬 체이닝 패턴 (pattern_type='chain')

```sql
-- 같은 biz_item에서 30분 이내 연속 실행된 스킬 쌍
SELECT
  se1.skill_id AS skill_1,
  se2.skill_id AS skill_2,
  ps.stage AS pipeline_stage,
  COUNT(*) AS chain_count,
  SUM(CASE WHEN se1.status = 'completed' AND se2.status = 'completed' THEN 1 ELSE 0 END)
    * 1.0 / COUNT(*) AS chain_success_rate
FROM skill_executions se1
  JOIN skill_executions se2 ON se1.biz_item_id = se2.biz_item_id
    AND se1.tenant_id = se2.tenant_id
    AND se2.executed_at > se1.executed_at
    AND julianday(se2.executed_at) - julianday(se1.executed_at) < 0.0208  -- 30min
    AND se1.skill_id != se2.skill_id
  LEFT JOIN pipeline_stages ps ON se1.biz_item_id = ps.biz_item_id
WHERE se1.tenant_id = ?
GROUP BY se1.skill_id, se2.skill_id, ps.stage
HAVING chain_count >= 3 AND chain_success_rate >= 0.65
```

### 3.2 DerivedSkillGeneratorService

```
class DerivedSkillGeneratorService {
  constructor(db: D1Database)

  generate(tenantId, patternId, overrides?, actorId) → DerivedCandidate
  listCandidates(tenantId, params) → { candidates: DerivedCandidate[], total: number }
  getCandidateById(tenantId, candidateId) → DerivedCandidate | null
  getCandidateDetail(tenantId, candidateId) → DerivedCandidateDetail
    // DerivedCandidateDetail = DerivedCandidate + { pattern: DerivedPattern, reviews: DerivedReview[], sourceSkills: SkillRegistryEntry[] }
}
```

**스킬 후보 생성 로직:**

1. `derived_patterns`에서 패턴 조회 (status='active' 확인)
2. 패턴의 `skill_ids`로 `skill_registry`에서 원본 스킬 프롬프트 조회
3. 프롬프트 템플릿 합성:
   ```
   name: "{stage명} 최적화 — {skill_names} 기반"
   description: "{stage}에서 성공률 {rate}%로 검증된 패턴 기반 파생 스킬"
   prompt_template: 원본 스킬 프롬프트들의 공통 패턴 + 성공 조건 강조
   category: 원본 스킬 중 최다 카테고리
   source_skills: [{ skillId, contribution: 1/N }]
   ```
4. 기존 스킬 대비 중복 검사:
   - `SkillSearchService.search(name + description)` 실행
   - 최고 유사도를 `similarity_score`에 저장
   - 0.85 이상이면 경고 플래그 (생성은 차단하지 않음)
5. 안전성 사전 검사:
   - `SafetyChecker.check(promptTemplate)` 실행
   - safety_grade, safety_score 저장

### 3.3 DerivedReviewService

```
class DerivedReviewService {
  constructor(db: D1Database)

  review(tenantId, candidateId, params: ReviewParams, reviewerId) → DerivedReview
  getReviews(tenantId, candidateId) → DerivedReview[]
  getStats(tenantId) → DerivedStats
}
```

**리뷰 처리 로직:**

#### approved

```
1. INSERT derived_reviews (action='approved')
2. UPDATE derived_candidates SET review_status='approved', reviewed_at, reviewed_by
3. SkillRegistryService.register({
     skillId: "derived_{candidateId}",
     name, description, category,
     promptTemplate: modifiedPrompt ?? original,
     sourceType: 'derived',
     sourceRef: patternId
   })
4. INSERT skill_lineage — 각 source_skill에 대해:
     parent_skill_id=sourceSkill, child_skill_id=newSkill, derivation_type='derived'
5. skill_audit_log — action='created', details='DERIVED from pattern {patternId}'
6. UPDATE derived_candidates SET registered_skill_id = newSkillId
7. UPDATE derived_patterns SET status='consumed' WHERE id=patternId
```

#### rejected

```
1. INSERT derived_reviews (action='rejected')
2. UPDATE derived_candidates SET review_status='rejected', reviewed_at, reviewed_by
```

#### revision_requested

```
1. INSERT derived_reviews (action='revision_requested', modified_prompt)
2. UPDATE derived_candidates SET review_status='revision_requested', reviewed_at, reviewed_by
3. IF modifiedPrompt: UPDATE derived_candidates SET prompt_template=modifiedPrompt
4. 재안전성 검사: SafetyChecker.check(modifiedPrompt) → safety_grade/score 갱신
5. UPDATE derived_candidates SET review_status='pending'  // 다시 리뷰 대기열로
```

### 3.4 DerivedStats 구조

```typescript
export interface DerivedStats {
  totalPatterns: number;
  activePatterns: number;
  consumedPatterns: number;
  expiredPatterns: number;
  totalCandidates: number;
  pendingCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  approvalRate: number;       // approved / (approved + rejected)
  registeredSkills: number;   // approved + registered
  avgConfidence: number;      // 활성 패턴 평균 신뢰도
  topStages: { stage: string; patternCount: number }[];
}
```

## §4 Shared 타입 확장

```typescript
// packages/shared/src/types.ts에 추가

// ─── F276: DERIVED 엔진 타입 ───

export type DerivedPatternType = "single" | "chain";
export type DerivedPatternStatus = "active" | "consumed" | "expired";
export type DerivedReviewStatus = "pending" | "approved" | "rejected" | "revision_requested";

export type PipelineStage = "collection" | "discovery" | "shaping" | "validation" | "productization" | "gtm";

export interface DerivedPattern {
  id: string;
  tenantId: string;
  pipelineStage: PipelineStage;
  discoveryStage: string | null;
  patternType: DerivedPatternType;
  skillIds: string[];
  successRate: number;
  sampleCount: number;
  avgCostUsd: number;
  avgDurationMs: number;
  confidence: number;
  status: DerivedPatternStatus;
  extractedAt: string;
  expiresAt: string | null;
}

export interface DerivedPatternDetail extends DerivedPattern {
  skills: SkillRegistryEntry[];
  sampleExecutions: SkillExecutionRecord[];
}

export interface DerivedCandidate {
  id: string;
  tenantId: string;
  patternId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  promptTemplate: string;
  sourceSkills: { skillId: string; contribution: number }[];
  similarityScore: number;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  reviewStatus: DerivedReviewStatus;
  registeredSkillId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface DerivedCandidateDetail extends DerivedCandidate {
  pattern: DerivedPattern;
  reviews: DerivedReview[];
  sourceSkillEntries: SkillRegistryEntry[];
}

export interface DerivedReview {
  id: string;
  tenantId: string;
  candidateId: string;
  action: "approved" | "rejected" | "revision_requested";
  comment: string | null;
  modifiedPrompt: string | null;
  reviewerId: string;
  createdAt: string;
}

export interface DerivedStats {
  totalPatterns: number;
  activePatterns: number;
  consumedPatterns: number;
  expiredPatterns: number;
  totalCandidates: number;
  pendingCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  approvalRate: number;
  registeredSkills: number;
  avgConfidence: number;
  topStages: { stage: string; patternCount: number }[];
}
```

## §5 라우트 설계

```typescript
// routes/derived-engine.ts

export const derivedEngineRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) POST /skills/derived/extract — 패턴 추출
derivedEngineRoute.post("/skills/derived/extract", async (c) => {
  const body = await c.req.json();
  const parsed = extractPatternsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new PatternExtractorService(c.env.DB);
  const result = await svc.extract(c.get("orgId"), parsed.data);
  return c.json(result, 201);
});

// 2) GET /skills/derived/patterns — 패턴 목록
derivedEngineRoute.get("/skills/derived/patterns", async (c) => {
  const parsed = listPatternsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new PatternExtractorService(c.env.DB);
  const result = await svc.getPatterns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 3) GET /skills/derived/patterns/:patternId — 패턴 상세
derivedEngineRoute.get("/skills/derived/patterns/:patternId", async (c) => {
  const svc = new PatternExtractorService(c.env.DB);
  const detail = await svc.getPatternDetail(c.get("orgId"), c.req.param("patternId"));
  if (!detail) return c.json({ error: "Pattern not found" }, 404);
  return c.json(detail);
});

// 4) POST /skills/derived/generate — 스킬 후보 생성
derivedEngineRoute.post("/skills/derived/generate", async (c) => {
  const body = await c.req.json();
  const parsed = generateCandidateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const result = await svc.generate(
    c.get("orgId"), parsed.data.patternId,
    { nameOverride: parsed.data.nameOverride, categoryOverride: parsed.data.categoryOverride },
    c.get("userId"),
  );
  return c.json(result, 201);
});

// 5) GET /skills/derived/candidates — 후보 목록
derivedEngineRoute.get("/skills/derived/candidates", async (c) => {
  const parsed = listCandidatesQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const result = await svc.listCandidates(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 6) GET /skills/derived/candidates/:candidateId — 후보 상세
derivedEngineRoute.get("/skills/derived/candidates/:candidateId", async (c) => {
  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const detail = await svc.getCandidateDetail(c.get("orgId"), c.req.param("candidateId"));
  if (!detail) return c.json({ error: "Candidate not found" }, 404);
  return c.json(detail);
});

// 7) POST /skills/derived/candidates/:candidateId/review — HITL 리뷰
derivedEngineRoute.post("/skills/derived/candidates/:candidateId/review", async (c) => {
  const body = await c.req.json();
  const parsed = reviewCandidateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new DerivedReviewService(c.env.DB);
  const result = await svc.review(
    c.get("orgId"), c.req.param("candidateId"), parsed.data, c.get("userId"),
  );
  return c.json(result, 201);
});

// 8) GET /skills/derived/stats — 엔진 통계
derivedEngineRoute.get("/skills/derived/stats", async (c) => {
  const svc = new DerivedReviewService(c.env.DB);
  const stats = await svc.getStats(c.get("orgId"));
  return c.json(stats);
});
```

**index.ts 라우트 등록:**
```typescript
import { derivedEngineRoute } from "./routes/derived-engine.js";
app.route("/api", derivedEngineRoute);
```

## §6 Wilson Score 구현

```typescript
// services/pattern-extractor.ts 내부

function wilsonScoreLowerBound(successRate: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = successRate;
  const denominator = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const adjust = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (centre - adjust) / denominator;
}
```

## §7 파일 목록

| # | 파일 | 구분 | 설명 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0082_derived_engine.sql` | 신규 | D1 마이그레이션 (3테이블) |
| 2 | `packages/shared/src/types.ts` | 수정 | DerivedPattern/Candidate/Review/Stats + PipelineStage 타입 |
| 3 | `packages/shared/src/index.ts` | 수정 | 타입 re-export 추가 |
| 4 | `packages/api/src/schemas/derived-engine.ts` | 신규 | Zod 스키마 5개 |
| 5 | `packages/api/src/services/pattern-extractor.ts` | 신규 | PatternExtractorService |
| 6 | `packages/api/src/services/derived-skill-generator.ts` | 신규 | DerivedSkillGeneratorService |
| 7 | `packages/api/src/services/derived-review.ts` | 신규 | DerivedReviewService |
| 8 | `packages/api/src/routes/derived-engine.ts` | 신규 | API 라우트 8개 |
| 9 | `packages/api/src/index.ts` | 수정 | 라우트 등록 |
| 10 | `packages/api/src/__tests__/pattern-extractor-service.test.ts` | 신규 | 추출 서비스 테스트 |
| 11 | `packages/api/src/__tests__/derived-generator-service.test.ts` | 신규 | 생성 서비스 테스트 |
| 12 | `packages/api/src/__tests__/derived-review-service.test.ts` | 신규 | 리뷰 서비스 테스트 |
| 13 | `packages/api/src/__tests__/derived-engine-routes.test.ts` | 신규 | 라우트 테스트 |

## §8 테스트 설계

### 8.1 PatternExtractorService 테스트 (~8개)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 단일 스킬 패턴 추출 — 성공률 80%, 샘플 10 | 패턴 생성됨, confidence > 0 |
| 2 | 임계값 미달 필터링 — 성공률 50% | 패턴 미생성 |
| 3 | 샘플 수 미달 — 3개 (기본 5 미만) | 패턴 미생성 |
| 4 | 파이프라인 단계 필터 | 해당 단계만 추출 |
| 5 | 체이닝 패턴 추출 — 2스킬 연속 성공 | chain 타입 패턴 생성 |
| 6 | 빈 데이터 | 빈 결과, 에러 없음 |
| 7 | 패턴 목록 조회 + 페이지네이션 | limit/offset 동작 |
| 8 | 패턴 상세 — 스킬 정보 + 샘플 실행 포함 | DerivedPatternDetail 구조 |

### 8.2 DerivedSkillGeneratorService 테스트 (~6개)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 후보 생성 — 정상 | DerivedCandidate 반환, pending 상태 |
| 2 | 존재하지 않는 패턴 | 404 또는 null |
| 3 | consumed 패턴에서 생성 시도 | 에러 |
| 4 | 중복 감지 — similarity_score > 0.85 | 경고 플래그 포함 |
| 5 | 안전성 사전 검사 — D등급 프롬프트 | safety_grade='D' 저장 |
| 6 | 후보 목록 + 필터 (reviewStatus, category) | 필터 동작 |

### 8.3 DerivedReviewService 테스트 (~8개)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | approved → skill_registry 등록 | registered_skill_id 존재, sourceType='derived' |
| 2 | approved → skill_lineage 기록 | derivation_type='derived' |
| 3 | approved → audit_log 기록 | action='created' |
| 4 | approved → 패턴 consumed | derived_patterns.status='consumed' |
| 5 | rejected | review_status='rejected', registry 미등록 |
| 6 | revision_requested — 프롬프트 수정 | prompt_template 갱신, pending 복귀 |
| 7 | revision_requested — 안전성 재검사 | safety_grade/score 갱신 |
| 8 | 통계 조회 | DerivedStats 구조 + approvalRate 계산 |

### 8.4 derived-engine 라우트 테스트 (~18개)

각 엔드포인트 × (정상 + 에러) = 8 × ~2.25

## §9 구현 순서

```
1. D1 마이그레이션 0082_derived_engine.sql
2. Shared 타입 (types.ts + index.ts)
3. Zod 스키마 (schemas/derived-engine.ts)
4. PatternExtractorService + 테스트
5. DerivedSkillGeneratorService + 테스트
6. DerivedReviewService + 테스트
7. 라우트 (routes/derived-engine.ts) + 테스트
8. index.ts 라우트 등록
```

## §10 의존성 그래프

```
skill_executions (0080, F274) ──→ PatternExtractorService ──→ derived_patterns
                                                                    │
skill_registry (0081, F275) ──→ DerivedSkillGeneratorService ←──────┘
SkillSearchService (F275)   ──→       │                        derived_candidates
SafetyChecker (F275)        ──→       │                              │
                                      └──────────────────────────────┘
                                                                     │
SkillRegistryService (F275) ──→ DerivedReviewService ←───────────────┘
SkillMetricsService (F274)  ──→       │
skill_lineage (0080)        ←─────────┘  (승인 시 파생관계 기록)
skill_audit_log (0080)      ←─────────┘  (승인 시 감사 로그)
```
