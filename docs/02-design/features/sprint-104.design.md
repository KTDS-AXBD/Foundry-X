---
code: FX-DSGN-S104
title: "Sprint 104 — F275 스킬 레지스트리 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-267]], [[FX-PLAN-S104]]"
---

# Sprint 104: F275 스킬 레지스트리 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F275: Track D 스킬 레지스트리 |
| Sprint | 104 |
| 상위 Plan | [[FX-PLAN-S104]] |
| 핵심 | D1 스킬 레지스트리 + CRUD API 8개 + TF-IDF 검색 + 안전성 검사 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 스킬이 파일시스템 기반으로만 존재 — 중앙 관리/검색/안전성 평가 불가 |
| Solution | D1 skill_registry + skill_search_index + CRUD API + 시맨틱 검색 + 안전성 검사 |
| Function UX Effect | API로 스킬 등록/검색/안전성 확인/통합 조회 가능 |
| Core Value | F276 DERIVED / F277 CAPTURED 엔진의 전제 조건 확보 |

## §1 데이터 모델

### 1.1 skill_registry 테이블

```sql
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general', 'bd-process', 'analysis', 'generation', 'validation', 'integration')),
  tags TEXT,  -- JSON array: ["bmc", "market-analysis"]
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'deprecated', 'draft', 'archived')),
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT,
  source_type TEXT NOT NULL DEFAULT 'marketplace'
    CHECK(source_type IN ('marketplace', 'custom', 'derived', 'captured')),
  source_ref TEXT,  -- e.g., plugin path or parent skill ID
  prompt_template TEXT,  -- 스킬 프롬프트 템플릿 (안전성 검사 대상)
  model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096,
  token_cost_avg REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,  -- soft delete
  UNIQUE(tenant_id, skill_id)
);

CREATE INDEX idx_sr_tenant_cat ON skill_registry(tenant_id, category, status);
CREATE INDEX idx_sr_tenant_safety ON skill_registry(tenant_id, safety_grade);
CREATE INDEX idx_sr_skill ON skill_registry(skill_id);
```

### 1.2 skill_search_index 테이블

```sql
CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  token TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  field TEXT NOT NULL DEFAULT 'name'
    CHECK(field IN ('name', 'description', 'tags', 'category')),
  UNIQUE(tenant_id, skill_id, token, field)
);

CREATE INDEX idx_ssi_token ON skill_search_index(tenant_id, token);
```

## §2 API 설계

### 2.1 엔드포인트 목록

| # | Method | Path | 설명 | Zod Schema |
|---|--------|------|------|------------|
| 1 | POST | `/api/skills/registry` | 스킬 등록 | registerSkillSchema |
| 2 | GET | `/api/skills/registry` | 스킬 목록 | listSkillsQuerySchema |
| 3 | GET | `/api/skills/registry/:skillId` | 스킬 상세 | — |
| 4 | PUT | `/api/skills/registry/:skillId` | 스킬 수정 | updateSkillSchema |
| 5 | DELETE | `/api/skills/registry/:skillId` | 소프트 삭제 | — |
| 6 | GET | `/api/skills/search` | 시맨틱 검색 | searchSkillsSchema |
| 7 | POST | `/api/skills/registry/:skillId/safety-check` | 안전성 검사 | — |
| 8 | GET | `/api/skills/registry/:skillId/enriched` | 통합 조회 | — |

### 2.2 Zod 스키마

```typescript
// schemas/skill-registry.ts
export const registerSkillSchema = z.object({
  skillId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).default("general"),
  tags: z.array(z.string()).max(20).optional(),
  sourceType: z.enum(["marketplace", "custom", "derived", "captured"]).default("marketplace"),
  sourceRef: z.string().optional(),
  promptTemplate: z.string().max(50000).optional(),
  modelPreference: z.string().optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(["active", "deprecated", "draft", "archived"]).optional(),
  promptTemplate: z.string().max(50000).optional(),
  modelPreference: z.string().optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
});

export const listSkillsQuerySchema = z.object({
  category: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).optional(),
  status: z.enum(["active", "deprecated", "draft", "archived"]).optional(),
  safetyGrade: z.enum(["A", "B", "C", "D", "F", "pending"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const searchSkillsSchema = z.object({
  q: z.string().min(1).max(200),
  category: z.enum(["general", "bd-process", "analysis", "generation", "validation", "integration"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
```

## §3 서비스 설계

### 3.1 SkillRegistryService

```
class SkillRegistryService {
  constructor(db: D1Database)

  register(tenantId, params, actorId) → { id, skillId }
  list(tenantId, params) → { skills[], total }
  getById(tenantId, skillId) → SkillRegistryEntry | null
  update(tenantId, skillId, params, actorId) → SkillRegistryEntry
  softDelete(tenantId, skillId, actorId) → void
  getEnriched(tenantId, skillId) → SkillEnrichedView
  syncMetrics(tenantId, skillId) → void  // F274에서 집계 데이터 가져와 캐시
}
```

