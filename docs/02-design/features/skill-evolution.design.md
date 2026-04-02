---
code: FX-DSGN-SKILLEVOL
title: "skill-evolution — Skill Evolution Phase 1 설계 (Track A 메트릭 + Track D 레지스트리)"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-SKILLEVOL]], [[FX-PLAN-SKILLEVOL-001]]"
---

# skill-evolution: Skill Evolution Phase 1 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F274~F275 Skill Evolution Phase 1 (Track A + Track D) |
| 기간 | Sprint 103~104 (2 Sprint) |
| 핵심 전략 | 기존 인프라(ModelMetricsService, KpiLogger, AgentMarketplace, BdSkillExecutor) 패턴 재활용, 신규 서비스 3개 + 스키마 2개 + 라우트 2개 + D1 마이그레이션 4개 |
| PRD | docs/specs/openspec/prd-final.md |
| Plan | docs/01-plan/features/skill-evolution.plan.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 76개 실행 시 메트릭 미수집, 팀 내 스킬 공유·검색 부재 |
| Solution | BdSkillExecutor 래퍼로 D1 자동 메트릭 기록 + ax-marketplace 확장 스킬 레지스트리 |
| Function UX Effect | 대시보드에서 스킬 성공률·비용 추이 확인, 팀원이 검증 스킬 검색·재사용 |
| Core Value | Phase 2(DERIVED+CAPTURED+ROI) 필수 데이터 인프라 확보 |

---

## 1. 아키텍처 개요

### 1.1 기존 인프라 활용 전략

| 기존 인프라 | 파일 경로 | 활용 방식 |
|------------|-----------|-----------|
| `ModelMetricsService` | `services/model-metrics.ts` | `recordExecution()` 패턴 → `SkillMetricsService.record()` |
| `KpiLogger` | `services/kpi-logger.ts` | `getSummary()/getTrends()` 집계 패턴 → 스킬 메트릭 집계 |
| `AgentMarketplace` | `services/agent-marketplace.ts` | `publishItem/searchItems` 패턴 → `SkillRegistryService` |
| `BdSkillExecutor` | `services/bd-skill-executor.ts` | 메트릭 삽입 지점 (래퍼 추가) |
| `ViabilityCheckpointService` | `services/viability-checkpoint-service.ts` | `getTrafficLight()` → `quality_score` 환산 |
| `tokenRoute` | `routes/token.ts` | 대시보드 API 패턴 → `skill-metrics` 라우트 |

### 1.2 전체 데이터 흐름

```
[BD 담당자] ──→ POST /ax-bd/skills/:skillId/execute
                 │
                 ▼
           BdSkillExecutor.execute()
                 │
                 ├─ 기존 로직: sanitize → LLM 호출 → artifact 저장
                 │
                 └─ [NEW] SkillMetricsService.record()
                           │
                           ├─ skill_executions INSERT (호출별 메트릭)
                           ├─ skill_versions UPDATE (usage_count, success_rate 갱신)
                           └─ skill_audit_log INSERT (이벤트 기록)
                 │
                 ▼
           GET /api/skill-metrics/summary ──→ 대시보드 시각화
           GET /api/skill-registry/search ──→ 스킬 검색·공유
```

---

## 2. 서비스 설계

### 2.1 SkillMetricsService (신규)

**파일**: `packages/api/src/services/skill-metrics.ts`

**패턴**: `ModelMetricsService` 구조 채용

