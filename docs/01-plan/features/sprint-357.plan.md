---
code: FX-PLAN-357
title: Sprint 357 — F602 4대 진단 PoC (T3 첫 sprint)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 357
f_item: F602
req: FX-REQ-666
priority: P2
---

# Sprint 357 — F602 4대 진단 PoC (T3 첫 sprint)

> SPEC.md §5 F602 row가 권위 소스. 본 plan은 17 internal dev plan §3 T3 Diagnostic & HITL 첫 sprint.
> **시동 조건**: 354/355/356 중 1개 MERGED 후 (3 sprint 한도 준수).

## §1 배경 + 사전 측정

BeSir §1.5 + INDEX.md §6 P0-3: 4대 진단(Missing/Duplicate/Overspec/Inconsistency) 통합 자동 실행.

### 기존 자산 (재사용 vs 신설)

| 자산 | 본 sprint와의 관계 |
|------|-------------------|
| **DiagnosticCollector** (F530/F537/F582, `core/agent/services/`) | **6축 agent 메트릭 수집기** — F602와 다른 개념. 재사용 X |
| **service_entities** (F593+F628) | **본 sprint 입력 데이터** — 4대 진단 source |
| **entity_links** (F593) | Overspec 진단 (orphan 검출) source |
| **F606 audit-bus** | `diagnostic.completed` 이벤트 발행 |

### 4대 진단 vs 6축 메트릭

| 구분 | 본질 | 데이터 |
|------|------|--------|
| 6축 메트릭 (기존) | Agent 실행 quality (token/time/error) | agent_run_metrics |
| 4대 진단 (본 sprint) | 도메인 데이터 quality | service_entities + entity_links |

## §2 인터뷰 4회 패턴 (S336, 36회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T3 첫 sprint = F602 4대 진단 PoC | T2 마무리 후 자연 진행 |
| 2차 분량 | **Minimal PoC** (4 method stub + 2 endpoints + 4 tests) | T3 진입 적정, 정밀화는 후속 |
| 3차 위치 | core/diagnostic/ (17 plan 매핑) | sub-app 명확 |
| 4차 시동 | **354/355/356 중 1개 MERGED 후** | 3 sprint 한도 준수 |

## §3 범위 (a~k)

### (a) 신규 디렉토리
```
packages/api/src/core/diagnostic/
├── types.ts
├── schemas/
│   └── diagnostic.ts
├── services/
│   └── diagnostic-engine.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0144_diagnostic_findings.sql`

```sql
-- F602: 4대 진단 PoC (Missing/Duplicate/Overspec/Inconsistency)

CREATE TABLE diagnostic_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  diagnostic_types TEXT NOT NULL,        -- JSON array
  status TEXT NOT NULL DEFAULT 'running', -- running/completed/failed
  summary TEXT,                          -- JSON: { missing: 5, duplicate: 2, ... }
  trace_id TEXT,                         -- F606 chain
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  completed_at INTEGER,

  CHECK (status IN ('running','completed','failed'))
);

CREATE INDEX idx_diagnostic_runs_org ON diagnostic_runs(org_id);

CREATE TABLE diagnostic_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  diagnostic_type TEXT NOT NULL,         -- missing/duplicate/overspec/inconsistency
  severity TEXT NOT NULL DEFAULT 'warning', -- info/warning/critical
  entity_id TEXT,                        -- service_entities.id ref (nullable, group findings 가능)
  detail TEXT NOT NULL,                  -- JSON: 진단 결과 상세
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (diagnostic_type IN ('missing','duplicate','overspec','inconsistency')),
  CHECK (severity IN ('info','warning','critical')),
  FOREIGN KEY (run_id) REFERENCES diagnostic_runs(id)
);

CREATE INDEX idx_diagnostic_findings_run ON diagnostic_findings(run_id);
CREATE INDEX idx_diagnostic_findings_type ON diagnostic_findings(org_id, diagnostic_type);
```

### (c) `core/diagnostic/types.ts`

