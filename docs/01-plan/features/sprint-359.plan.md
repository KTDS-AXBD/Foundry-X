---
code: FX-PLAN-359
title: Sprint 359 — F607 AI 투명성 + 윤리 임계 (T3 세 번째)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 359
f_item: F607
req: FX-REQ-671
priority: P2
---

# Sprint 359 — F607 AI 투명성 + 윤리 임계 (T3 세 번째)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F607는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 batch SPEC sync PR이 row를 ✅로 마킹 + plan SUPERSEDED. plan §3 항목들은 모두 코드 측에 정착 (자세한 위치는 SPEC.md row 또는 core/{도메인}/ 디렉토리 참조). SPEC.md F607 row가 진실 — `Sprint 359 | ✅`.

> SPEC.md §5 F607 row가 권위 소스. 본 plan은 17 internal dev plan §3 T3 Diagnostic & HITL 세 번째 sprint.
> **시동 조건**: 354/357/358 중 1개 MERGED 후 (3 sprint 한도 준수).

## §1 배경 + 사전 측정

### F607 본질 (BeSir + INDEX.md §6 P0-8 + 16_validation_report §2.6)

| 요건 | 본 sprint 처리 |
|------|----------------|
| dual_ai_reviews + 6축 점수 prod 노출 | 기존 F552/F542 자산 재사용 (코드 변경 0) |
| **confidence < 0.7 → HITL escalation** | EthicsEnforcer.checkConfidence() 신설 |
| **FP(False Positive) 주간 측정** | EthicsEnforcer.getFPRate() + audit fp_flag UPDATE |
| **오분류 즉시 중단 (kill switch)** | kill_switch_state 테이블 + circuit breaker 패턴 |
| **AuditEventSchema에 confidence·FP 컬럼** | audit_events ALTER ADD COLUMN |
| **윤리 AI 임계 정책 코드 강제** | EthicsEnforcer 모든 LLM 호출 진입점에서 호출 |

### 기존 자산 (재사용)

| 자산 | D1 | 활용 |
|------|----|----|
| `dual_ai_reviews` | 0138 (F552) | 6축 점수 + verdict 노출 (코드 변경 0) |
| `agent_improvement_proposals.rubric_score` | 0137 (F542) | 6축 점수 prod 노출 reference |
| `audit_events` | 0140 (F606) | confidence + fp_flag ALTER ADD |

### 의존
- F606 audit-bus ✅ MERGED (Sprint 351)
- F627 llm wrapper ✅ MERGED (Sprint 350)
- F605 HITL Console (외부 의존) — 본 sprint는 escalation **목적지 contract만** 정의 (ethics_violations 테이블 + 이벤트), UI는 후속

## §2 인터뷰 4회 패턴 (S336, 38회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T3 세 번째 = F607 AI 투명성 + 윤리 임계 | F602(빌드 진단) + F632(운영 검증) 다음 자연 |
| 2차 위치 | **A core/ethics/ 신규** | 윤리 임계 명확, F632(CQ)와 별 우권 |
| 3차 분량 | **Minimal** (5 method + 2 신규 테이블 + 4 endpoints + 3 tests) | T3 표준 분량 |
| 4차 시동 | **354/357/358 중 1개 MERGED 후** | 3 sprint 한도 준수 |

## §3 범위 (a~k)

### (a) 신규 디렉토리
```
packages/api/src/core/ethics/
├── types.ts
├── schemas/
│   └── ethics.ts
├── services/
│   └── ethics-enforcer.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0146_ethics_audit.sql`

```sql
-- F607: AI 투명성 + 윤리 임계 (T3 세 번째)

-- F606 audit_events 확장
ALTER TABLE audit_events ADD COLUMN confidence REAL;
ALTER TABLE audit_events ADD COLUMN fp_flag INTEGER DEFAULT 0;
CREATE INDEX idx_audit_events_low_confidence ON audit_events(confidence) WHERE confidence < 0.7;
CREATE INDEX idx_audit_events_fp ON audit_events(fp_flag) WHERE fp_flag = 1;

-- 윤리 위반 이력 (append-only)
CREATE TABLE ethics_violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  trace_id TEXT,
  escalated_to_human INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (violation_type IN ('confidence_threshold','fp_burst','manual_kill')),
  CHECK (escalated_to_human IN (0, 1))
);

CREATE INDEX idx_ethics_violations_org ON ethics_violations(org_id, created_at DESC);
CREATE INDEX idx_ethics_violations_agent ON ethics_violations(agent_id);

CREATE TRIGGER ethics_violations_no_update BEFORE UPDATE ON ethics_violations
BEGIN SELECT RAISE(FAIL, 'ethics_violations is append-only'); END;

-- Kill Switch 상태 (org+agent별 1 row, UPDATE 가능 — 활성/비활성 토글)
CREATE TABLE kill_switch_state (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  activated_at INTEGER,
  deactivated_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (active IN (0, 1)),
  UNIQUE (org_id, agent_id)
);

CREATE INDEX idx_kill_switch_active ON kill_switch_state(org_id, active) WHERE active = 1;
```

