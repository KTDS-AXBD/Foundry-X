---
code: FX-PLAN-355
title: Sprint 355 — F631 분석X 자동화O 정책 코드 강제 (T2 두 번째)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 355
f_item: F631
req: FX-REQ-696
priority: P2
---

# Sprint 355 — F631 분석X 자동화O 정책 코드 강제 (T2 두 번째)

> SPEC.md §5 F631 row가 권위 소스. 본 plan은 17 internal dev plan §3 T2 Domain Extraction 두 번째 sprint.

## §1 배경 + 사전 측정

BeSir 정합성 §1.4: **분석에서 끝나지 않고 원본 DB 직결 + 상태 변경까지 자동화**. 자체 룰 코드로 강제. **whitelist + default-deny 패턴**.

### 의존성

| 의존 F# | 상태 | 본 sprint 영향 |
|---------|------|----------------|
| F606 audit-bus | ✅ MERGED | `policy.evaluated` + `policy.violation` 이벤트 발행 |

### F615 Guard-X와의 책임 분리

| F-item | 책임 | 도메인 |
|--------|------|--------|
| **F631 (본 sprint)** | 정책 정의 + 화이트리스트 + audit 발행 | core/policy/ |
| **F615 Guard-X (T4)** | runtime 정책 평가 엔진 + ULID+HMAC + core-diff-guard | core/guard/ |

→ F631 = provider, F615 = consumer.

## §2 인터뷰 4회 패턴 (S336, 34회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T2 두 번째 = F631 자동화 정책 | F606 unlock 후 자연 |
| 2차 위치 | **A core/policy/ 신규** | 5-Asset Policy 자산 명칭 일치 |
| 3차 분량 | **Minimal** (types + D1 + PolicyEngine.evaluate + 2 endpoints + audit + test) | T2 표준 분량 |
| 4차 시동 | **즉시** (Sprint 354와 병렬, 다른 도메인 — 동시 2개) | 권장 한도 내 |

## §3 범위 (a~k)

### (a) 신규 디렉토리
```
packages/api/src/core/policy/
├── types.ts
├── schemas/
│   └── policy.ts
├── services/
│   └── policy-engine.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0143_automation_policy.sql`

```sql
-- F631: 분석X 자동화O 정책 코드 (whitelist + default-deny)

CREATE TABLE automation_policies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action_type TEXT NOT NULL,                 -- enum (read_only/data_query/state_change/external_api_call/destructive_op)
  allowed INTEGER NOT NULL DEFAULT 0,        -- 0=denied, 1=allowed
  reason TEXT,
  metadata TEXT,                             -- JSON
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (action_type IN ('read_only','data_query','state_change','external_api_call','destructive_op')),
  CHECK (allowed IN (0, 1)),
  UNIQUE (org_id, action_type)
);

CREATE INDEX idx_automation_policies_org ON automation_policies(org_id);

CREATE TABLE policy_violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempted_by TEXT,
  reason TEXT NOT NULL,
  trace_id TEXT,                             -- F606 trace_id chain
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_policy_violations_org_created ON policy_violations(org_id, created_at DESC);

-- append-only 보장 (F606 audit-bus 패턴 재현)
CREATE TRIGGER policy_violations_no_update BEFORE UPDATE ON policy_violations
BEGIN SELECT RAISE(FAIL, 'policy_violations is append-only'); END;
```

### (c) `core/policy/types.ts`

```typescript
// F631: 자동화 정책 코드 (whitelist + default-deny)
export const AUTOMATION_ACTION_TYPES = [
  "read_only",          // 분석/조회만 (안전)
  "data_query",         // 원본 DB 쿼리 (읽기)
  "state_change",       // 상태 변경 (BeSir 차별화 코어)
  "external_api_call",  // 외부 API 호출
  "destructive_op",     // 삭제/덮어쓰기 (가장 위험)
] as const;

export type AutomationActionType = typeof AUTOMATION_ACTION_TYPES[number];

export interface PolicyEvaluation {
  allowed: boolean;
  reason: string;
  policyId: string | null;
  evaluatedAt: number;
}

export interface PolicyViolation {
  id: string;
  orgId: string;
  actionType: AutomationActionType;
  attemptedBy: string | null;
  reason: string;
  traceId: string | null;
  createdAt: number;
}

export { PolicyEngine } from "./services/policy-engine.service.js";
export * from "./schemas/policy.js";
```

### (d) `core/policy/schemas/policy.ts`

```typescript
export const AutomationActionTypeSchema = z.enum(AUTOMATION_ACTION_TYPES);

export const RegisterPolicySchema = z.object({
  orgId: z.string().min(1),
  actionType: AutomationActionTypeSchema,
  allowed: z.boolean(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("RegisterPolicy");

export const EvaluatePolicySchema = z.object({
  orgId: z.string().min(1),
  actionType: AutomationActionTypeSchema,
  context: z.record(z.unknown()).optional(),
}).openapi("EvaluatePolicy");

export const PolicyEvaluationResponseSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  policyId: z.string().nullable(),
  evaluatedAt: z.number(),
}).openapi("PolicyEvaluationResponse");
```

