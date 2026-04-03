---
code: FX-DSGN-CAPTURED
title: "captured-engine — F277 CAPTURED 엔진 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-CAPTURED]], [[FX-DSGN-SKILLEVOL]]"
---

# captured-engine: F277 CAPTURED 엔진 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F277 CAPTURED 엔진 — 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성 |
| 기간 | Sprint 106 (1 Sprint) |
| 핵심 전략 | F276 DERIVED 엔진과 대칭적 3-서비스 구조 재활용 + workflow_executions 조인 분석 추가 |
| Plan | docs/01-plan/features/captured-engine.plan.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 개별 스킬 패턴만 추출 가능, 워크플로우 수준의 크로스 도메인 성공 패턴은 캡처 불가 |
| Solution | workflow_executions × skill_executions 조인 → 시퀀스 패턴 추출 → 메타 스킬 생성 → HITL |
| Function UX Effect | BD 파이프라인 전체에서 반복 성공 워크플로우를 자동 감지·재활용 |
| Core Value | 개별 스킬 최적화 → 워크플로우 수준 최적화 전환 |

---

## 1. 아키텍처 개요

### 1.1 DERIVED vs CAPTURED 병렬 구조

```
                      ┌─────────────────────┐
                      │  skill_executions    │
                      │  (F274)              │
                      └─────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
    ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ DERIVED (F276) │  │ CAPTURED (F277)  │  │ skill_registry   │
    │ single/chain   │  │ workflow seq     │  │ (F275)           │
    │ patterns       │  │ patterns         │  │                  │
    └───────┬───────┘  └────────┬─────────┘  └──────────────────┘
            │                   │                       ▲
            │   HITL 승인       │   HITL 승인            │
            └─────────┬─────────┘                       │
                      │ source_type='derived'|'captured'│
                      └─────────────────────────────────┘
```

### 1.2 기존 인프라 활용

| 기존 인프라 | 파일 | 활용 |
|-------------|------|------|
| PatternExtractorService | services/pattern-extractor.ts | Wilson Score, generateId, parseJson 유틸 패턴 참조 |
| DerivedSkillGeneratorService | services/derived-skill-generator.ts | 후보 생성 + 중복 감지 + 안전성 검사 패턴 참조 |
| DerivedReviewService | services/derived-review.ts | HITL 승인 + skill_registry 등록 패턴 참조 |
| SafetyChecker | services/safety-checker.ts | 안전성 검사 직접 재사용 |
| WorkflowEngine | services/workflow-engine.ts | WorkflowNode[], WorkflowExecution 타입 참조 |
| MethodologyRegistry | services/methodology-registry.ts | methodology_id 연동 |

---

## 2. D1 스키마 (0083_captured_engine.sql)

```sql
-- F277: CAPTURED 엔진 — 워크플로우 시퀀스 패턴 추출 + 메타 스킬 생성 + HITL

-- 1. captured_workflow_patterns — 크로스 도메인 워크플로우 시퀀스 패턴
CREATE TABLE IF NOT EXISTS captured_workflow_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  methodology_id TEXT,
  pipeline_stage TEXT NOT NULL
    CHECK(pipeline_stage IN ('collection','discovery','shaping','validation','productization','gtm')),
  workflow_step_sequence TEXT NOT NULL,  -- JSON: [{stepId, stepName, action}]
  skill_sequence TEXT NOT NULL,          -- JSON: [skillId1, skillId2, ...]
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  sample_count INTEGER NOT NULL CHECK(sample_count >= 1),
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','consumed','expired')),
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX idx_cwp_tenant_stage ON captured_workflow_patterns(tenant_id, pipeline_stage, status);
CREATE INDEX idx_cwp_methodology ON captured_workflow_patterns(methodology_id);
CREATE INDEX idx_cwp_confidence ON captured_workflow_patterns(confidence DESC);

-- 2. captured_candidates — 워크플로우 패턴에서 생성된 메타 스킬 후보
CREATE TABLE IF NOT EXISTS captured_candidates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general','bd-process','analysis','generation','validation','integration')),
  prompt_template TEXT NOT NULL,
  source_workflow_steps TEXT NOT NULL,   -- JSON: [{stepId, stepName}]
  source_skills TEXT NOT NULL,           -- JSON: [{skillId, contribution}]
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A','B','C','D','F','pending')),
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(review_status IN ('pending','approved','rejected','revision_requested')),
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX idx_cc_tenant_status ON captured_candidates(tenant_id, review_status);
CREATE INDEX idx_cc_pattern ON captured_candidates(pattern_id);

-- 3. captured_reviews — HITL 리뷰 이력
CREATE TABLE IF NOT EXISTS captured_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK(action IN ('approved','rejected','revision_requested')),
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cr_candidate ON captured_reviews(candidate_id);
CREATE INDEX idx_cr_tenant ON captured_reviews(tenant_id, created_at);
```

