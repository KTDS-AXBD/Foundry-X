---
code: FX-PLAN-365
title: Sprint 365 — F617 Guard-X Integration (T5 첫 sprint)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 365
f_item: F617
req: FX-REQ-682
priority: P2
---

# Sprint 365 — F617 Guard-X Integration (T5 첫 sprint)

> SPEC.md §5 F617 row가 권위 소스. 17 internal dev plan §3 T5 Integration 첫 sprint.
> 09 dev_plan_guard_x_v1.md §7.2 GX-I01~I08 중 **GX-I01 + GX-I02(sample.yaml 1건) + GX-I06 (Minimal)** 적용.

## §1 배경 + 사전 측정

T5 진입 — F615 Guard-X Solo 위에 Workflow + RuleEngine 통합.

### 09 dev plan §7.2 GX-I 매핑

| Stage | 작업 | 본 sprint |
|-------|------|-----------|
| **GX-I01** | Workflow Coord 정책팩 발행 직전 hook | ✅ |
| **GX-I02** | 룰셋 v1.0 (정책팩 12 + Skill Package 8) | ⚪ Minimal (sample.yaml 1건만) |
| GX-I03 | PII 탐지 ML 모델 호출 | 후속 sprint |
| GX-I04 | Discovery-X diagnosis BC 연결 | 후속 sprint |
| GX-I05 | ApprovalManager 알림 채널 | 후속 sprint |
| **GX-I06** | E2E (publish → 차단 → 수정 → 재publish) | ✅ |
| GX-I07/I08 | 룰셋 버전 추적 + Cost 측정 | 후속 sprint |

### F615 Guard-X Solo (Sprint 360 ✅) 자산
| 자산 | 용도 |
|------|------|
| `core/guard/services/guard-engine.service.ts` | GuardEngine.check() (consumer of F631 PolicyEngine) |
| `core/guard/services/hmac.ts` | ULID + HMAC SHA256 |
| `core/guard/types.ts` + `schemas/guard.ts` | GuardCheckRequest/Response + zod |
| `core/guard/routes/index.ts` | POST /guard/check |
| D1 0147_guard_decisions | append-only |

### 의존
- F615 Guard-X Solo ✅ MERGED (Sprint 360)
- F606 audit-bus ✅
- F631 PolicyEngine ✅

## §2 인터뷰 4회 패턴 (S336, 44회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T5 첫 sprint = F617 Guard-X Integration | F615 Solo 후 자연 |
| 2차 분량 | **Minimal (GX-I01 + I02 minimal + I06)** | T5 첫 sprint 적정 |
| 3차 위치 | core/guard/ 합류 | F615 sub-app 확장 |
| 4차 시동 | **즉시** | 활성 sprint 2 → 3 sprint 한도 내 |

## §3 범위 (a~k)

### (a) `core/guard/services/workflow-hook.service.ts` 신설 (GX-I01)

```typescript
import { GuardEngine } from "./guard-engine.service.js";
import { AuditBus } from "../../infra/types.js";
import type { AutomationActionType } from "../../policy/types.js";

export interface WorkflowAction {
  workflowId: string;
  action: "publish_policy_pack" | "deploy_skill" | "export_artifact";
  orgId: string;
  actor: string;
  sensitivityLabel?: "public" | "internal" | "confidential" | "secret";
  metadata?: Record<string, unknown>;
}

export interface InterceptResult {
  blocked: boolean;
  checkId: string;
  reason?: string;
  violations: Array<{ ruleId: string; message: string }>;
}

export class WorkflowHookService {
  constructor(
    private guardEngine: GuardEngine,
    private ruleEngine: RuleEngine,
    private auditBus: AuditBus,
  ) {}

  async interceptPolicyPackPublish(action: WorkflowAction): Promise<InterceptResult> {
    // 1. GX-S03 GuardEngine.check() 호출 (Policy 평가)
    const guardResult = await this.guardEngine.check({
      context: { orgId: action.orgId, actor: action.actor },
      actionType: this.mapToActionType(action.action),
      metadata: action.metadata,
    });

    // 2. RuleEngine 평가 (GX-I02 룰셋)
    const violations = await this.ruleEngine.evaluateRules(action);

    const blocked = !guardResult.allowed || violations.length > 0;

    // 3. audit-bus 발행
    await this.auditBus.emit("guard.workflow_hook_invoked", {
      workflowId: action.workflowId,
      checkId: guardResult.checkId,
      blocked,
      violationCount: violations.length,
    });

    if (blocked) {
      await this.auditBus.emit("guard.publish_blocked", {
        workflowId: action.workflowId,
        reason: !guardResult.allowed ? "policy_denied" : "rule_violation",
        violations: violations.map(v => v.ruleId),
      });
    }

    return {
      blocked,
      checkId: guardResult.checkId,
      reason: blocked ? "policy/rule violation" : undefined,
      violations: violations.map(v => ({ ruleId: v.ruleId, message: v.message })),
    };
  }

  private mapToActionType(action: WorkflowAction["action"]): AutomationActionType {
    if (action === "publish_policy_pack") return "state_change";
    if (action === "deploy_skill") return "state_change";
    return "external_api_call";
  }
}
```