### (c) `core/ethics/types.ts`

```typescript
// F607: AI 투명성 + 윤리 임계
export const ETHICS_VIOLATION_TYPES = ["confidence_threshold", "fp_burst", "manual_kill"] as const;
export type EthicsViolationType = typeof ETHICS_VIOLATION_TYPES[number];

export const CONFIDENCE_THRESHOLD = 0.7;
export type ConfidenceLevel = "low" | "medium" | "high";

export interface EthicsViolation {
  id: string;
  orgId: string;
  agentId: string;
  violationType: EthicsViolationType;
  thresholdValue: number;
  actualValue: number;
  traceId: string | null;
  escalatedToHuman: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

export interface KillSwitchState {
  id: string;
  orgId: string;
  agentId: string;
  active: boolean;
  reason: string | null;
  activatedAt: number | null;
  deactivatedAt: number | null;
}

export interface FPRateResult {
  agentId: string;
  totalCalls: number;
  fpCount: number;
  fpRate: number;
  windowDays: number;
}

export { EthicsEnforcer } from "./services/ethics-enforcer.service.js";
export * from "./schemas/ethics.js";
```

### (d) `core/ethics/schemas/ethics.ts`

```typescript
export const EthicsViolationTypeSchema = z.enum(ETHICS_VIOLATION_TYPES);

export const CheckConfidenceSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  callMeta: z.object({
    confidence: z.number().min(0).max(1),
    callId: z.string(),
    traceId: z.string().optional(),
  }),
}).openapi("CheckConfidence");

export const RecordFPSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  callId: z.string(),
  reason: z.string().optional(),
}).openapi("RecordFP");

export const KillSwitchToggleSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  active: z.boolean(),
  reason: z.string().optional(),
}).openapi("KillSwitchToggle");

export const EthicsViolationResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  agentId: z.string(),
  violationType: EthicsViolationTypeSchema,
  thresholdValue: z.number(),
  actualValue: z.number(),
  traceId: z.string().nullable(),
  escalatedToHuman: z.boolean(),
  metadata: z.any().nullable(),
  createdAt: z.number(),
}).openapi("EthicsViolation");
```

### (e) `core/ethics/services/ethics-enforcer.service.ts`