```typescript
export interface SkillExecutionRecord {
  id: string;
  skillName: string;
  skillVersion: string;
  executionStart: string;
  executionEnd: string | null;
  status: "running" | "success" | "failure";
  tokensInput: number;
  tokensOutput: number;
  tokenCostUsd: number;
  qualityScore: number | null;
  bdStage: string | null;
  errorContext: string | null;
  metadata: string | null;
  tenantId: string;
}

export interface SkillMetricsSummary {
  skillName: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  avgQualityScore: number | null;
}

export interface SkillMetricsTrend {
  date: string;
  executions: number;
  successRate: number;
  totalCost: number;
  avgQuality: number | null;
}

export class SkillMetricsService {
  constructor(private db: D1Database) {}

  // ── 메트릭 기록 ──
  async record(params: {
    skillName: string;
    skillVersion: string;
    status: "running" | "success" | "failure";
    tokensInput: number;
    tokensOutput: number;
    tokenCostUsd: number;
    durationMs: number;
    qualityScore?: number;
    bdStage?: string;
    errorContext?: string;
    metadata?: Record<string, unknown>;
    tenantId: string;
  }): Promise<{ id: string; recorded: boolean }>

  // ── 집계 조회 ──
  async getSummary(params: {
    tenantId: string;
    days?: number;       // default 30
    skillName?: string;  // 특정 스킬만
  }): Promise<SkillMetricsSummary[]>

  async getTrends(params: {
    tenantId: string;
    days?: number;       // default 30
    groupBy?: "day" | "week";
    skillName?: string;
  }): Promise<SkillMetricsTrend[]>

  async getExecutions(params: {
    tenantId: string;
    skillName?: string;
    status?: string;
    limit?: number;      // default 20
    offset?: number;
  }): Promise<{ items: SkillExecutionRecord[]; total: number }>

  // ── 버전 통계 갱신 ──
  async updateVersionStats(
    skillName: string,
    version: string,
    tenantId: string
  ): Promise<void>
  // skill_versions의 success_rate, avg_token_cost, usage_count 재계산
}
```

**설계 판단**:
- `record()`는 **fire-and-forget 패턴** — 메트릭 기록 실패가 스킬 실행을 차단하면 안 됨. `try/catch`로 감싸고 실패 시 `console.warn()`만
- `qualityScore`는 **비동기 평가** — 스킬 실행 완료 후 `ViabilityCheckpointService.getTrafficLight()` 결과를 별도로 업데이트 가능. 초기에는 null 허용
- `tokenCostUsd`는 `BdSkillExecutor`의 토큰 수와 모델(claude-haiku-4-5)의 단가로 계산

### 2.2 SkillRegistryService (신규)

**파일**: `packages/api/src/services/skill-registry.ts`

**패턴**: `AgentMarketplace` 구조 채용

```typescript
export interface SkillRegistryItem {
  id: string;
  skillName: string;
  version: string;
  contentHash: string;
  evolutionMode: "DERIVED" | "CAPTURED" | "FIX" | "MANUAL" | null;
  parentVersionId: string | null;
  successRate: number;
  avgTokenCost: number;
  usageCount: number;
  isActive: boolean;
  safetyChecked: boolean;
  tenantId: string;
  createdAt: string;
}

export interface SkillSearchParams {
  query?: string;
  evolutionMode?: string;
  isActive?: boolean;
  sortBy?: "success_rate" | "usage_count" | "recent" | "cost";
  limit?: number;
  offset?: number;
}

export interface SkillSearchResult {
  items: SkillRegistryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SkillLineageEntry {
  id: string;
  childSkillId: string;
  parentSkillId: string;
  relationship: "derived_from" | "captured_from" | "fixed_from";
  evidence: Record<string, unknown> | null;
  createdAt: string;
}

export class SkillRegistryService {
  constructor(private db: D1Database) {}

  // ── CRUD ──
  async register(params: {
    skillName: string;
    version: string;
    contentHash: string;
    evolutionMode?: string;
    parentVersionId?: string;
    tenantId: string;
  }): Promise<{ id: string }>

  async getSkill(skillName: string, tenantId: string): Promise<{
    current: SkillRegistryItem;
    versions: SkillRegistryItem[];
    lineage: SkillLineageEntry[];
  } | null>

  async search(params: SkillSearchParams & { tenantId: string }): Promise<SkillSearchResult>

  async deactivate(skillName: string, version: string, tenantId: string): Promise<void>

  async rollback(skillName: string, targetVersion: string, tenantId: string): Promise<{
    rolledBackFrom: string;
    rolledBackTo: string;
  }>

  // ── Lineage ──
  async addLineage(params: {
    childSkillId: string;
    parentSkillId: string;
    relationship: string;
    evidence?: Record<string, unknown>;
  }): Promise<void>

  async getLineageGraph(skillName: string, tenantId: string): Promise<SkillLineageEntry[]>
}
```

### 2.3 SkillSafetyService (신규)

**파일**: `packages/api/src/services/skill-safety.ts`

**패턴**: OpenSpace `check_skill_safety` 참고