```typescript
export const DIAGNOSTIC_TYPES = ["missing", "duplicate", "overspec", "inconsistency"] as const;
export type DiagnosticType = typeof DIAGNOSTIC_TYPES[number];

export const SEVERITIES = ["info", "warning", "critical"] as const;
export type Severity = typeof SEVERITIES[number];

export interface DiagnosticFinding {
  id: string;
  runId: string;
  orgId: string;
  diagnosticType: DiagnosticType;
  severity: Severity;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface DiagnosticReport {
  runId: string;
  orgId: string;
  status: "running" | "completed" | "failed";
  summary: Record<DiagnosticType, number>;
  findings: DiagnosticFinding[];
  startedAt: number;
  completedAt: number | null;
}

export { DiagnosticEngine } from "./services/diagnostic-engine.service.js";
export * from "./schemas/diagnostic.js";
```

### (d) `core/diagnostic/schemas/diagnostic.ts`

```typescript
export const DiagnosticTypeSchema = z.enum(DIAGNOSTIC_TYPES);
export const SeveritySchema = z.enum(SEVERITIES);

export const RunDiagnosticSchema = z.object({
  orgId: z.string().min(1),
  diagnosticTypes: z.array(DiagnosticTypeSchema).default(["missing","duplicate","overspec","inconsistency"]),
}).openapi("RunDiagnostic");

export const DiagnosticFindingResponseSchema = z.object({
  id: z.string(), runId: z.string(), orgId: z.string(),
  diagnosticType: DiagnosticTypeSchema, severity: SeveritySchema,
  entityId: z.string().nullable(), detail: z.record(z.unknown()),
  createdAt: z.number(),
}).openapi("DiagnosticFinding");

export const DiagnosticReportResponseSchema = z.object({
  runId: z.string(), orgId: z.string(),
  status: z.enum(["running","completed","failed"]),
  summary: z.record(DiagnosticTypeSchema, z.number()),
  findings: z.array(DiagnosticFindingResponseSchema),
  startedAt: z.number(), completedAt: z.number().nullable(),
}).openapi("DiagnosticReport");
```

### (e) `core/diagnostic/services/diagnostic-engine.service.ts`

```typescript
export class DiagnosticEngine {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async runMissing(runId: string, orgId: string): Promise<number> {
    // service_entities에서 besir_type IS NULL OR title IS NULL
    const rows = await this.db.prepare(`
      SELECT id FROM service_entities
       WHERE org_id = ? AND (besir_type IS NULL OR title IS NULL OR title = '')
    `).bind(orgId).all<{ id: string }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "missing", "warning", row.id, { reason: "missing besir_type or title" });
    }
    return rows.results?.length ?? 0;
  }

  async runDuplicate(runId: string, orgId: string): Promise<number> {
    // (org_id, entity_type, external_id) 중복
    const rows = await this.db.prepare(`
      SELECT entity_type, external_id, COUNT(*) as cnt
        FROM service_entities
       WHERE org_id = ?
       GROUP BY entity_type, external_id
       HAVING COUNT(*) > 1
    `).bind(orgId).all<{ entity_type: string; external_id: string; cnt: number }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "duplicate", "warning", null, {
        entityType: row.entity_type, externalId: row.external_id, count: row.cnt,
      });
    }
    return rows.results?.length ?? 0;
  }

  async runOverspec(runId: string, orgId: string): Promise<number> {
    // entity_links 미참조 entity (orphan)
    const rows = await this.db.prepare(`
      SELECT id FROM service_entities WHERE org_id = ?
        AND id NOT IN (SELECT source_id FROM entity_links)
        AND id NOT IN (SELECT target_id FROM entity_links)
    `).bind(orgId).all<{ id: string }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "overspec", "info", row.id, { reason: "no entity_links" });
    }
    return rows.results?.length ?? 0;
  }

  async runInconsistency(runId: string, orgId: string): Promise<number> {
    // 동일 external_id에 다른 title (multi-source 충돌)
    const rows = await this.db.prepare(`
      SELECT external_id, COUNT(DISTINCT title) as title_count
        FROM service_entities
       WHERE org_id = ?
       GROUP BY external_id
       HAVING COUNT(DISTINCT title) > 1
    `).bind(orgId).all<{ external_id: string; title_count: number }>();

    for (const row of rows.results ?? []) {
      await this.insertFinding(runId, orgId, "inconsistency", "critical", null, {
        externalId: row.external_id, distinctTitles: row.title_count,
      });
    }
    return rows.results?.length ?? 0;
  }

  async runAll(orgId: string, types: DiagnosticType[]): Promise<DiagnosticReport> {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    await this.db.prepare(`
      INSERT INTO diagnostic_runs (id, org_id, diagnostic_types, status)
      VALUES (?, ?, ?, 'running')
    `).bind(runId, orgId, JSON.stringify(types)).run();

    const summary: Record<DiagnosticType, number> = { missing: 0, duplicate: 0, overspec: 0, inconsistency: 0 };
    if (types.includes("missing")) summary.missing = await this.runMissing(runId, orgId);
    if (types.includes("duplicate")) summary.duplicate = await this.runDuplicate(runId, orgId);
    if (types.includes("overspec")) summary.overspec = await this.runOverspec(runId, orgId);
    if (types.includes("inconsistency")) summary.inconsistency = await this.runInconsistency(runId, orgId);

    const completedAt = Date.now();
    await this.db.prepare(`
      UPDATE diagnostic_runs SET status='completed', summary=?, completed_at=? WHERE id=?
    `).bind(JSON.stringify(summary), completedAt, runId).run();

    await this.auditBus.emit("diagnostic.completed", { runId, orgId, summary });

    const findings = await this.getFindings(runId);
    return { runId, orgId, status: "completed", summary, findings, startedAt, completedAt };
  }

  private async insertFinding(...) { /* INSERT INTO diagnostic_findings */ }
  async getFindings(runId: string): Promise<DiagnosticFinding[]> { /* SELECT */ }
}
```