```typescript
export class EthicsEnforcer {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async checkConfidence(input: { orgId: string; agentId: string; callMeta: { confidence: number; callId: string; traceId?: string } }): Promise<{ passed: boolean; escalated: boolean }> {
    if (input.callMeta.confidence >= CONFIDENCE_THRESHOLD) {
      return { passed: true, escalated: false };
    }
    // 위반 → ethics_violations INSERT + escalation
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO ethics_violations (id, org_id, agent_id, violation_type, threshold_value, actual_value, trace_id, escalated_to_human, metadata)
      VALUES (?, ?, ?, 'confidence_threshold', ?, ?, ?, 1, ?)
    `).bind(id, input.orgId, input.agentId, CONFIDENCE_THRESHOLD, input.callMeta.confidence,
            input.callMeta.traceId ?? null, JSON.stringify({ callId: input.callMeta.callId })).run();

    await this.auditBus.emit("ethics.threshold_violated", {
      violationId: id, orgId: input.orgId, agentId: input.agentId,
      violationType: "confidence_threshold",
      threshold: CONFIDENCE_THRESHOLD, actual: input.callMeta.confidence,
    });

    return { passed: false, escalated: true };
  }

  async recordFP(input: { orgId: string; agentId: string; callId: string; reason?: string }): Promise<void> {
    // audit_events fp_flag UPDATE는 append-only 위반이므로 별도 ethics_violations 기록
    await this.db.prepare(`
      INSERT INTO ethics_violations (id, org_id, agent_id, violation_type, threshold_value, actual_value, metadata)
      VALUES (?, ?, ?, 'fp_burst', 0, 1, ?)
    `).bind(crypto.randomUUID(), input.orgId, input.agentId,
            JSON.stringify({ callId: input.callId, reason: input.reason ?? "" })).run();

    await this.auditBus.emit("ethics.fp_recorded", { orgId: input.orgId, agentId: input.agentId, callId: input.callId });
  }

  async getKillSwitchState(orgId: string, agentId: string): Promise<KillSwitchState | null> {
    const row = await this.db.prepare(`
      SELECT * FROM kill_switch_state WHERE org_id = ? AND agent_id = ?
    `).bind(orgId, agentId).first<any>();
    return row ? mapKillSwitchRow(row) : null;
  }

  async triggerKillSwitch(input: { orgId: string; agentId: string; active: boolean; reason?: string }): Promise<KillSwitchState> {
    const id = crypto.randomUUID();
    const now = Date.now();
    await this.db.prepare(`
      INSERT INTO kill_switch_state (id, org_id, agent_id, active, reason, activated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (org_id, agent_id) DO UPDATE SET
        active = excluded.active,
        reason = excluded.reason,
        activated_at = CASE WHEN excluded.active = 1 THEN ? ELSE activated_at END,
        deactivated_at = CASE WHEN excluded.active = 0 THEN ? ELSE NULL END,
        updated_at = ?
    `).bind(id, input.orgId, input.agentId, input.active ? 1 : 0, input.reason ?? null, now, now, now, now).run();

    await this.auditBus.emit("ethics.kill_switch_triggered", { orgId: input.orgId, agentId: input.agentId, active: input.active, reason: input.reason });
    return (await this.getKillSwitchState(input.orgId, input.agentId))!;
  }

  async getFPRate(orgId: string, agentId: string, days: number = 7): Promise<FPRateResult> {
    const since = Date.now() - days * 86400 * 1000;
    const total = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM audit_events WHERE tenant_id = ? AND timestamp >= ?
    `).bind(orgId, since).first<{ cnt: number }>();
    const fp = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM ethics_violations WHERE org_id = ? AND agent_id = ? AND violation_type = 'fp_burst' AND created_at >= ?
    `).bind(orgId, agentId, since).first<{ cnt: number }>();
    const totalCalls = total?.cnt ?? 0;
    const fpCount = fp?.cnt ?? 0;
    return { agentId, totalCalls, fpCount, fpRate: totalCalls ? fpCount / totalCalls : 0, windowDays: days };
  }
}
```

### (f) `core/ethics/routes/index.ts`

```typescript
// POST /ethics/check-confidence
// GET /ethics/violations?agent_id=...
// POST /ethics/kill-switch
// GET /ethics/fp-stats?agent_id=...&days=7
export const ethicsApp = new OpenAPIHono<{ Bindings: Env }>();
```

### (g) audit-bus 통합 (F606)
- `ethics.threshold_violated` (confidence < 0.7)
- `ethics.kill_switch_triggered` (kill switch 토글)
- `ethics.fp_recorded` (FP 기록)

### (h) `app.ts` mount
```typescript
app.route("/api/ethics", ethicsApp);
```

### (i) test mock 3건
- Test 1: confidence 0.6 → checkConfidence → escalated=true + ethics_violations INSERT + audit emit
- Test 2: recordFP → ethics_violations + audit emit
- Test 3: triggerKillSwitch(active=true) → 상태 active=1 + audit emit

### (j) typecheck + tests GREEN
회귀 0 확증.

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0146 적용 + audit_events 컬럼 + 2 신규 테이블 | wrangler PRAGMA | confidence + fp_flag + ethics_violations + kill_switch_state |
| P-b | core/ethics/ 5+ files | find | types/schemas/services/routes 모두 |
| P-c | types.ts 4 export | grep | EthicsViolationType + ConfidenceLevel + EthicsViolation + KillSwitchState |
| P-d | schemas 3 등록 | grep | CheckConfidence + RecordFP + KillSwitchToggle + Response |
| P-e | EthicsEnforcer class + 5 method | grep | checkConfidence + recordFP + get/triggerKillSwitch + getFPRate |
| P-f | routes 4 endpoints | grep | check-confidence + violations + kill-switch + fp-stats |
| P-g | audit-bus 3 이벤트 mock | mock | 3 emits |
| P-h | app.ts /api/ethics mount | grep | 1 line |
| P-i | typecheck + 3 tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 359 자동 INSERT | D1 query | ≥ 1건 (hook 34 sprint 연속, 누적 ≥ 45건) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/ethics/check-confidence` confidence=0.6 → escalation true | curl | 200 OK + escalated true |

## §5 전제

- F606 audit-bus ✅ MERGED
- F627 llm wrapper ✅ MERGED
- 기존 dual_ai_reviews(F552) + rubric_score(F542) 활용 (코드 변경 0)
- 354/357/358 중 1개 MERGED 후 시동 (3 sprint 한도)

## §6 예상 시간

- autopilot **~20분** (Minimal — 5 method + ALTER + 2 신규 테이블 + 4 endpoints + 3 tests)

## §7 다음 사이클 후보 (F607 후속, T3 종결 → T4 진입)

- **Sprint 360 — F615** Guard-X Solo (T4, F606+F601 의존, F601 SSO/MT는 T4 골격으로 분리)
- Sprint 361 — F616 Launch-X Solo (T4, F606)
- Sprint 362 — F623 /ax:domain-init β (T4, F628+F629 ✅ 의존)
- T3 종결 마일스톤 (4대 진단 + CQ 5축 + 윤리 임계 = BeSir 평가 메커니즘 3종 완성)