### (b) `core/guard/services/rule-engine.service.ts` 신설 (GX-I02 골격)

```typescript
import { parse as yamlParse } from "yaml";
import { AuditBus } from "../../infra/types.js";

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  matchPattern: { sensitivityLabel?: string[]; actionType?: string[] };
  action: "deny" | "warn" | "require_approval";
  severity: "info" | "warning" | "critical";
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export class RuleEngine {
  private rules: RuleDefinition[] = [];

  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async loadRulesFromYaml(yamlContent: string): Promise<void> {
    const parsed = yamlParse(yamlContent);
    this.rules = parsed.rules as RuleDefinition[];
  }

  async getActiveRules(): Promise<RuleDefinition[]> {
    if (this.rules.length === 0) {
      const rows = await this.db.prepare(`
        SELECT id, rule_name, rule_yaml FROM guard_rules WHERE active = 1
      `).all<{ id: string; rule_name: string; rule_yaml: string }>();
      this.rules = (rows.results ?? []).map(r => yamlParse(r.rule_yaml));
    }
    return this.rules;
  }

  async evaluateRules(action: WorkflowAction): Promise<RuleViolation[]> {
    const rules = await this.getActiveRules();
    const violations: RuleViolation[] = [];

    for (const rule of rules) {
      if (this.matches(rule, action)) {
        const violation: RuleViolation = {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Rule ${rule.name} violated: ${rule.description}`,
        };
        violations.push(violation);

        // guard_rule_violations INSERT
        await this.db.prepare(`
          INSERT INTO guard_rule_violations (id, rule_id, violation_message, severity)
          VALUES (?, ?, ?, ?)
        `).bind(crypto.randomUUID(), rule.id, violation.message, rule.severity).run();

        await this.auditBus.emit("guard.rule_violation", {
          ruleId: rule.id, ruleName: rule.name, severity: rule.severity,
        });
      }
    }
    return violations;
  }

  private matches(rule: RuleDefinition, action: WorkflowAction): boolean {
    if (rule.matchPattern.sensitivityLabel?.includes(action.sensitivityLabel ?? "")) return true;
    return false;
  }
}
```

### (c) `core/guard/rules/policy_pack/sample.yaml` 신설 (GX-I02 1건)

```yaml
# Sample rule v1.0 — confidential 정책팩 publish 차단
id: rule-confidential-publish-block
name: ConfidentialPublishBlock
description: confidential 라벨이 붙은 정책팩 publish 차단
matchPattern:
  sensitivityLabel: ["confidential", "secret"]
  actionType: ["publish_policy_pack"]
action: deny
severity: critical
```

### (d) D1 migration `0151_guard_rules.sql`

```sql
-- F617: Guard-X Integration (T5)

CREATE TABLE guard_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_yaml TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (active IN (0, 1))
);

CREATE INDEX idx_guard_rules_active ON guard_rules(active) WHERE active = 1;

CREATE TABLE guard_rule_violations (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  check_id TEXT,                                -- F615 guard_decisions.id ref
  violation_message TEXT NOT NULL,
  severity TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (severity IN ('info','warning','critical')),
  FOREIGN KEY (rule_id) REFERENCES guard_rules(id)
);

CREATE INDEX idx_guard_rule_violations_rule ON guard_rule_violations(rule_id);
CREATE INDEX idx_guard_rule_violations_severity ON guard_rule_violations(severity, created_at DESC);

