---
code: FX-DSGN-365
title: Sprint 365 — F617 Guard-X Integration (T5 첫 sprint) Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 365
f_item: F617
req: FX-REQ-682
priority: P2
---

# Sprint 365 — F617 Guard-X Integration Design

> Plan 참조: `docs/01-plan/features/sprint-365.plan.md`
> SPEC.md §5 F617 row 권위 소스.

## §1 개요

F615 Guard-X Solo 위에 Workflow Hook + RuleEngine 연결. GX-I01(workflow-hook) + GX-I02(YAML 룰 1건) + GX-I06(E2E 1건) Minimal.

```
POST /api/guard/workflow-hook
         │
         ▼
WorkflowHookService.interceptPolicyPackPublish(action)
  ├── GuardEngine.check()          ← F615 기존
  ├── RuleEngine.evaluateRules()   ← F617 신규
  └── AuditBus.emit × 3           ← F606 기존
              │
              ▼
      InterceptResult { blocked, checkId, violations }
```

## §2 의존 확인

| 의존 | 상태 | 확인 방법 |
|------|------|----------|
| F615 GuardEngine | ✅ MERGED | core/guard/services/guard-engine.service.ts |
| F606 AuditBus | ✅ MERGED | core/infra/audit-bus.ts |
| F631 PolicyEngine | ✅ MERGED | core/policy/services/policy-engine.service.ts |
| yaml npm pkg | ✅ Added | packages/api/package.json ^2.8.4 |

## §3 신규/수정 파일 매핑

| # | 경로 | 작업 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0151_guard_rules.sql` | 신규 — guard_rules + guard_rule_violations |
| 2 | `packages/api/src/core/guard/services/workflow-hook.service.ts` | 신규 — WorkflowHookService |
| 3 | `packages/api/src/core/guard/services/rule-engine.service.ts` | 신규 — RuleEngine |
| 4 | `packages/api/src/core/guard/rules/policy_pack/sample.yaml` | 신규 — 1 rule |
| 5 | `packages/api/src/core/guard/types.ts` | 수정 — WorkflowAction + RuleDefinition + RuleViolation + InterceptResult |
| 6 | `packages/api/src/core/guard/schemas/guard.ts` | 수정 — WorkflowHookSchema + InterceptResponseSchema |
| 7 | `packages/api/src/core/guard/routes/index.ts` | 수정 — POST /guard/workflow-hook 추가 |
| 8 | `packages/api/src/__tests__/guard-workflow-integration.test.ts` | 신규 — GX-I06 E2E test |

## §4 인터페이스 설계

### 4.1 신규 타입 (types.ts 갱신 대상)

```typescript
// 워크플로우 훅 입력 (GX-I01)
interface WorkflowAction {
  workflowId: string;
  action: "publish_policy_pack" | "deploy_skill" | "export_artifact";
  orgId: string;
  actor: string;
  sensitivityLabel?: "public" | "internal" | "confidential" | "secret";
  metadata?: Record<string, unknown>;
}

// 훅 결과
interface InterceptResult {
  blocked: boolean;
  checkId: string;
  reason?: string;
  violations: Array<{ ruleId: string; message: string }>;
}

// 룰 정의 (GX-I02, YAML → 역직렬화)
interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  matchPattern: {
    sensitivityLabel?: string[];
    actionType?: string[];
  };
  action: "deny" | "warn" | "require_approval";
  severity: "info" | "warning" | "critical";
}

// 룰 위반
interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  message: string;
}
```

### 4.2 WorkflowHookService (GX-I01)

```
WorkflowHookService(guardEngine, ruleEngine, auditBus)
  interceptPolicyPackPublish(action):
    1. guardEngine.check({ context: { orgId, actor }, actionType: mapped, metadata })
    2. ruleEngine.evaluateRules(action)
    3. blocked = !guardResult.allowed || violations.length > 0
    4. auditBus.emit("guard.workflow_hook_invoked", { workflowId, checkId, blocked })
    5. if blocked: auditBus.emit("guard.publish_blocked", { workflowId, reason, violations })
    6. return InterceptResult
```

### 4.3 RuleEngine (GX-I02 골격)

```
RuleEngine(db, auditBus)
  in-memory cache: rules[]
  loadRulesFromYaml(yamlContent): parse yaml → this.rules
  getActiveRules(): this.rules || D1 SELECT active=1
  evaluateRules(action):
    for each rule:
      if matches(rule, action): record violation + D1 INSERT + auditBus.emit
    return violations[]
  private matches(rule, action):
    if rule.matchPattern.sensitivityLabel includes action.sensitivityLabel → true
    return false
```

### 4.4 D1 스키마

```sql
guard_rules: id TEXT PK, rule_name TEXT UNIQUE, rule_yaml TEXT, version TEXT, active INTEGER, created_at INTEGER
guard_rule_violations: id TEXT PK, rule_id TEXT FK, check_id TEXT, violation_message TEXT, severity TEXT, created_at INTEGER
  append-only trigger
```

### 4.5 API 엔드포인트

```
POST /api/guard/workflow-hook
  body: WorkflowHookSchema
  response: InterceptResponseSchema
```

## §5 audit-bus 이벤트 명세

| 이벤트 | 트리거 | payload |
|--------|--------|---------|
| `guard.workflow_hook_invoked` | 매 훅 호출 시 | workflowId, checkId, blocked, violationCount |
| `guard.rule_violation` | 룰 위반 건별 | ruleId, ruleName, severity |
| `guard.publish_blocked` | blocked=true 시 | workflowId, reason, violations[] |

## §6 테스트 계약 (TDD Red Target)

**파일**: `packages/api/src/__tests__/guard-workflow-integration.test.ts`

| 케이스 | 입력 | 기대 결과 |
|--------|------|----------|
| T1: confidential 차단 | sensitivityLabel="confidential" | blocked=true, violations 1건, audit 3 emits |
| T2: internal 통과 | sensitivityLabel="internal" | blocked=false, violations 0건 |
| T3: RuleEngine.loadRulesFromYaml | sample YAML string | rules 1건 로드 |
| T4: getActiveRules fallback | in-memory 없음 → D1 mock | D1 SELECT 호출 |

## §7 Stage 3 Exit 체크리스트

| # | 항목 | 확인 |
|---|------|------|
| D1 | 주입 사이트 전수: WorkflowHookService + RuleEngine 호출 위치 모두 §3 파일 매핑에 명시 | ✅ |
| D2 | 식별자 계약: checkId = 26자 ULID (F615 GuardEngine 생성, WorkflowHookService는 consumer) | ✅ |
| D3 | Breaking change: types.ts 갱신 — 기존 export에 추가만, 삭제 없음 | ✅ |
| D4 | TDD Red 파일 존재 | Step 4 Red Phase |