### 3.2 SkillSearchService

```
class SkillSearchService {
  constructor(db: D1Database)

  buildIndex(tenantId, skillId, entry) → void
  search(tenantId, query, options) → SkillSearchResult[]
  removeIndex(tenantId, skillId) → void
}
```

**검색 알고리즘 (TF-IDF Lite)**:
1. 쿼리를 토큰화 (공백 + 특수문자 분리, 소문자 변환, 2자 이상 필터)
2. skill_search_index에서 토큰 매칭
3. 필드별 가중치: name(3.0), tags(2.0), description(1.0), category(1.5)
4. 스킬별 점수 합산 → 내림차순 정렬

### 3.3 SafetyChecker

```
class SafetyChecker {
  static check(promptTemplate: string) → SafetyCheckResult
}
```

**6개 규칙** (정규식 기반, 100점 감점제):

| # | 패턴 | 감점 | 정규식 |
|---|------|------|--------|
| 1 | 프롬프트 인젝션 | -20 | `ignore\s+(previous|above)\s+instructions\|system:\s*you\s+are` |
| 2 | 외부 URL/API | -15 | `https?://\|fetch\(\|axios\.\|curl\s` |
| 3 | 파일시스템 접근 | -15 | `fs\.\|readFile\|writeFile\|__dirname\|process\.cwd` |
| 4 | 환경변수/시크릿 | -20 | `process\.env\|SECRET\|PASSWORD\|API_KEY\|TOKEN` |
| 5 | 코드 실행 | -20 | `\beval\(\|\bexec\(\|Function\(\|child_process` |
| 6 | 무한 루프/재귀 | -10 | `while\s*\(\s*true\|for\s*\(\s*;\s*;\|recursion.*infinite` |

등급: A(90+), B(70-89), C(50-69), D(30-49), F(<30)

## §4 Shared 타입

```typescript
// packages/shared/src/types.ts 추가

export type SkillSafetyGrade = "A" | "B" | "C" | "D" | "F" | "pending";
export type SkillCategory = "general" | "bd-process" | "analysis" | "generation" | "validation" | "integration";
export type SkillSourceType = "marketplace" | "custom" | "derived" | "captured";
export type SkillStatus = "active" | "deprecated" | "draft" | "archived";

export interface SkillRegistryEntry {
  id: string;
  tenantId: string;
  skillId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  tags: string[];
  status: SkillStatus;
  safetyGrade: SkillSafetyGrade;
  safetyScore: number;
  safetyCheckedAt: string | null;
  sourceType: SkillSourceType;
  sourceRef: string | null;
  promptTemplate: string | null;
  modelPreference: string | null;
  maxTokens: number;
  tokenCostAvg: number;
  successRate: number;
  totalExecutions: number;
  currentVersion: number;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillSearchResult {
  skillId: string;
  name: string;
  description: string | null;
  category: SkillCategory;
  tags: string[];
  safetyGrade: SkillSafetyGrade;
  score: number;  // 검색 관련도 점수
}

export interface SafetyCheckResult {
  score: number;
  grade: SkillSafetyGrade;
  violations: SafetyViolation[];
  checkedAt: string;
}

export interface SafetyViolation {
  rule: string;
  description: string;
  severity: number;  // 감점
  matchedPattern: string;
}

export interface SkillEnrichedView {
  registry: SkillRegistryEntry;
  metrics: SkillMetricSummary | null;
  versions: SkillVersionRecord[];
  lineage: SkillLineageNode | null;
}
```

## §5 파일 매핑

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0081_skill_registry.sql` | 마이그레이션 (2테이블 + 인덱스) |
| 2 | `packages/shared/src/types.ts` | F275 타입 추가 |
| 3 | `packages/shared/src/index.ts` | export 추가 |
| 4 | `packages/api/src/schemas/skill-registry.ts` | Zod 스키마 4개 |
| 5 | `packages/api/src/services/skill-registry.ts` | SkillRegistryService |
| 6 | `packages/api/src/services/skill-search.ts` | SkillSearchService |
| 7 | `packages/api/src/services/safety-checker.ts` | SafetyChecker |
| 8 | `packages/api/src/routes/skill-registry.ts` | 8개 엔드포인트 |
| 9 | `packages/api/src/app.ts` | 라우트 등록 |
| 10 | `packages/api/src/__tests__/skill-registry-service.test.ts` | 서비스 테스트 |
| 11 | `packages/api/src/__tests__/skill-registry-routes.test.ts` | 라우트 테스트 |
| 12 | `packages/api/src/__tests__/safety-checker.test.ts` | 안전성 검사 테스트 |
