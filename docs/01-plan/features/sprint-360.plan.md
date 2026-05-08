---
code: FX-PLAN-360
title: Sprint 360 — F615 Guard-X Solo (T4 첫 sprint)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 360
f_item: F615
req: FX-REQ-680
priority: P2
---

# Sprint 360 — F615 Guard-X Solo (T4 첫 sprint)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F615는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 batch SPEC sync PR이 row를 ✅로 마킹 + plan SUPERSEDED. plan §3 항목들은 모두 코드 측에 정착 (자세한 위치는 SPEC.md row 또는 core/{도메인}/ 디렉토리 참조). SPEC.md F615 row가 진실 — `Sprint 360 | ✅`.

> SPEC.md §5 F615 row가 권위 소스. 본 plan은 17 internal dev plan §3 T4 Sub-app Solo 첫 sprint.
> 09 dev_plan_guard_x_v1.md §7.1 GX-S01~S09 중 **GX-S01~S04 + S08 (Minimal)** 적용.

## §1 배경 + 사전 측정

INDEX.md §6 5 sub-app 중 첫 번째 누락 등록. BeSir 정합성 P0-A1 (default-deny 코어).

### 의존 unlock

| 의존 F# | 상태 | 활용 |
|---------|------|------|
| F606 audit-bus | ✅ MERGED (Sprint 351) | guard.checked 이벤트 발행 |
| F627 llm wrapper | ✅ MERGED (Sprint 350) | (필요 시 호출) |
| **F631 PolicyEngine** | ✅ MERGED (Sprint 355) | **Guard-X = consumer** (consumer-provider 패턴) |
| F628 BesirEntityType | ✅ MERGED (Sprint 352) | TenantContext 일부 |
| F601 PG | 외부 (D1 fallback OK) | 17 plan §2 정정으로 즉시 진행 |

## §2 인터뷰 4회 패턴 (S336, 39회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T4 첫 sprint = F615 Guard-X Solo | T3 종결 후 자연 진행 |
| 2차 분량 | **Minimal** (GX-S01~S04 P0 + S08 test) | T4 첫 sprint 적정 |
| 3차 mount | **`/api/guard`** | Foundry-X 패턴 일치 |
| 4차 시동 | **즉시** | 357 MERGED + 354 머지 임박, 한도 내 안전 |

## §3 범위 (a~l)

### (a) 신규 디렉토리
```
packages/api/src/core/guard/
├── types.ts
├── schemas/
│   └── guard.ts
├── services/
│   ├── guard-engine.service.ts
│   └── hmac.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0147_guard_decisions.sql`

```sql
-- F615: Guard-X Solo (T4) — guard_decisions append-only

CREATE TABLE guard_decisions (
  id TEXT PRIMARY KEY,                  -- ULID 26char
  check_id TEXT NOT NULL UNIQUE,        -- 호출자 측 reference
  org_id TEXT NOT NULL,
  tenant_id TEXT,
  action_type TEXT NOT NULL,            -- F631 AutomationActionType
  policy_id TEXT,                       -- F631 automation_policies.id ref (nullable)
  violation INTEGER NOT NULL DEFAULT 0, -- 0=allowed, 1=violated
  audit_event_id INTEGER,               -- F606 audit_events.id ref
  hmac_signature TEXT NOT NULL,
  actor TEXT,
  metadata TEXT,                        -- JSON
  decided_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (violation IN (0, 1))
);

CREATE INDEX idx_guard_decisions_org ON guard_decisions(org_id, decided_at DESC);
CREATE INDEX idx_guard_decisions_action ON guard_decisions(org_id, action_type, decided_at DESC);
CREATE INDEX idx_guard_decisions_violations ON guard_decisions(violation) WHERE violation = 1;

-- append-only 보장 (F606 패턴)
CREATE TRIGGER guard_decisions_no_update BEFORE UPDATE ON guard_decisions
BEGIN SELECT RAISE(FAIL, 'guard_decisions is append-only'); END;
```

### (c) `core/guard/types.ts` (GX-S02)