```typescript
export interface SafetyCheckResult {
  passed: boolean;
  violations: SafetyViolation[];
  checkedAt: string;
}

export interface SafetyViolation {
  rule: string;
  severity: "critical" | "warning";
  pattern: string;
  location: string;       // 발견 위치 (line or section)
  description: string;
}

// 검사 규칙 (정적 패턴 매칭)
const SAFETY_RULES = [
  { rule: "prompt_injection",  severity: "critical", patterns: [/ignore.*instructions/i, /system.*prompt.*override/i, /forget.*previous/i] },
  { rule: "credential_access", severity: "critical", patterns: [/api[_-]?key/i, /password/i, /secret/i, /\.env/i, /credentials/i] },
  { rule: "filesystem_danger", severity: "critical", patterns: [/rm\s+-rf/i, /chmod\s+777/i, /dd\s+if=/i] },
  { rule: "data_exfiltration", severity: "warning",  patterns: [/curl\s+.*http/i, /wget\s+/i, /fetch\(.*http/i] },
  { rule: "code_execution",    severity: "warning",  patterns: [/eval\(/i, /exec\(/i, /child_process/i] },
];

export class SkillSafetyService {
  checkSkillContent(content: string): SafetyCheckResult

  async checkAndRecord(params: {
    skillName: string;
    version: string;
    content: string;
    tenantId: string;
    db: D1Database;
  }): Promise<SafetyCheckResult>
  // 검사 결과를 skill_versions.safety_checked에 기록
  // violation 발생 시 skill_audit_log에 "safety_blocked" 기록
}
```

**설계 판단**:
- 초기에는 **정적 패턴 매칭**만 사용 (LLM 기반 의미 분석은 Phase 2에서)
- `critical` 위반은 등록 차단, `warning`은 경고만 표시
- `checkSkillContent()`는 **순수 함수** (D1 의존 없음) → 단위 테스트 용이

---

## 3. API 설계

### 3.1 Skill Metrics API (`/api/skill-metrics/*`)

**파일**: `packages/api/src/routes/skill-metrics.ts`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| GET | `/api/skill-metrics/summary` | 스킬별 성공률·비용 집계 | JWT |
| GET | `/api/skill-metrics/trends` | 기간별 메트릭 추이 | JWT |
| GET | `/api/skill-metrics/executions` | 실행 이력 목록 | JWT |

**Query Parameters**:

```
GET /api/skill-metrics/summary?days=30&skillName=bmc-analysis
GET /api/skill-metrics/trends?days=30&groupBy=day&skillName=bmc-analysis
GET /api/skill-metrics/executions?skillName=bmc-analysis&status=success&limit=20&offset=0
```

**Response 예시** (`/summary`):

```json
{
  "skills": [
    {
      "skillName": "bmc-analysis",
      "totalExecutions": 47,
      "successCount": 42,
      "failedCount": 5,
      "successRate": 0.894,
      "avgDurationMs": 12500,
      "totalTokens": 284000,
      "totalCostUsd": 1.42,
      "avgCostPerExecution": 0.030,
      "avgQualityScore": 0.78
    }
  ],
  "period": { "days": 30, "from": "2026-03-03", "to": "2026-04-02" }
}
```

### 3.2 Skill Registry API (`/api/skill-registry/*`)

**파일**: `packages/api/src/routes/skill-registry.ts`

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| GET | `/api/skill-registry/skills` | 스킬 목록 (메타 포함) | JWT |
| GET | `/api/skill-registry/skills/:name` | 스킬 상세 (버전+lineage) | JWT |
| GET | `/api/skill-registry/search` | 시맨틱 검색 | JWT |
| POST | `/api/skill-registry/skills` | 스킬 등록/업데이트 | JWT |
| POST | `/api/skill-registry/skills/:name/safety-check` | 안전성 검사 | JWT |
| POST | `/api/skill-registry/skills/:name/rollback` | 버전 롤백 | JWT |

**Response 예시** (`/skills/:name`):

```json
{
  "current": {
    "id": "sv_abc123",
    "skillName": "bmc-analysis",
    "version": "1.2",
    "evolutionMode": "MANUAL",
    "successRate": 0.894,
    "avgTokenCost": 0.030,
    "usageCount": 47,
    "isActive": true,
    "safetyChecked": true
  },
  "versions": [
    { "version": "1.0", "isActive": false, "usageCount": 20 },
    { "version": "1.1", "isActive": false, "usageCount": 15 },
    { "version": "1.2", "isActive": true, "usageCount": 12 }
  ],
  "lineage": [
    { "childSkillId": "sv_abc123", "parentSkillId": "sv_xyz789", "relationship": "derived_from" }
  ]
}
```