### (e) `core/policy/services/policy-engine.service.ts`

```typescript
import { AuditBus } from "../../infra/types.js";
import type { D1Database } from "@cloudflare/workers-types";

export class PolicyEngine {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async evaluate(
    orgId: string,
    actionType: AutomationActionType,
    context: Record<string, unknown> = {},
  ): Promise<PolicyEvaluation> {
    const row = await this.db
      .prepare(`SELECT id, allowed, reason FROM automation_policies WHERE org_id = ? AND action_type = ?`)
      .bind(orgId, actionType)
      .first<{ id: string; allowed: number; reason: string | null }>();

    // default-deny: DB lookup 실패 시 거부
    const allowed = row?.allowed === 1;
    const reason = row?.reason ?? (row ? "denied by policy" : "default-deny: no policy registered");
    const policyId = row?.id ?? null;
    const evaluatedAt = Date.now();

    // audit-bus 이벤트 발행
    await this.auditBus.emit("policy.evaluated", {
      orgId, actionType, allowed, policyId, context,
    });

    if (!allowed) {
      // policy_violations 기록
      const violationId = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO policy_violations (id, org_id, action_type, reason, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).bind(violationId, orgId, actionType, reason, JSON.stringify(context)).run();

      await this.auditBus.emit("policy.violation", {
        violationId, orgId, actionType, reason,
      });
    }

    return { allowed, reason, policyId, evaluatedAt };
  }

  async registerPolicy(input: {
    orgId: string; actionType: AutomationActionType; allowed: boolean;
    reason?: string; metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO automation_policies (id, org_id, action_type, allowed, reason, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (org_id, action_type) DO UPDATE SET
        allowed = excluded.allowed, reason = excluded.reason, metadata = excluded.metadata, updated_at = unixepoch('now') * 1000
    `).bind(id, input.orgId, input.actionType, input.allowed ? 1 : 0,
            input.reason ?? null, JSON.stringify(input.metadata ?? {})).run();
    return { id };
  }
}
```

### (f) `core/policy/routes/index.ts`

```typescript
// POST /policy/evaluate
// POST /policy/register
export const policyApp = new OpenAPIHono<{ Bindings: Env }>();
// minimal endpoints
```

### (g) audit-bus 통합 (F606)
- `policy.evaluated` event_type — payload { orgId, actionType, allowed, policyId, context }
- `policy.violation` event_type — payload { violationId, orgId, actionType, reason }

### (h) `app.ts` mount
```typescript
import { policyApp } from "./core/policy/routes/index.js";
app.route("/api/policy", policyApp);
```

### (i) test mock 1건
- whitelist 통과: registerPolicy(allowed=true) → evaluate → allowed=true
- default-deny 차단: 정책 미등록 action_type → evaluate → allowed=false + violation INSERT + audit emit

### (j) typecheck + vitest GREEN
회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 migration 0143 적용 OK + 2 테이블 | `wrangler d1 execute foundry-x-db --command "PRAGMA table_info(automation_policies)"` + violations | 둘 다 존재 |
| P-b | core/policy/ 신규 디렉토리 + 5+ files | `find packages/api/src/core/policy -type f -name "*.ts"` | types/schemas/services/routes 모두 |
| P-c | types.ts 3 export | grep | AutomationActionType + PolicyEvaluation + PolicyViolation |
| P-d | schemas/policy.ts 3 schema | grep | AutomationActionType + Register + Evaluate + Response |
| P-e | PolicyEngine class + evaluate + registerPolicy | grep | export 존재 |
| P-f | routes endpoint 2 등록 | grep `/policy/evaluate\|/policy/register` | 2 routes |
| P-g | audit-bus policy.evaluated + policy.violation 이벤트 | mock 검증 | 2 emits |
| P-h | app.ts /api/policy mount 1줄 | grep | 1 line |
| P-i | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 355 자동 INSERT | D1 query | ≥ 1건 (hook 30 sprint 연속, 누적 ≥ 41건) |
| P-k | F606/F614/F627/F628/F629 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `/api/policy/evaluate` whitelist + default-deny | curl POST 2 case | allowed=true + allowed=false |

## §5 전제

- F606 audit-bus ✅ MERGED (Sprint 351)
- F614/F627/F628/F629 ✅ MERGED
- 동시 sprint: Sprint 354 (F630, IN_PROGRESS) 평행 — 다른 도메인 (discovery vs policy)

## §6 예상 시간

- autopilot **~10분** (단순 sub-app + D1 + types + service stub + 2 endpoints + 1 test)

## §7 다음 사이클 후보 (F631 후속)

- **Sprint 356 — F624** Six Hats 외부 LLM 호출 패턴 (T2)
- Sprint 357 — F602 4대 진단 PoC (T3)
- Sprint 358 — F632 CQ 5축 + 80-20-80 (T3, F602+F605 의존)
- F615 Guard-X Solo (T4) — F631 PolicyEngine consumer로 활용