### (f) `core/diagnostic/routes/index.ts`

```typescript
// POST /diagnostic/run
// GET /diagnostic/findings?run_id=...&type=...
export const diagnosticApp = new OpenAPIHono<{ Bindings: Env }>();
```

### (g) audit-bus 통합 (F606)
- `diagnostic.completed` event_type
- payload: `{ runId, orgId, summary: {missing, duplicate, overspec, inconsistency}, durationMs }`

### (h) `app.ts` mount
```typescript
app.route("/api/diagnostic", diagnosticApp);
```

### (i) test mock 4건
- `__tests__/diagnostic-engine.test.ts`:
  - Test 1: seed entity (besir_type NULL) → runMissing → finding 1
  - Test 2: seed 2 entity (동일 entity_type+external_id) → runDuplicate → finding 1
  - Test 3: seed 1 orphan entity → runOverspec → finding 1
  - Test 4: seed 2 entity (동일 external_id, 다른 title) → runInconsistency → finding 1

### (j) typecheck + vitest GREEN

회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 migration 0144 적용 + 2 테이블 | wrangler PRAGMA | runs + findings 둘 다 |
| P-b | core/diagnostic/ 5+ files | find | types/schemas/services/routes 모두 |
| P-c | types.ts 4 export | grep | DiagnosticType + Severity + Finding + Report |
| P-d | schemas 3 등록 | grep | RunDiagnostic + Finding + Report |
| P-e | DiagnosticEngine class + 4 method + runAll | grep | export 5 method |
| P-f | routes 2 endpoints | grep | POST run + GET findings |
| P-g | audit-bus diagnostic.completed mock 검증 | mock 검증 | emit |
| P-h | app.ts /api/diagnostic mount 1줄 | grep | 1 line |
| P-i | typecheck + 4 tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 + 4 신규 PASS |
| P-j | dual_ai_reviews sprint 357 자동 INSERT | D1 query | ≥ 1건 (hook 32 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/diagnostic/run` | curl mock org | 4 findings type 응답 |

## §5 전제

- F606 audit-bus ✅ MERGED
- F593 entity ✅ + F628 BesirEntityType ✅ MERGED
- 354/355/356 중 1개 MERGED 후 시동 (3 sprint 한도)

## §6 예상 시간

- autopilot **~20분** (4 method + D1 2 tables + 4 tests + 2 endpoints, T3 진입 분량)

## §7 다음 사이클 후보 (F602 후속, T3 진행)

- **Sprint 358 — F632** CQ 5축 + 80-20-80 검수 룰 (T3, F602+F605 의존)
- Sprint 359 — F607 AI 투명성 + 윤리 임계 (T3, F606 ✅)
- Sprint 360 — F615 Guard-X Solo (T4, F606+F601 의존)
- F619 Multi-Evidence Integration (T6, Decode-X 의존, 별 sprint)
