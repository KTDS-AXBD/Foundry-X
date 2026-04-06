---
code: FX-DSGN-S161
title: "Sprint 161 — 데이터 진단 + 패턴 감지 + Rule 생성 Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S161]], [[FX-SPEC-001]], fx-harness-evolution/prd-final.md"
---

# Sprint 161 Design: 데이터 진단 + 패턴 감지 + Rule 생성

## 1. Overview

Phase 17 Self-Evolving Harness의 첫 Sprint. Phase 14 텔레메트리 인프라(execution_events, task_state_history)의 데이터를 분석하여 반복 실패 패턴을 자동 감지하고, LLM으로 `.claude/rules/` 포맷 Rule 초안을 생성하는 "데이터→행동" 파이프라인을 구축한다.

### F-items

| F-item | 제목 | 우선순위 |
|--------|------|:--------:|
| F357 | 데이터 상태 진단 + 기준선 수립 | P0 |
| F358 | 반복 실패 패턴 감지 + Rule 초안 생성 | P0 |

---

## 2. D1 Schema Design

### 2.1 신규 마이그레이션

#### 0107_failure_patterns.sql

```sql
CREATE TABLE IF NOT EXISTS failure_patterns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  sample_event_ids TEXT,
  sample_payloads TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
CREATE INDEX IF NOT EXISTS idx_fp_status ON failure_patterns(tenant_id, status);
```

#### 0108_guard_rail_proposals.sql

```sql
CREATE TABLE IF NOT EXISTS guard_rail_proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES failure_patterns(id),
  rule_content TEXT NOT NULL,
  rule_filename TEXT NOT NULL,
  rationale TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grp_tenant ON guard_rail_proposals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_grp_pattern ON guard_rail_proposals(pattern_id);
```

---

## 3. Shared Types

### 3.1 `packages/shared/src/guard-rail.ts`

```typescript
/** F357: 데이터 진단 결과 */
export interface DiagnosticResult {
  totalEvents: number;
  totalFailedTransitions: number;
  earliestEvent: string | null;
  latestEvent: string | null;
  dataCoverageDays: number;
  sourceDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  failedTransitionsBySource: Record<string, number>;
  isDataSufficient: boolean;
}

/** F358: 감지된 실패 패턴 */
export interface FailurePattern {
  id: string;
  tenantId: string;
  patternKey: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  sampleEventIds: string[];
  samplePayloads: unknown[];
  status: "detected" | "proposed" | "resolved";
  createdAt: string;
  updatedAt: string;
}

/** F358: Guard Rail 제안 */
export interface GuardRailProposal {
  id: string;
  tenantId: string;
  patternId: string;
  ruleContent: string;
  ruleFilename: string;
  rationale: string;
  llmModel: string;
  status: "pending" | "approved" | "rejected" | "modified";
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

/** F358: 패턴 감지 요청 */
export interface DetectPatternsRequest {
  minOccurrences?: number;
  sinceDays?: number;
}

/** F358: 패턴 감지 결과 */
export interface DetectPatternsResult {
  patternsFound: number;
  patternsNew: number;
  patternsUpdated: number;
  patterns: FailurePattern[];
}

/** F358: Rule 생성 결과 */
export interface GenerateRulesResult {
  proposalsCreated: number;
  proposals: GuardRailProposal[];
}
```

### 3.2 `packages/shared/src/index.ts` 추가 export

```typescript
export type {
  DiagnosticResult,
  FailurePattern,
  GuardRailProposal,
  DetectPatternsRequest,
  DetectPatternsResult,
  GenerateRulesResult,
} from "./guard-rail.js";
```

---

## 4. Service Layer Design

### 4.1 DataDiagnosticService (`api/src/services/data-diagnostic-service.ts`)

F357 담당. execution_events + task_state_history 데이터 진단.

```typescript
export class DataDiagnosticService {
  constructor(private db: D1Database) {}

  /** 데이터 진단 — 전체 현황 파악 */
  async diagnose(tenantId: string): Promise<DiagnosticResult>;
}
```