---

## 3. Shared Types (packages/shared/src/types.ts)

```typescript
// ── F277: CAPTURED 엔진 타입 ──

export type CapturedPatternStatus = "active" | "consumed" | "expired";

export interface CapturedWorkflowPattern {
  id: string;
  tenantId: string;
  methodologyId: string | null;
  pipelineStage: PipelineStage;
  workflowStepSequence: { stepId: string; stepName: string; action: string }[];
  skillSequence: string[];
  successRate: number;
  sampleCount: number;
  avgCostUsd: number;
  avgDurationMs: number;
  confidence: number;
  status: CapturedPatternStatus;
  extractedAt: string;
  expiresAt: string | null;
}

export interface CapturedWorkflowPatternDetail extends CapturedWorkflowPattern {
  candidateCount: number;
  approvedCount: number;
}

export interface CapturedCandidate {
  id: string;
  tenantId: string;
  patternId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  promptTemplate: string;
  sourceWorkflowSteps: { stepId: string; stepName: string }[];
  sourceSkills: { skillId: string; contribution: number }[];
  similarityScore: number;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  reviewStatus: DerivedReviewStatus;   // 동일 enum 재사용
  registeredSkillId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface CapturedCandidateDetail extends CapturedCandidate {
  pattern: CapturedWorkflowPattern;
  reviews: CapturedReview[];
}

export interface CapturedReview {
  id: string;
  candidateId: string;
  action: DerivedReviewStatus;
  comment: string | null;
  modifiedPrompt: string | null;
  reviewerId: string;
  createdAt: string;
}

export interface CapturedStats {
  totalPatterns: number;
  activePatterns: number;
  totalCandidates: number;
  pendingCandidates: number;
  approvedCandidates: number;
  rejectedCandidates: number;
  avgConfidence: number;
  avgSuccessRate: number;
}
```

---

## 4. Zod 스키마 (packages/api/src/schemas/captured-engine.ts)

```typescript
import { z } from "zod";

export const extractWorkflowPatternsSchema = z.object({
  pipelineStage: z
    .enum(["collection","discovery","shaping","validation","productization","gtm"])
    .optional(),
  methodologyId: z.string().optional(),
  minSampleCount: z.number().int().min(1).max(100).optional().default(3),
  minSuccessRate: z.number().min(0).max(1).optional().default(0.7),
});

export const listWorkflowPatternsQuerySchema = z.object({
  pipelineStage: z
    .enum(["collection","discovery","shaping","validation","productization","gtm"])
    .optional(),
  methodologyId: z.string().optional(),
  status: z.enum(["active","consumed","expired"]).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const generateCapturedCandidateSchema = z.object({
  patternId: z.string().min(1),
  nameOverride: z.string().max(200).optional(),
  categoryOverride: z
    .enum(["general","bd-process","analysis","generation","validation","integration"])
    .optional(),
});

export const listCapturedCandidatesQuerySchema = z.object({
  reviewStatus: z.enum(["pending","approved","rejected","revision_requested"]).optional(),
  category: z
    .enum(["general","bd-process","analysis","generation","validation","integration"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const reviewCapturedCandidateSchema = z.object({
  action: z.enum(["approved","rejected","revision_requested"]),
  comment: z.string().max(2000).optional(),
  modifiedPrompt: z.string().max(50000).optional(),
});
```