```typescript
import type { AutomationActionType } from "../policy/types.js"; // F631 import — types.ts 경유

export interface TenantContext {
  orgId: string;
  tenantId?: string;
  actor?: string;
}

export interface GuardCheckRequest {
  context: TenantContext;
  actionType: AutomationActionType;
  metadata?: Record<string, unknown>;
}

export interface GuardViolation {
  policyId: string | null;
  reason: string;
  severity: "info" | "warning" | "critical";
}

export interface GuardCheckResponse {
  checkId: string;            // ULID 26char
  allowed: boolean;
  violations: GuardViolation[];
  hmacSignature: string;
  auditEventId: number | null;
  decidedAt: number;
}

export interface GuardDecisionRecord {
  id: string;
  checkId: string;
  orgId: string;
  tenantId: string | null;
  actionType: AutomationActionType;
  policyId: string | null;
  violation: boolean;
  hmacSignature: string;
  decidedAt: number;
}

export { GuardEngine } from "./services/guard-engine.service.js";
export * from "./schemas/guard.js";
```

### (d) `core/guard/schemas/guard.ts`

```typescript
import { AutomationActionTypeSchema } from "../../policy/types.js";

export const TenantContextSchema = z.object({
  orgId: z.string().min(1),
  tenantId: z.string().optional(),
  actor: z.string().optional(),
});

export const GuardCheckRequestSchema = z.object({
  context: TenantContextSchema,
  actionType: AutomationActionTypeSchema,
  metadata: z.record(z.unknown()).optional(),
}).openapi("GuardCheckRequest");

export const GuardCheckResponseSchema = z.object({
  checkId: z.string().length(26),    // ULID
  allowed: z.boolean(),
  violations: z.array(z.object({
    policyId: z.string().nullable(),
    reason: z.string(),
    severity: z.enum(["info","warning","critical"]),
  })),
  hmacSignature: z.string(),
  auditEventId: z.number().nullable(),
  decidedAt: z.number(),
}).openapi("GuardCheckResponse");
```

### (e) `core/guard/services/hmac.ts` (GX-S03 부분)

```typescript
export async function computeHmacSignature(payload: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHmacSignature(payload: string, key: string, signature: string): Promise<boolean> {
  const expected = await computeHmacSignature(payload, key);
  return expected === signature;
}

// ULID 발급 (간단 구현, ulid 라이브러리 미설치 시)
export function generateULID(): string {
  const time = Date.now().toString(36).padStart(10, "0").slice(0, 10);
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(36)).join("").slice(0, 16).padStart(16, "0");
  return (time + random).toUpperCase().slice(0, 26);
}
```

### (f) `core/guard/services/guard-engine.service.ts` (GX-S03)

```typescript
import { PolicyEngine } from "../../policy/types.js";
import { AuditBus } from "../../infra/types.js";
import { computeHmacSignature, generateULID } from "./hmac.js";

export class GuardEngine {
  constructor(
    private db: D1Database,
    private policyEngine: PolicyEngine,
    private auditBus: AuditBus,
    private hmacKey: string,
  ) {}

  async check(request: GuardCheckRequest): Promise<GuardCheckResponse> {
    // 1. ULID 발급
    const checkId = generateULID();
    const decidedAt = Date.now();

    // 2. F631 PolicyEngine consumer 패턴
    const policyResult = await this.policyEngine.evaluate(
      request.context.orgId,
      request.actionType,
      request.metadata ?? {},
    );

    const allowed = policyResult.allowed;
    const violations: GuardViolation[] = allowed
      ? []
      : [{ policyId: policyResult.policyId, reason: policyResult.reason, severity: "warning" }];

    // 3. HMAC 서명 발급
    const payloadForSig = `${checkId}|${request.context.orgId}|${request.actionType}|${allowed ? "1" : "0"}|${decidedAt}`;
    const hmacSignature = await computeHmacSignature(payloadForSig, this.hmacKey);

    // 4. F606 audit-bus emit
    await this.auditBus.emit("guard.checked", {
      checkId, orgId: request.context.orgId, actionType: request.actionType,
      allowed, policyId: policyResult.policyId, violations,
    });

    // 5. guard_decisions INSERT
    await this.db.prepare(`
      INSERT INTO guard_decisions
        (id, check_id, org_id, tenant_id, action_type, policy_id, violation, hmac_signature, actor, metadata, decided_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      checkId, checkId, request.context.orgId, request.context.tenantId ?? null,
      request.actionType, policyResult.policyId, allowed ? 0 : 1,
      hmacSignature, request.context.actor ?? null,
      JSON.stringify(request.metadata ?? {}), decidedAt,
    ).run();

    return { checkId, allowed, violations, hmacSignature, auditEventId: null, decidedAt };
  }
}
```

### (g) `core/guard/routes/index.ts`

```typescript
// POST /guard/check (GX-S03)
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
export const guardApp = new OpenAPIHono<{ Bindings: Env }>();

