---
id: FX-DESIGN-348
sprint: 348
feature: F596
req: FX-REQ-678
status: approved
date: 2026-05-06
---

# Sprint 348 Design — F596: infra closure — sse-manager + kv-cache + event-bus → core/infra/ 신설

## §1 목표

`services/` 루트 잔존 10개 파일 중 횡단 인프라 3개 파일(`sse-manager`, `kv-cache`, `event-bus`)을 `core/infra/` 도메인으로 이전. A2 평탄 구조 + F609 types.ts 패턴 적용.

## §2 구조 변경

### Before

```
packages/api/src/
  services/
    sse-manager.ts    (335 LOC)
    kv-cache.ts        (50 LOC)
    event-bus.ts       (35 LOC)
    [7 others]
```

### After

```
packages/api/src/
  core/
    infra/
      sse-manager.ts   (git mv)
      kv-cache.ts      (git mv)
      event-bus.ts     (git mv)
      types.ts         (신규 — re-export contract)
  services/
    [7 others]        (10 → 7개)
```

## §3 신규 파일

### `packages/api/src/core/infra/types.ts`

```typescript
export { SSEManager } from "./sse-manager.js";
export { KVCacheService } from "./kv-cache.js";
export { EventBus } from "./event-bus.js";
```

## §4 Caller 분류 (실측)

### SSE-Manager (14 callers)

| 파일 | 현재 import | 변경 방식 | 새 import |
|------|------------|----------|----------|
| `core/agent/services/mcp-resources.ts:9` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/agent/services/agent-inbox.ts:2` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/agent/services/agent-orchestrator.ts:7` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/work/services/work.service.ts:2` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/routes/harness.ts:4` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/routes/mcp.ts:23` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/harness-rules.ts:7` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/auto-fix.ts:7` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/auto-rebase.ts:3` | `../../../services/sse-manager.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `modules/portal/services/reconciliation.ts:2` | `../../../services/sse-manager.js` | grandfathered (direct) | `../../../core/infra/sse-manager.js` |
| `modules/portal/routes/webhook.ts:11` | `../../../services/sse-manager.js` | grandfathered (direct) | `../../../core/infra/sse-manager.js` |
| `__tests__/sse-manager-push.test.ts:2` | `../services/sse-manager.js` | test (direct) | `../core/infra/sse-manager.js` |
| `__tests__/services/sse-manager.test.ts:3` | `../../services/sse-manager.js` | test (direct) | `../../core/infra/sse-manager.js` |
| `__tests__/mcp-routes-resources.test.ts:37` | `../services/sse-manager.js` (vi.mock) | test (direct) | `../core/infra/sse-manager.js` |

### KV-Cache (12 callers)

| 파일 | 현재 import | 변경 방식 | 새 import |
|------|------------|----------|----------|
| `core/spec/routes/spec.ts:15` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/routes/freshness.ts:6` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/routes/integrity.ts:6` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/routes/health.ts:7` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/health-calc.ts:3` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/integrity-checker.ts:3` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/freshness-checker.ts:3` | `../../../services/kv-cache.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `routes/requirements.ts:13` | `../services/kv-cache.js` | root (scope 외, direct) | `../core/infra/kv-cache.js` |
| `__tests__/services/health-calc.test.ts:4` | `../../services/kv-cache.js` | test (direct) | `../../core/infra/kv-cache.js` |
| `__tests__/services/freshness-checker.test.ts:4` | `../../services/kv-cache.js` | test (direct) | `../../core/infra/kv-cache.js` |
| `__tests__/services/kv-cache.test.ts:2` | `../../services/kv-cache.js` | test (direct) | `../../core/infra/kv-cache.js` |
| `__tests__/services/integrity-checker.test.ts:4` | `../../services/kv-cache.js` | test (direct) | `../../core/infra/kv-cache.js` |

### Event-Bus (6 callers)