### 3.3 Zod 스키마

**파일**: `packages/api/src/schemas/skill-metrics.ts`

```typescript
export const SkillMetricsSummarySchema = z.object({
  skills: z.array(z.object({
    skillName: z.string(),
    totalExecutions: z.number(),
    successCount: z.number(),
    failedCount: z.number(),
    successRate: z.number(),
    avgDurationMs: z.number(),
    totalTokens: z.number(),
    totalCostUsd: z.number(),
    avgCostPerExecution: z.number(),
    avgQualityScore: z.number().nullable(),
  })),
  period: z.object({ days: z.number(), from: z.string(), to: z.string() }),
});

export const SkillMetricsTrendsSchema = z.object({
  trends: z.array(z.object({
    date: z.string(),
    executions: z.number(),
    successRate: z.number(),
    totalCost: z.number(),
    avgQuality: z.number().nullable(),
  })),
});

export const SkillExecutionListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    skillName: z.string(),
    skillVersion: z.string(),
    executionStart: z.string(),
    executionEnd: z.string().nullable(),
    status: z.enum(["running", "success", "failure"]),
    tokensInput: z.number(),
    tokensOutput: z.number(),
    tokenCostUsd: z.number(),
    qualityScore: z.number().nullable(),
    bdStage: z.string().nullable(),
  })),
  total: z.number(),
});
```

**파일**: `packages/api/src/schemas/skill-registry.ts`

```typescript
export const SkillRegistryItemSchema = z.object({
  id: z.string(),
  skillName: z.string(),
  version: z.string(),
  contentHash: z.string(),
  evolutionMode: z.enum(["DERIVED", "CAPTURED", "FIX", "MANUAL"]).nullable(),
  successRate: z.number(),
  avgTokenCost: z.number(),
  usageCount: z.number(),
  isActive: z.boolean(),
  safetyChecked: z.boolean(),
  createdAt: z.string(),
});

export const SkillSearchResultSchema = z.object({
  items: z.array(SkillRegistryItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const SafetyCheckResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(z.object({
    rule: z.string(),
    severity: z.enum(["critical", "warning"]),
    pattern: z.string(),
    location: z.string(),
    description: z.string(),
  })),
  checkedAt: z.string(),
});

export const RegisterSkillSchema = z.object({
  skillName: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  contentHash: z.string(),
  evolutionMode: z.enum(["DERIVED", "CAPTURED", "FIX", "MANUAL"]).optional(),
  parentVersionId: z.string().optional(),
});
```

---

## 4. BdSkillExecutor 변경 상세

### 4.1 래퍼 패턴 (최소 침습)

기존 `execute()` 메서드의 try/catch 구조를 유지하면서, 성공/실패 모두에서 메트릭을 기록:

```typescript
// bd-skill-executor.ts — 변경 부분만
export class BdSkillExecutor {
  private gateway: PromptGatewayService;
  private artifactService: BdArtifactService;
  private metricsService: SkillMetricsService;  // [NEW]

  constructor(private db: D1Database, private apiKey: string) {
    this.gateway = new PromptGatewayService(db);
    this.artifactService = new BdArtifactService(db);
    this.metricsService = new SkillMetricsService(db);  // [NEW]
  }

  async execute(...): Promise<SkillExecutionResult> {
    // ... 기존 로직 동일 ...

    const startTime = Date.now();
    try {
      // ... 기존 LLM 호출 로직 ...
      const durationMs = Date.now() - startTime;

      // [NEW] 성공 메트릭 기록 (fire-and-forget)
      this.recordMetrics(skillId, version, "success", data.usage, durationMs, orgId, input.stageId).catch(() => {});

      return { ... status: "completed" };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      // [NEW] 실패 메트릭 기록 (fire-and-forget)
      this.recordMetrics(skillId, version, "failure", { input_tokens: 0, output_tokens: 0 }, durationMs, orgId, input.stageId, errorMsg).catch(() => {});

      return { ... status: "failed" };
    }
  }

  // [NEW] private helper
  private async recordMetrics(
    skillId: string, version: string, status: "success" | "failure",
    usage: { input_tokens: number; output_tokens: number },
    durationMs: number, tenantId: string, bdStage?: string, errorContext?: string,
  ): Promise<void> {
    const costUsd = this.calculateCost(usage.input_tokens, usage.output_tokens);
    await this.metricsService.record({
      skillName: skillId,
      skillVersion: version,
      status,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      tokenCostUsd: costUsd,
      durationMs,
      bdStage,
      errorContext,
      tenantId,
    });
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // claude-haiku-4-5: $0.80/MTok input, $4.00/MTok output
    return (inputTokens * 0.80 + outputTokens * 4.00) / 1_000_000;
  }
}
```