const checkRoute = createRoute({
  method: "post",
  path: "/check",
  request: { body: { content: { "application/json": { schema: GuardCheckRequestSchema } } } },
  responses: { 200: { content: { "application/json": { schema: GuardCheckResponseSchema } } } },
});

guardApp.openapi(checkRoute, async (c) => {
  const request = c.req.valid("json");
  const guardEngine = new GuardEngine(/* deps from c.env */);
  const response = await guardEngine.check(request);
  return c.json(response);
});
```

### (h) audit-bus 통합 (F606)
- `guard.checked` event_type
- payload: `{ checkId, orgId, actionType, allowed, policyId, violations }`

### (i) `app.ts` mount
```typescript
import { guardApp } from "./core/guard/routes/index.js";
app.route("/api/guard", guardApp);
```

### (j) test mock 1건 (GX-S08 부분)

`__tests__/guard-engine.test.ts`:
- Mock D1 + Mock PolicyEngine (allowed=true case + allowed=false case)
- Mock AuditBus
- Test 1: GuardCheck allowed=true → 200 OK + ULID 26char + HMAC valid + guard_decisions INSERT 1
- Test 2: GuardCheck allowed=false → 200 OK + violations[0] + violation=1 + audit emit

### (k) typecheck + tests GREEN
회귀 0 확증.

### (l) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0147 적용 + guard_decisions | wrangler PRAGMA | 테이블 + index 3 + trigger 1 |
| P-b | core/guard/ 5+ files | find | types/schemas/services 2/routes |
| P-c | types.ts 5 export | grep | GuardCheckRequest/Response/Violation/TenantContext/DecisionRecord |
| P-d | schemas 3 등록 | grep | TenantContext + Request + Response |
| P-e | GuardEngine class + check + hmac | grep | export 4 |
| P-f | routes 1 endpoint | grep `/guard/check` | 1 |
| P-g | audit-bus guard.checked 이벤트 | mock | emit |
| P-h | app.ts /api/guard mount | grep | 1 line |
| P-i | typecheck + 1 test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 360 자동 INSERT | D1 query | ≥ 1건 (hook 35 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/guard/check` | curl | 200 OK + ULID 26char + HMAC + allowed boolean |

## §5 전제

- F606/F627/F628/F631 ✅ MERGED
- F601 PG는 외부 (D1 fallback OK)
- env GUARD_HMAC_KEY 신규 (개발 시 placeholder, prod는 wrangler secret)

## §6 예상 시간

- autopilot **~20~25분** (Minimal GX-S01~S04+S08, Hono + D1 + ULID/HMAC + PolicyEngine consumer + 1 test)

## §7 다음 사이클 후보 (F615 후속, T4 진행)

- **Sprint 361 — F616** Launch-X Solo (T4 ②, F606)
- Sprint 362 — F623 /ax:domain-init β (T4, F628+F629 ✅)
- Sprint 363 — F603 default-deny 골격 (T4, 자체)
- F617 Guard-X Integration (T5, F615 ✅ 후, Workflow hook + 룰셋 v1.0)