---

## 5. 서비스 상세 설계

### 5.1 WorkflowPatternExtractorService

```typescript
class WorkflowPatternExtractorService {
  constructor(private db: D1Database) {}

  async extract(tenantId, params): Promise<{ patterns: CapturedWorkflowPattern[]; count: number }>
  // 핵심 로직:
  // 1. workflow_executions WHERE status='completed' 조회
  // 2. 각 실행의 definition(WorkflowNode[]) 파싱 → 스텝 시퀀스 추출
  // 3. skill_executions와 biz_item_id/시간으로 조인하여 각 스텝의 스킬 식별
  // 4. 동일 시퀀스 패턴 그룹화 (workflow_step_sequence JSON 문자열 기준)
  // 5. sample_count >= minSampleCount, success_rate >= minSuccessRate 필터
  // 6. Wilson Score Lower Bound로 confidence 계산
  // 7. captured_workflow_patterns에 INSERT

  async getPatterns(tenantId, params): Promise<{ patterns: CapturedWorkflowPattern[]; total: number }>
  async getPatternDetail(tenantId, patternId): Promise<CapturedWorkflowPatternDetail | null>
}
```

**워크플로우→스킬 매핑 알고리즘:**
```
workflow_executions에서 completed 실행 가져오기
  → definition JSON 파싱 → WorkflowNode[] 추출
  → 각 node의 action + workflow_id로 관련 skill_executions 탐색
  → 시간순 정렬하여 [step → skill] 시퀀스 구성
  → 같은 시퀀스 패턴끼리 그룹화
```

### 5.2 CapturedSkillGeneratorService

F276 DerivedSkillGeneratorService와 대칭적 구조:

```typescript
class CapturedSkillGeneratorService {
  constructor(private db: D1Database) {}

  async generate(tenantId, patternId, overrides?, actorId?): Promise<CapturedCandidate>
  // 1. captured_workflow_patterns에서 패턴 조회
  // 2. skill_sequence의 각 스킬을 skill_registry에서 조회
  // 3. 워크플로우 스텝 시퀀스 기반 프롬프트 템플릿 구성
  // 4. 카테고리 결정 (소스 스킬 다수결)
  // 5. 중복 감지 (skill_search_index)
  // 6. SafetyChecker.check()
  // 7. captured_candidates에 INSERT

  async listCandidates(tenantId, params): Promise<{ candidates: CapturedCandidate[]; total: number }>
  async getCandidateDetail(tenantId, candidateId): Promise<CapturedCandidateDetail | null>
}
```

### 5.3 CapturedReviewService

F276 DerivedReviewService와 대칭적 구조:

```typescript
class CapturedReviewService {
  constructor(private db: D1Database) {}

  async review(tenantId, candidateId, input, actorId): Promise<CapturedReview>
  // 1. captured_candidates 조회 + 검증
  // 2. captured_reviews에 리뷰 기록 INSERT
  // 3. approved일 경우:
  //    a. skill_registry에 source_type='captured'로 등록
  //    b. skill_lineage에 parent→child (derivation_type='captured') 기록
  //    c. captured_workflow_patterns 상태를 'consumed'으로 변경
  //    d. captured_candidates에 registered_skill_id 갱신

  async getStats(tenantId): Promise<CapturedStats>
}
```

---

## 6. API 라우트 (packages/api/src/routes/captured-engine.ts)