### 4.2 기존 테스트 영향

- 기존 `bd-skill-executor.test.ts`는 Anthropic API를 mock하므로, `SkillMetricsService`도 mock 필요
- mock 전략: `SkillMetricsService.record()`를 `vi.fn()` → 호출 여부만 확인

---

## 5. Web 컴포넌트 설계

### 5.1 Skill Metrics 대시보드

**파일**: `packages/web/src/routes/dashboard/skill-metrics.tsx`

기존 토큰 대시보드(`tokens.tsx`)의 레이아웃을 재활용:

```
┌───────────────────────────────────────────────┐
│ Skill Metrics Dashboard                        │
│                                                │
│ ┌─[Summary]──[Trends]──[Executions]─────────┐ │
│ │                                            │ │
│ │ [Summary 탭]                               │ │
│ │ ┌────────────┐ ┌────────────┐              │ │
│ │ │ 전체 실행   │ │ 성공률     │              │ │
│ │ │   247      │ │   89.4%   │              │ │
│ │ └────────────┘ └────────────┘              │ │
│ │ ┌────────────┐ ┌────────────┐              │ │
│ │ │ 총 비용    │ │ 평균 품질   │              │ │
│ │ │  $7.42    │ │   0.78    │              │ │
│ │ └────────────┘ └────────────┘              │ │
│ │                                            │ │
│ │ ┌────────────────────────────────────────┐ │ │
│ │ │ 스킬별 성공률 차트 (Bar)               │ │ │
│ │ │ bmc-analysis    ████████░░  89%        │ │ │
│ │ │ feasibility     ██████████  95%        │ │ │
│ │ │ cost-model      ███████░░░  72%        │ │ │
│ │ └────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

### 5.2 Skill Registry 브라우저

**파일**: `packages/web/src/routes/dashboard/skill-registry.tsx`

```
┌───────────────────────────────────────────────┐
│ Skill Registry                                 │
│                                                │
│ 🔍 [검색: _________ ] [Mode ▼] [Sort ▼]       │
│                                                │
│ ┌─────────────────────────────────────────────┐│
│ │ bmc-analysis  v1.2  ✅ active  🛡️ safe     ││
│ │ 성공률: 89.4%  비용: $0.030/회  사용: 47회  ││
│ │ Mode: MANUAL  │ Lineage: v1.0 → v1.1 → v1.2││
│ ├─────────────────────────────────────────────┤│
│ │ feasibility-study  v1.0  ✅ active  🛡️ safe││
│ │ 성공률: 95.0%  비용: $0.025/회  사용: 32회  ││
│ │ Mode: MANUAL  │ Lineage: -                  ││
│ └─────────────────────────────────────────────┘│
└───────────────────────────────────────────────┘
```

### 5.3 API Client 확장

**파일**: `packages/web/src/lib/api-client.ts` (기존 파일 확장)

```typescript
// Skill Metrics
getSkillMetricsSummary(params?: { days?: number; skillName?: string })
getSkillMetricsTrends(params?: { days?: number; groupBy?: string; skillName?: string })
getSkillMetricsExecutions(params?: { skillName?: string; status?: string; limit?: number; offset?: number })

