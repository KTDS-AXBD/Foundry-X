---
code: FX-DSGN-103
title: "Sprint 103 Design — 스킬 실행 메트릭 수집 (F274)"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Claude
---

# Sprint 103 Design — 스킬 실행 메트릭 수집 (F274)

## §1 데이터 모델

### 1.1 skill_executions (실행 이력)

```sql
CREATE TABLE skill_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK(status IN ('completed', 'failed', 'timeout', 'cancelled')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

인덱스:
- `(tenant_id, skill_id, executed_at)` — 테넌트별 스킬 메트릭 조회
- `(skill_id, status)` — 스킬별 성공률 집계
- `(executed_at)` — 기간별 필터

### 1.2 skill_versions (버전 메타데이터)

```sql
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  changelog TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, skill_id, version)
);
```

인덱스:
- `(tenant_id, skill_id, version)` — 유니크 제약 활용

### 1.3 skill_lineage (파생 관계)

```sql
CREATE TABLE skill_lineage (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  child_skill_id TEXT NOT NULL,
  derivation_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(derivation_type IN ('manual', 'derived', 'captured', 'forked')),
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

인덱스:
- `(parent_skill_id)` — 부모에서 자식 조회
- `(child_skill_id)` — 자식에서 부모 조회

### 1.4 skill_audit_log (감사 로그)

```sql
CREATE TABLE skill_audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('execution', 'version', 'lineage', 'skill')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'deleted', 'executed', 'versioned')),
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

인덱스:
- `(tenant_id, entity_type, created_at)` — 타입별 감사 로그 조회
- `(entity_id)` — 특정 엔티티 이력 조회

## §2 서비스 설계

### 2.1 SkillMetricsService

```typescript
// packages/api/src/services/skill-metrics.ts

export class SkillMetricsService {
  constructor(private db: D1Database) {}

  // 실행 메트릭 기록 (BdSkillExecutor에서 호출)
  async recordExecution(params: RecordSkillExecutionParams): Promise<{ id: string }>

  // 스킬별 메트릭 요약 (전체)
  async getSkillMetricsSummary(tenantId: string, params?: MetricsQueryParams): Promise<SkillMetricSummary[]>

  // 특정 스킬 상세 메트릭
  async getSkillDetailMetrics(tenantId: string, skillId: string, params?: MetricsQueryParams): Promise<SkillDetailMetrics>

  // 스킬 버전 이력
  async getSkillVersions(tenantId: string, skillId: string): Promise<SkillVersionRecord[]>

  // 스킬 파생 관계 (트리)
  async getSkillLineage(tenantId: string, skillId: string): Promise<SkillLineageNode>

  // 감사 로그 조회
  async getAuditLog(tenantId: string, params?: AuditLogQueryParams): Promise<SkillAuditEntry[]>

  // 감사 로그 기록
  async logAudit(params: LogAuditParams): Promise<void>

  // 스킬 버전 등록
  async registerVersion(params: RegisterVersionParams): Promise<{ id: string }>
}
```

### 2.2 BdSkillExecutor 통합

`execute()` 메서드 마지막에 메트릭 기록 추가:

```typescript
// 기존 return 직전에 추가
const metricsService = new SkillMetricsService(this.db);
await metricsService.recordExecution({
  tenantId: orgId,
  skillId,
  version,
  bizItemId: input.bizItemId,
  artifactId,
  model: MODEL,
  status: result.status === "completed" ? "completed" : "failed",
  inputTokens: data.usage.input_tokens,
  outputTokens: data.usage.output_tokens,
  costUsd: calculateCost(MODEL, data.usage),
  durationMs,
  executedBy: userId,
});
```

## §3 API 엔드포인트

### 3.1 라우트 파일

```
packages/api/src/routes/skill-metrics.ts
```

### 3.2 엔드포인트 상세

| Method | Path | 설명 | Query Params |
|--------|------|------|-------------|
| GET | `/skills/metrics` | 전체 스킬 메트릭 요약 | `days`, `status` |
| GET | `/skills/:skillId/metrics` | 특정 스킬 상세 | `days` |
| GET | `/skills/:skillId/versions` | 버전 이력 | — |
| GET | `/skills/:skillId/lineage` | 파생 관계 트리 | — |
| GET | `/skills/audit-log` | 감사 로그 | `entityType`, `days`, `limit`, `offset` |

### 3.3 응답 형식 예시

```json
// GET /skills/metrics
{
  "skills": [
    {
      "skillId": "cost-model",
      "totalExecutions": 42,
      "successCount": 38,
      "failedCount": 4,
      "successRate": 90,
      "avgDurationMs": 3200,
      "totalCostUsd": 1.2340,
      "avgTokensPerExecution": 2500,
      "lastExecutedAt": "2026-04-02T10:00:00Z"
    }
  ],
  "total": 11,
  "period": { "days": 30 }
}
```

## §4 Shared 타입

```typescript
// packages/shared/src/types.ts 에 추가

export interface SkillMetricSummary {
  skillId: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgTokensPerExecution: number;
  lastExecutedAt: string | null;
}

export interface SkillDetailMetrics extends SkillMetricSummary {
  versions: SkillVersionRecord[];
  recentExecutions: SkillExecutionRecord[];
  costTrend: { date: string; cost: number; executions: number }[];
}

export interface SkillVersionRecord {
  id: string;
  skillId: string;
  version: number;
  promptHash: string;
  model: string;
  maxTokens: number;
  changelog: string | null;
  createdBy: string;
  createdAt: string;
}

export interface SkillExecutionRecord {
  id: string;
  skillId: string;
  version: number;
  model: string;
  status: "completed" | "failed" | "timeout" | "cancelled";
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  executedBy: string;
  executedAt: string;
}

export interface SkillLineageNode {
  skillId: string;
  derivationType: "manual" | "derived" | "captured" | "forked";
  children: SkillLineageNode[];
  parents: { skillId: string; derivationType: string }[];
}

export interface SkillAuditEntry {
  id: string;
  entityType: "execution" | "version" | "lineage" | "skill";
  entityId: string;
  action: "created" | "updated" | "deleted" | "executed" | "versioned";
  actorId: string;
  details: string | null;
  createdAt: string;
}
```

## §5 파일 매핑

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0080_skill_metrics.sql` | 4테이블 + 인덱스 생성 |
| 2 | `packages/shared/src/types.ts` | 스킬 메트릭 타입 6개 추가 |
| 3 | `packages/api/src/schemas/skill-metrics.ts` | Zod 스키마 (query params + response) |
| 4 | `packages/api/src/services/skill-metrics.ts` | SkillMetricsService 구현 |
| 5 | `packages/api/src/routes/skill-metrics.ts` | 5개 API 엔드포인트 |
| 6 | `packages/api/src/services/bd-skill-executor.ts` | recordExecution 통합 |
| 7 | `packages/api/src/index.ts` | 라우트 등록 |
| 8 | `packages/api/src/services/__tests__/skill-metrics.test.ts` | 서비스 테스트 |
| 9 | `packages/api/src/routes/__tests__/skill-metrics.test.ts` | 라우트 테스트 |

## §6 테스트 전략

- **서비스 테스트**: recordExecution, getSkillMetricsSummary, getSkillDetailMetrics, getAuditLog — in-memory SQLite
- **라우트 테스트**: 5개 엔드포인트 요청/응답 검증
- **통합 확인**: BdSkillExecutor 실행 후 skill_executions 레코드 확인