**diagnose() 구현 전략:**
1. `SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM execution_events WHERE tenant_id = ?`
2. `SELECT source, COUNT(*) as count FROM execution_events WHERE tenant_id = ? GROUP BY source`
3. `SELECT severity, COUNT(*) as count FROM execution_events WHERE tenant_id = ? GROUP BY severity`
4. `SELECT trigger_source, COUNT(*) as count FROM task_state_history WHERE tenant_id = ? AND to_state = 'FAILED' GROUP BY trigger_source`
5. `dataCoverageDays = (latestEvent - earliestEvent) in days`
6. `isDataSufficient = totalEvents >= 10 && dataCoverageDays >= 7`

### 4.2 PatternDetectorService (`api/src/services/pattern-detector-service.ts`)

F358 담당. source × severity 기반 반복 실패 패턴 감지.

```typescript
export class PatternDetectorService {
  constructor(private db: D1Database) {}

  /** 반복 실패 패턴 감지 + failure_patterns 저장 */
  async detect(
    tenantId: string,
    options?: { minOccurrences?: number; sinceDays?: number }
  ): Promise<DetectPatternsResult>;
}
```

**detect() 구현 전략:**
1. 기본 임계값: `minOccurrences = 3`, `sinceDays = 30`
2. SQL 집계:
   ```sql
   SELECT source || ':' || severity AS pattern_key,
          COUNT(*) as cnt,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          GROUP_CONCAT(id, ',') as event_ids
   FROM execution_events
   WHERE tenant_id = ? AND severity IN ('error', 'critical')
     AND created_at >= datetime('now', '-N days')
   GROUP BY source, severity
   HAVING COUNT(*) >= ?
   ```
3. 기존 failure_patterns와 비교 → UPSERT (INSERT OR REPLACE)
4. sample_event_ids: 최대 5개만 저장 (GROUP_CONCAT 결과에서 slice)
5. sample_payloads: sample_event_ids의 payload를 조회하여 저장

### 4.3 RuleGeneratorService (`api/src/services/rule-generator-service.ts`)

F358 담당. 감지된 패턴 → LLM Rule 초안 생성.

```typescript
export class RuleGeneratorService {
  constructor(
    private db: D1Database,
    private anthropicApiKey: string
  ) {}

  /** failure_patterns에서 미제안 패턴 → LLM Rule 초안 생성 */
  async generate(
    tenantId: string,
    patternIds?: string[]
  ): Promise<GenerateRulesResult>;
}
```

**generate() 구현 전략:**
1. `status = 'detected'` 패턴 조회 (또는 지정된 patternIds)
2. 각 패턴마다 LLM 프롬프트 구성:
   - 시스템 프롬프트: "You are a Claude Code rules author..."
   - 패턴 정보: patternKey, occurrenceCount, samplePayloads
   - 출력 포맷: YAML frontmatter + Markdown body (.claude/rules/ 포맷)
3. Anthropic Messages API 호출 (claude-haiku-4-5-20251001)
4. 응답에서 rule_content 추출, rule_filename 생성 (`auto-guard-{NNN}.md`)
5. guard_rail_proposals에 저장, failure_patterns.status → 'proposed'

**LLM 호출 구현:**
- `fetch("https://api.anthropic.com/v1/messages")` 직접 호출 (Workers 환경)
- `anthropic-version: 2023-06-01` 헤더
- max_tokens: 1024
- model: `claude-haiku-4-5-20251001`

---

## 5. Zod Schema Design

### 5.1 `api/src/schemas/guard-rail-schema.ts`