-- append-only
CREATE TRIGGER guard_rule_violations_no_update BEFORE UPDATE ON guard_rule_violations
BEGIN SELECT RAISE(FAIL, 'guard_rule_violations is append-only'); END;
```

### (e) `core/guard/types.ts` 갱신
```typescript
export type { WorkflowAction, InterceptResult } from "./services/workflow-hook.service.js";
export type { RuleDefinition, RuleViolation } from "./services/rule-engine.service.js";
export { WorkflowHookService } from "./services/workflow-hook.service.js";
export { RuleEngine } from "./services/rule-engine.service.js";
```

### (f) `core/guard/schemas/guard.ts` 갱신
```typescript
export const WorkflowHookSchema = z.object({
  workflowId: z.string().min(1),
  action: z.enum(["publish_policy_pack","deploy_skill","export_artifact"]),
  orgId: z.string().min(1),
  actor: z.string().min(1),
  sensitivityLabel: z.enum(["public","internal","confidential","secret"]).optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("WorkflowHook");

export const InterceptResponseSchema = z.object({
  blocked: z.boolean(),
  checkId: z.string(),
  reason: z.string().optional(),
  violations: z.array(z.object({ ruleId: z.string(), message: z.string() })),
}).openapi("InterceptResponse");
```

### (g) `core/guard/routes/index.ts` — endpoint 추가

```typescript
const workflowHookRoute = createRoute({
  method: "post",
  path: "/workflow-hook",
  request: { body: { content: { "application/json": { schema: WorkflowHookSchema } } } },
  responses: { 200: { content: { "application/json": { schema: InterceptResponseSchema } } } },
});
```

### (h) audit-bus (F606)
- `guard.workflow_hook_invoked`
- `guard.rule_violation`
- `guard.publish_blocked`

### (i) E2E test 1건 (GX-I06)

`__tests__/guard-workflow-integration.test.ts`:
- Step 1: sample.yaml 룰 로드 (rule-confidential-publish-block)
- Step 2: confidential 정책팩 publish 시도 → workflow-hook 호출
- Step 3: blocked=true + violation 1건 + audit emit 3 (invoked + rule_violation + publish_blocked)
- Step 4: sensitivityLabel 변경(internal) → 재시도 → blocked=false + 통과

### (j) typecheck + tests GREEN
회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0151 적용 + 2 테이블 | wrangler PRAGMA | guard_rules + guard_rule_violations |
| P-b | core/guard/services/ 2 신규 | find | workflow-hook + rule-engine |
| P-c | rules/policy_pack/sample.yaml 신설 | find + grep | 1 rule 정의 |
| P-d | types.ts 3 신규 export | grep | WorkflowAction + RuleDefinition + RuleViolation |
| P-e | schemas 2 추가 | grep | WorkflowHook + InterceptResponse |
| P-f | 4 method | grep | interceptPolicyPackPublish + loadRulesFromYaml + evaluateRules + getActiveRules |
| P-g | routes endpoint 1 추가 | grep `/guard/workflow-hook` | 1 |
| P-h | audit-bus 3 이벤트 mock | mock | 3 emits |
| P-i | typecheck + 1 E2E test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 365 자동 INSERT | D1 query | ≥ 1건 (hook 40 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631/F615 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/guard/workflow-hook` confidential → blocked=true | curl | 200 OK + blocked + violation |

## §5 전제

- F615 Guard-X Solo ✅ MERGED (Sprint 360)
- F606 audit-bus ✅ MERGED
- F631 PolicyEngine ✅ MERGED
- 활성 sprint 362/363 — 365 시동 시 3 sprint 한도

## §6 예상 시간

- autopilot **~20~25분** (Minimal — 2 service + 1 YAML + D1 2 tables + 1 endpoint + 1 E2E test)

## §7 다음 사이클 후보 (F617 후속)

- **Sprint 366 — F618** Launch-X Integration (T5, F616 ✅)
- Sprint 367 — F620 Cross-Org Integration (T5, F603 후)
- Sprint 368 — F621 KPI 통합 (T5/T6, F604+F605 의존)
- T5 종결 후 T6 외부 의존 게이트 (F619 Decode-X / F600 5-Layer / F601 Multi-Tenant PG)