| 파일 | 현재 import | 변경 방식 | 새 import |
|------|------------|----------|----------|
| `core/discovery/routes/discovery-shape-pipeline.ts:7` | `../../../services/event-bus.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/discovery/services/discovery-shape-pipeline-service.ts:10` | `../../../services/event-bus.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `core/harness/services/transition-trigger.ts:10` | `../../../services/event-bus.js` | types.ts 경유 | `../../../core/infra/types.js` |
| `__tests__/event-bus.test.ts:4` | `../services/event-bus.js` | test (direct) | `../core/infra/event-bus.js` |
| `__tests__/discovery-shape-pipeline.test.ts:6` | `../services/event-bus.js` | test (direct) | `../core/infra/event-bus.js` |
| `__tests__/transition-trigger.test.ts:5` | `../services/event-bus.js` | test (direct) | `../core/infra/event-bus.js` |

### 합계

| 방식 | 카운트 |
|------|--------|
| cross-domain → types.ts | **19건** (sse 9 + kv 7 + bus 3) |
| test → direct path | **10건** (sse 3 + kv 4 + bus 3) |
| grandfathered → direct path | **2건** (modules/portal) |
| root → direct path | **1건** (routes/requirements.ts) |
| **총계** | **32건** |

## §5 파일 매핑

| 작업 | 파일 | 변경 내용 |
|------|------|----------|
| **신규 생성** | `packages/api/src/core/infra/types.ts` | re-export 3개 클래스 |
| **git mv** | `services/sse-manager.ts` → `core/infra/sse-manager.ts` | 파일 이동 |
| **git mv** | `services/kv-cache.ts` → `core/infra/kv-cache.ts` | 파일 이동 |
| **git mv** | `services/event-bus.ts` → `core/infra/event-bus.ts` | 파일 이동 |
| **수정 (cross-domain→types)** | `core/agent/services/mcp-resources.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/agent/services/agent-inbox.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/agent/services/agent-orchestrator.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/work/services/work.service.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/routes/harness.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/routes/mcp.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/harness-rules.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/auto-fix.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/auto-rebase.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/spec/routes/spec.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/routes/freshness.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/routes/integrity.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/routes/health.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/health-calc.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/integrity-checker.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/freshness-checker.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/discovery/routes/discovery-shape-pipeline.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/discovery/services/discovery-shape-pipeline-service.ts` | import 교체 |
| **수정 (cross-domain→types)** | `core/harness/services/transition-trigger.ts` | import 교체 |
| **수정 (grandfathered)** | `modules/portal/services/reconciliation.ts` | depth 갱신 |
| **수정 (grandfathered)** | `modules/portal/routes/webhook.ts` | depth 갱신 |
| **수정 (root)** | `routes/requirements.ts` | depth 갱신 |
| **수정 (test)** | `__tests__/sse-manager-push.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/services/sse-manager.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/mcp-routes-resources.test.ts` | vi.mock path 갱신 |
| **수정 (test)** | `__tests__/services/health-calc.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/services/freshness-checker.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/services/kv-cache.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/services/integrity-checker.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/event-bus.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/discovery-shape-pipeline.test.ts` | path 갱신 |
| **수정 (test)** | `__tests__/transition-trigger.test.ts` | path 갱신 |
| **삭제 (orphan)** | `dist/services/sse-manager.*` ~4 files | dist orphan cleanup |
| **삭제 (orphan)** | `dist/services/kv-cache.*` ~4 files | dist orphan cleanup |
| **삭제 (orphan)** | `dist/services/event-bus.*` ~4 files | dist orphan cleanup |

## §6 Phase Exit P-a~P-l

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| P-a | `services/` 루트 sse-manager/kv-cache/event-bus | grep 0건 |
| P-b | `core/infra/` files | ls 카운트 = 4 |
| P-c | `services/` 루트 .ts | wc -l = 7 |
| P-d | cross-domain OLD services/ import | grep 0건 |
| P-e | typecheck + tests | exit 0 |
| P-f | dual_ai_reviews sprint 348 INSERT | ≥ 1건 |
| P-g | F608~F613 회귀 baseline | 0 |
| P-h | F587~F595 회귀 | 각 grep 카운트 일치 |
| P-i | Match Rate | ≥ 90% |
| P-j | dist orphan | 0 |
| P-k | MSA cross-domain baseline | 0 유지 |
| P-l | API /api/health | 200 OK (workers 영향 없음) |