```typescript
import { z } from "@hono/zod-openapi";

// GET /guard-rail/diagnostic
export const DiagnosticResultSchema = z.object({
  totalEvents: z.number(),
  totalFailedTransitions: z.number(),
  earliestEvent: z.string().nullable(),
  latestEvent: z.string().nullable(),
  dataCoverageDays: z.number(),
  sourceDistribution: z.record(z.number()),
  severityDistribution: z.record(z.number()),
  failedTransitionsBySource: z.record(z.number()),
  isDataSufficient: z.boolean(),
});

// POST /guard-rail/detect
export const DetectRequestSchema = z.object({
  minOccurrences: z.number().min(1).optional().default(3),
  sinceDays: z.number().min(1).optional().default(30),
});

export const FailurePatternSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patternKey: z.string(),
  occurrenceCount: z.number(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  sampleEventIds: z.array(z.string()),
  samplePayloads: z.array(z.unknown()),
  status: z.enum(["detected", "proposed", "resolved"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DetectResultSchema = z.object({
  patternsFound: z.number(),
  patternsNew: z.number(),
  patternsUpdated: z.number(),
  patterns: z.array(FailurePatternSchema),
});

// GET /guard-rail/proposals
export const ProposalSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patternId: z.string(),
  ruleContent: z.string(),
  ruleFilename: z.string(),
  rationale: z.string(),
  llmModel: z.string(),
  status: z.enum(["pending", "approved", "rejected", "modified"]),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const ProposalListSchema = z.object({
  items: z.array(ProposalSchema),
  total: z.number(),
});

// PATCH /guard-rail/proposals/:id
export const ProposalUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "modified"]),
  ruleContent: z.string().optional(),
  reviewedBy: z.string().optional(),
});

// POST /guard-rail/generate
export const GenerateResultSchema = z.object({
  proposalsCreated: z.number(),
  proposals: z.array(ProposalSchema),
});
```

---

## 6. Route Design

### 6.1 `api/src/routes/guard-rail.ts`

| Method | Path | Handler | 설명 |
|--------|------|---------|------|
| GET | /guard-rail/diagnostic | getDiagnostic | F357: 데이터 진단 결과 |
| POST | /guard-rail/detect | detectPatterns | F358: 패턴 감지 실행 |
| POST | /guard-rail/generate | generateRules | F358: Rule 초안 생성 |
| GET | /guard-rail/proposals | listProposals | F358: 제안 목록 조회 |
| PATCH | /guard-rail/proposals/:id | updateProposal | F358: 제안 승인/거부 |

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const guardRailRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /guard-rail/diagnostic
const diagnosticRoute = createRoute({
  method: "get",
  path: "/guard-rail/diagnostic",
  tags: ["GuardRail"],
  responses: { 200: { content: { "application/json": { schema: DiagnosticResultSchema } } } },
});

// POST /guard-rail/detect
const detectRoute = createRoute({
  method: "post",
  path: "/guard-rail/detect",
  tags: ["GuardRail"],
  request: { body: { content: { "application/json": { schema: DetectRequestSchema } } } },
  responses: { 200: { content: { "application/json": { schema: DetectResultSchema } } } },
});

// POST /guard-rail/generate
const generateRoute = createRoute({
  method: "post",
  path: "/guard-rail/generate",
  tags: ["GuardRail"],
  responses: { 200: { content: { "application/json": { schema: GenerateResultSchema } } } },
});

// GET /guard-rail/proposals
const proposalsListRoute = createRoute({
  method: "get",
  path: "/guard-rail/proposals",
  tags: ["GuardRail"],
  responses: { 200: { content: { "application/json": { schema: ProposalListSchema } } } },
});