// Skill Registry
getSkillRegistryList(params?: { query?: string; sortBy?: string; limit?: number; offset?: number })
getSkillDetail(skillName: string)
searchSkills(query: string)
registerSkill(data: RegisterSkillInput)
runSafetyCheck(skillName: string)
rollbackSkill(skillName: string, targetVersion: string)
```

---

## 6. D1 마이그레이션

### 6.1 마이그레이션 파일 목록

| 번호 | 파일명 | 테이블 |
|------|--------|--------|
| 0080 | `0080_skill_executions.sql` | `skill_executions` + 3 인덱스 |
| 0081 | `0081_skill_versions.sql` | `skill_versions` + 3 인덱스 |
| 0082 | `0082_skill_lineage.sql` | `skill_lineage` + FK 2개 |
| 0083 | `0083_skill_audit_log.sql` | `skill_audit_log` + 2 인덱스 |

### 6.2 테스트 헬퍼 SQL

`packages/api/src/__tests__/helpers/` 내 테스트 setup에 4테이블 CREATE 문 추가 필수 (기존 패턴 준수).

### 6.3 초기 시드 데이터

기존 76개 BD 스킬을 `skill_versions`에 v1.0으로 일괄 등록하는 시드 스크립트:

```sql
-- 시드 (수동 실행, 자동 마이그레이션에 포함하지 않음)
INSERT OR IGNORE INTO skill_versions (id, skill_name, version, content_hash, evolution_mode, is_active, safety_checked, tenant_id)
VALUES
  ('sv_bmc', 'bmc-analysis', '1.0', '', 'MANUAL', 1, 0, 'default'),
  ('sv_feasibility', 'feasibility-study', '1.0', '', 'MANUAL', 1, 0, 'default'),
  -- ... 76개 스킬 ...
```

---

## 7. 구현 순서 (Sprint 단위)

### Sprint 103: Track A (F274)

```
순서  │ 작업                           │ 산출물                          │ 테스트
──────┼────────────────────────────────┼─────────────────────────────────┼──────
  1   │ D1 마이그레이션 0080~0083      │ 4 SQL 파일                      │ ~4
  2   │ Zod 스키마 (skill-metrics.ts)  │ 3 스키마                        │ ~3
  3   │ SkillMetricsService            │ record/getSummary/getTrends     │ ~15
  4   │ BdSkillExecutor 래퍼           │ recordMetrics + calculateCost   │ ~5
  5   │ skill-metrics 라우트           │ 3 GET endpoints                 │ ~10
  6   │ Web 대시보드 탭                │ skill-metrics.tsx               │ ~5
  7   │ 테스트 헬퍼 SQL 추가           │ test setup 갱신                 │ -
      │                                │ 소계                            │ ~42
```

### Sprint 104: Track D (F275)

```
순서  │ 작업                           │ 산출물                          │ 테스트
──────┼────────────────────────────────┼─────────────────────────────────┼──────
  1   │ Zod 스키마 (skill-registry.ts) │ 4 스키마                        │ ~3
  2   │ SkillSafetyService             │ 패턴 매칭 엔진                  │ ~12
  3   │ SkillRegistryService           │ CRUD/search/rollback/lineage    │ ~18
  4   │ skill-registry 라우트          │ 6 endpoints                     │ ~12
  5   │ Web 레지스트리 UI              │ skill-registry.tsx              │ ~5
  6   │ 초기 시드 스크립트             │ 76개 스킬 등록                  │ ~2
  7   │ index.ts 라우트 등록           │ 2개 라우트 등록                 │ -
      │                                │ 소계                            │ ~52
```

**총 예상 테스트: ~94개** (API 2250 + 94 = 2344)

---

## 8. 에러 처리 전략

| 상황 | 처리 | 사용자 영향 |
|------|------|------------|
| 메트릭 기록 실패 (D1 오류) | `catch(() => {})` — 무시, console.warn | 없음 (스킬 실행은 정상) |
| 안전성 검사 critical 위반 | 등록 거부 + audit_log 기록 | 스킬 등록 실패 메시지 |
| 안전성 검사 warning 위반 | 경고 표시, 등록은 허용 | 경고 배너 |
| 버전 롤백 대상 없음 | 404 반환 | "해당 버전이 존재하지 않습니다" |
| 검색 결과 0건 | 빈 배열 반환 | 검색 결과 없음 UI |

---

## 9. 보안 고려사항

- **인증**: 모든 API에 JWT 필수 (기존 auth 미들웨어)
- **테넌트 격리**: 모든 쿼리에 `tenant_id` 필터 (기존 패턴)
- **안전성 검사**: 스킬 등록 시 `SkillSafetyService.checkAndRecord()` 자동 실행
- **감사 로그**: 스킬 생성/수정/롤백/삭제 시 `skill_audit_log`에 기록
- **자동 커밋 금지**: 스킬 진화 결과는 사람 확인 필수 (CLAUDE.md 원칙 — UI에서 승인 버튼)

---

## 10. 검토 이력

| 날짜 | 변경 |
|------|------|
| 2026-04-02 | 최초 작성 — Plan(FX-PLAN-SKILLEVOL) 기반 |