```typescript
capturedEngineRoute.post("/skills/captured/extract", ...)      // 워크플로우 패턴 추출
capturedEngineRoute.get("/skills/captured/patterns", ...)       // 패턴 목록
capturedEngineRoute.get("/skills/captured/patterns/:patternId", ...)  // 패턴 상세
capturedEngineRoute.post("/skills/captured/generate", ...)      // 메타 스킬 후보 생성
capturedEngineRoute.get("/skills/captured/candidates", ...)     // 후보 목록
capturedEngineRoute.get("/skills/captured/candidates/:candidateId", ...) // 후보 상세
capturedEngineRoute.post("/skills/captured/candidates/:candidateId/review", ...) // HITL 승인
capturedEngineRoute.get("/skills/captured/stats", ...)          // 통계
```

---

## 7. 변경 파일 목록

### 신규 (7 NEW)

| # | 파일 | 설명 |
|---|------|------|
| 1 | packages/api/src/db/migrations/0083_captured_engine.sql | D1 마이그레이션 3테이블 |
| 2 | packages/api/src/schemas/captured-engine.ts | Zod 스키마 5개 |
| 3 | packages/api/src/routes/captured-engine.ts | API 라우트 8 endpoints |
| 4 | packages/api/src/services/workflow-pattern-extractor.ts | 워크플로우 패턴 추출 |
| 5 | packages/api/src/services/captured-skill-generator.ts | 메타 스킬 후보 생성 |
| 6 | packages/api/src/services/captured-review.ts | HITL 리뷰 |
| 7 | packages/api/src/__tests__/captured-engine.test.ts | 테스트 ~40개 |

### 수정 (3 MODIFY)

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | packages/api/src/index.ts | capturedEngineRoute import + use 추가 |
| 2 | packages/shared/src/types.ts | Captured* 타입 6종 추가 |
| 3 | packages/shared/src/index.ts | Captured* export 추가 |

---

## 8. 유틸 함수 재사용

F276에서 구현된 유틸 함수를 CAPTURED에서도 사용:

| 유틸 | 출처 | 용도 |
|------|------|------|
| `wilsonScoreLowerBound(p, n)` | pattern-extractor.ts | confidence 산출 |
| `generateId(prefix)` | pattern-extractor.ts | PK 생성 (captured: "cp", "cc", "cr") |
| `parseJson(str, fallback)` | derived-skill-generator.ts | JSON 컬럼 안전 파싱 |
| `SafetyChecker.check(prompt)` | safety-checker.ts | 안전성 검사 |
| `determineMajorCategory(skills)` | derived-skill-generator.ts | 카테고리 다수결 |

**리팩토링 고려**: 공통 유틸 함수를 `services/skill-evolution-utils.ts`로 추출할 수 있으나, Sprint 106 범위에서는 inline import로 진행하고 이후 리팩토링 대상으로 남겨둠.

---

## 9. 테스트 전략

F276 테스트 패턴(`packages/api/src/__tests__/derived-engine.test.ts`)과 대칭적:

| 카테고리 | 테스트 수 | 내용 |
|----------|----------|------|
| WorkflowPatternExtractor | ~15 | extract 성공/빈결과, 필터링, confidence, methodology 필터, 목록/상세 |
| CapturedSkillGenerator | ~10 | generate 성공, 패턴 미존재, 비활성 패턴, 중복 감지, 안전성, 목록/상세 |
| CapturedReview | ~8 | approve→등록, reject, revision_requested, 중복 리뷰, 통계 |
| API 라우트 통합 | ~7 | 400/404/201/200 응답, Zod 검증 |
| **합계** | **~40** | |

---

## 10. Checklist

- [ ] 0083_captured_engine.sql 작성 + 로컬 적용
- [ ] captured-engine.ts 스키마 작성
- [ ] workflow-pattern-extractor.ts 구현
- [ ] captured-skill-generator.ts 구현
- [ ] captured-review.ts 구현
- [ ] captured-engine.ts 라우트 구현
- [ ] index.ts 라우트 등록
- [ ] shared types 추가
- [ ] captured-engine.test.ts 작성
- [ ] typecheck + lint + test 통과