// PATCH /guard-rail/proposals/:id
const proposalUpdateRoute = createRoute({
  method: "patch",
  path: "/guard-rail/proposals/{id}",
  tags: ["GuardRail"],
  request: { body: { content: { "application/json": { schema: ProposalUpdateSchema } } } },
  responses: { 200: { content: { "application/json": { schema: ProposalSchema } } } },
});
```

---

## 7. Test Design

### 7.1 `api/src/__tests__/data-diagnostic.test.ts`

| Test | 설명 |
|------|------|
| diagnose() — 빈 DB | totalEvents=0, isDataSufficient=false |
| diagnose() — 충분한 데이터 | 분포 정확, isDataSufficient=true |
| diagnose() — 기간 부족 | totalEvents>10이지만 1일만 → isDataSufficient=false |

### 7.2 `api/src/__tests__/pattern-detector.test.ts`

| Test | 설명 |
|------|------|
| detect() — 반복 패턴 있음 | 동일 source:severity 3회 → 1개 패턴 감지 |
| detect() — 임계값 미달 | 2회만 → 패턴 0개 |
| detect() — 복수 패턴 | 서로 다른 source:severity 조합 → 각각 별도 패턴 |
| detect() — 기존 패턴 업데이트 | 이미 존재하는 pattern_key → occurrence_count 갱신 |

### 7.3 `api/src/__tests__/rule-generator.test.ts`

| Test | 설명 |
|------|------|
| generate() — Rule 생성 성공 | LLM mock → .claude/rules/ 포맷 검증 |
| generate() — 패턴 없으면 빈 결과 | detected 패턴 0개 → proposalsCreated=0 |
| generate() — 근거 주석 포함 | rationale에 패턴 출처, 실패 사례 수, 기간 포함 |

### 7.4 `api/src/__tests__/guard-rail-routes.test.ts`

| Test | 설명 |
|------|------|
| GET /guard-rail/diagnostic — 200 | 진단 결과 반환 |
| POST /guard-rail/detect — 200 | 패턴 감지 결과 반환 |
| GET /guard-rail/proposals — 200 | 제안 목록 반환 |
| PATCH /guard-rail/proposals/:id — 200 | 상태 업데이트 |
| PATCH /guard-rail/proposals/:id — 404 | 존재하지 않는 ID |

---

## 8. File Mapping

### F357 파일

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/shared/src/guard-rail.ts` | 타입 정의 |
| 2 | `packages/shared/src/index.ts` | export 추가 |
| 3 | `packages/api/src/schemas/guard-rail-schema.ts` | Zod 스키마 |
| 4 | `packages/api/src/services/data-diagnostic-service.ts` | 진단 서비스 |
| 5 | `packages/api/src/routes/guard-rail.ts` | GET /diagnostic 라우트 |
| 6 | `packages/api/src/__tests__/data-diagnostic.test.ts` | 진단 테스트 |

### F358 파일

| # | 파일 | 작업 |
|---|------|------|
| 7 | `packages/api/src/db/migrations/0107_failure_patterns.sql` | D1 마이그레이션 |
| 8 | `packages/api/src/db/migrations/0108_guard_rail_proposals.sql` | D1 마이그레이션 |
| 9 | `packages/api/src/services/pattern-detector-service.ts` | 패턴 감지 서비스 |
| 10 | `packages/api/src/services/rule-generator-service.ts` | Rule 생성 서비스 |
| 11 | `packages/api/src/routes/guard-rail.ts` | POST/GET/PATCH 라우트 추가 |
| 12 | `packages/api/src/__tests__/pattern-detector.test.ts` | 패턴 감지 테스트 |
| 13 | `packages/api/src/__tests__/rule-generator.test.ts` | Rule 생성 테스트 |
| 14 | `packages/api/src/__tests__/guard-rail-routes.test.ts` | 라우트 통합 테스트 |
| 15 | `packages/api/src/app.ts` | guardRailRoute 등록 |

---

## 9. Implementation Order

```
1. packages/shared/src/guard-rail.ts        — 타입 정의
2. packages/shared/src/index.ts             — export 추가
3. D1 migrations (0107 + 0108)              — 테이블 생성
4. packages/api/src/schemas/guard-rail-schema.ts — Zod 스키마
5. packages/api/src/services/data-diagnostic-service.ts — F357 서비스
6. packages/api/src/services/pattern-detector-service.ts — F358 패턴 감지
7. packages/api/src/services/rule-generator-service.ts — F358 Rule 생성
8. packages/api/src/routes/guard-rail.ts    — 모든 라우트
9. packages/api/src/app.ts                  — 라우트 등록
10. tests (4파일)                           — 단위 + 통합 테스트
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial design — Plan + 기존 코드 분석 기반 | Sinclair Seo |
