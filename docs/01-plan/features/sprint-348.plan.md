---
id: FX-PLAN-348
sprint: 348
feature: F596
req: FX-REQ-678
status: approved
date: 2026-05-06
depends_on: F608/F609/F610/F611/F612/F613 (Pass 시리즈 6연속 MERGED, baseline=0)
---

# Sprint 348 Plan — F596: infra closure — sse-manager + kv-cache + event-bus → core/infra/ 신설

## 목표

**Pass 시리즈 6연속 MERGED 종결 직후, services/ 루트 잔존 10 files 중 횡단 인프라 3 files를 신규 도메인 `core/infra/`로 통합 이전.** 옵션 A 19회차 정착 + closure 시리즈 연속 패턴.

**핵심 원칙**:
- A2 평탄 구조 채택 (사용자 결정 S334) — `core/infra/{sse-manager,kv-cache,event-bus}.ts` + `core/infra/types.ts` (services/ 폴더 없음)
- F609 패턴 재현 — cross-domain caller 19건은 `core/infra/types.ts` 경유 import (baseline=0 유지)
- 명백한 multi-domain infra 명분 (sse-manager 4 도메인 사용 / kv-cache 2 도메인 / event-bus 2 도메인)

## 사전 측정 (S334, 2026-05-06)

### 3 files 메트릭

| 파일 | LOC | 역할 |
|------|-----|------|
| `services/sse-manager.ts` | 335 | SSEManager class — 실시간 이벤트 push/multiplex |
| `services/kv-cache.ts` | 50 | KVCacheService — Cloudflare KV 캐시 wrapper |
| `services/event-bus.ts` | 35 | EventBus — 단순 pub/sub queue |
| **합계** | **420 LOC** | |

### Caller 분포 (impl 제외)

#### sse-manager — 13 callers

| 위치 | 카운트 | 처리 방식 |
|------|--------|----------|
| `core/work/services/work.service.ts` | 1 | cross-domain → types.ts |
| `core/agent/services/{mcp-resources, agent-orchestrator, agent-inbox}.ts` | 3 | cross-domain → types.ts |
| `core/harness/services/{harness-rules, auto-fix, auto-rebase}.ts` | 3 | cross-domain → types.ts |
| `core/harness/routes/{harness, mcp}.ts` | 2 | cross-domain → types.ts |
| `modules/portal/{services/reconciliation, routes/webhook}.ts` | 2 | grandfathered → 직접 path depth 갱신 |
| `__tests__/sse-manager-push.test.ts` + `__tests__/services/sse-manager.test.ts` | 2 | tests → 직접 path depth 갱신 |

#### kv-cache — 12 callers

| 위치 | 카운트 | 처리 방식 |
|------|--------|----------|
| `core/spec/routes/spec.ts` | 1 | cross-domain → types.ts |
| `core/harness/{services/health-calc, routes/integrity, services/integrity-checker, routes/freshness, services/freshness-checker, routes/health}.ts` | 6 | cross-domain → types.ts |
| `routes/requirements.ts` (root) | 1 | scope 외 → 직접 path depth 갱신만 |
| `__tests__/services/{health-calc, integrity-checker, freshness-checker, kv-cache}.test.ts` | 4 | tests → 직접 path depth 갱신 |

#### event-bus — 6 callers

| 위치 | 카운트 | 처리 방식 |
|------|--------|----------|
| `core/discovery/{routes/discovery-shape-pipeline, services/discovery-shape-pipeline-service}.ts` | 2 | cross-domain → types.ts |
| `core/harness/services/transition-trigger.ts` | 1 | cross-domain → types.ts |
| `__tests__/{transition-trigger, discovery-shape-pipeline, event-bus}.test.ts` | 3 | tests → 직접 path depth 갱신 |

### 요약

- **Cross-domain callers (types.ts 경유)**: 9 + 7 + 3 = **19건**
- **Tests (직접 path depth 갱신)**: 2 + 4 + 3 = **9건**
- **Grandfathered/root (직접 path depth 갱신)**: 2 + 1 = **3건**
- **합계 callers 갱신**: **31건**

## 인터뷰 패턴 (S334, 27회차)

| # | 질문 | 답변 |
|---|------|------|
| 1 | 다음 사이클 메인 작업 | F596 infra closure (Recommended) |
| 2 | 이전 전략 | core/infra/ 신설 (옵션 A) — multi-domain infra 명분 |
| 3 | routes/requirements.ts (root) | F596 scope 외 — import path 갱신만 |
| 4 | modules/portal grandfathered | depth 갱신만 (MSA 룰 grandfathered 유지) |
| 5 | A2 세부 구현 | 평탄 구조 — `core/infra/{sse,kv,bus}.ts` + `types.ts` |

## 범위

### (a) `core/infra/` 디렉토리 신설 + 평탄 구조

```
packages/api/src/core/infra/
├── sse-manager.ts       # 335 LOC (services/sse-manager.ts → mv)
├── kv-cache.ts          # 50 LOC (services/kv-cache.ts → mv)
├── event-bus.ts         # 35 LOC (services/event-bus.ts → mv)
└── types.ts             # 신규 — class re-export (F609 패턴)
```

`types.ts` 내용:

```typescript
// core/infra/types.ts — Public contract for cross-domain callers
export { SSEManager } from "./sse-manager.js";
export { KVCacheService } from "./kv-cache.js";
export { EventBus } from "./event-bus.js";
```

### (b) 3 files git mv

```bash
git mv packages/api/src/services/sse-manager.ts packages/api/src/core/infra/sse-manager.ts
git mv packages/api/src/services/kv-cache.ts   packages/api/src/core/infra/kv-cache.ts
git mv packages/api/src/services/event-bus.ts  packages/api/src/core/infra/event-bus.ts
```

### (c) Cross-domain callers 19건 → `core/infra/types` import (F609 패턴)

`from "../../../services/sse-manager.js"` → `from "../../../core/infra/types.js"` 같은 패턴. 단 `core/{domain}/...` 안의 파일이라 depth는 `../../../core/infra/types.js`. (전부 동일 depth)

### (d) Grandfathered 2건 (modules/portal) — 직접 path depth 갱신

- `modules/portal/services/reconciliation.ts:2`: `from "../../../services/sse-manager.js"` → `from "../../../core/infra/sse-manager.js"`
- `modules/portal/routes/webhook.ts:11`: 동일 패턴

(grandfathered 유지 = baseline에 추가 안 함, MSA 룰 lint 시 modules/portal은 별도 처리)

### (e) Tests 9건 — 직접 path depth 갱신

- `__tests__/sse-manager-push.test.ts:2`: `from "../services/sse-manager.js"` → `from "../core/infra/sse-manager.js"`
- `__tests__/services/sse-manager.test.ts:3`: `from "../../services/sse-manager.js"` → `from "../../core/infra/sse-manager.js"`
- `__tests__/event-bus.test.ts:4`: 동일 패턴 (event-bus)
- `__tests__/transition-trigger.test.ts:5`: 동일 패턴 (event-bus)
- `__tests__/discovery-shape-pipeline.test.ts:6`: 동일 패턴 (event-bus)
- `__tests__/services/{health-calc, integrity-checker, freshness-checker, kv-cache}.test.ts`: 동일 패턴 (kv-cache)

### (f) Root caller (routes/requirements.ts) — 직접 path depth 갱신

`routes/requirements.ts:13`: `from "../services/kv-cache.js"` → `from "../core/infra/kv-cache.js"` (root scope 외, depth만)

### (g) dist orphan cleanup

```bash
rm -rf packages/api/dist/services/{sse-manager,kv-cache,event-bus}.{js,js.map,d.ts,d.ts.map}
```
(~12 files, S314 패턴 27회차)

### (h) typecheck + tests GREEN

`pnpm --filter @foundry-x/api typecheck && pnpm --filter @foundry-x/api test`

### (i) baseline check

`.eslint-baseline.json` 0 유지 — F609 패턴 적용으로 cross-domain 19건 모두 types.ts 경유.

## Phase Exit P-a~P-l Smoke Reality 12항

| # | 검증 항목 | 합격 기준 |
|---|----------|----------|
| P-a | `services/` 루트 sse-manager / kv-cache / event-bus = 0 | grep 0건 |
| P-b | `core/infra/` files = 4 (sse-manager + kv-cache + event-bus + types) | ls 카운트 = 4 |
| P-c | `services/` 루트 .ts = 7 (10-3) | ls *.ts wc -l = 7 |
| P-d | Cross-domain 19 callers OLD `services/` import = 0 | grep 0건 |
| P-e | typecheck + tests GREEN | exit 0 |
| P-f | dual_ai_reviews sprint 348 자동 INSERT ≥ 1건 (hook 23 sprint 연속) | D1 query INSERT row 존재 |
| P-g | F608~F613 회귀 0건 (baseline 0 유지) | `.eslint-baseline.json` 카운트 = 0 |
| P-h | F587/F588/F589/F590/F591/F592/F593/F594/F595 회귀 0건 9항 | 각 grep 카운트 일치 |
| P-i | Match ≥ 90% (semantic 100% 목표) | autopilot self-eval |
| P-j | dist orphan = 0 (cleanup 적용) | find packages/api/dist/services -name "{sse-manager,kv-cache,event-bus}*" = 0 |
| P-k | MSA cross-domain baseline = 0 (Pass 종결 후 깨끗 유지) | `bash scripts/lint-baseline-check.sh` exit 0 |
| P-l | API smoke (workers 영향 없음 — internal infra라 endpoint 추가/제거 0) | `/api/health` 200 OK |

## 전제

- F608~F613 ✅ Pass 시리즈 baseline=0 유지
- F594 ✅ spec 도메인 신설 (closure 패턴 18회차)
- F595 ✅ sr 도메인 신설 (closure 패턴 17회차 + F593 entity 재현)
- C103+C104 ✅ (22 sprint 연속 hook 정상 / dual_ai_reviews 누적 33건)

## Out-of-scope

- `routes/requirements.ts` 도메인 이동 (root scope 외 별 F-item)
- modules/portal 2 callers grandfathered cleanup (별 F-item)
- llm.ts 도메인 결정 (별 F-item, services/ 잔존 7 files 중 1)
- Phase 47 GAP-3 27 stale proposals (별 F-item)
- AI Foundry W19 BeSir 미팅 사전 준비 (사용자 직접 PM)

## 예상 시간

**~5~10분 autopilot** (사전 측정 정확화 + 평탄 구조 + types.ts 1 신규 + 31 callers 일괄 변경, F593 최단 3분 42초 갱신 가능성).

## 다음 사이클 후보

- F614+ 도메인 owner contract 정제 (F609 types.ts re-export trade-off 후속)
- F596 infra closure 후 services/ 잔존 7 files (llm.ts 등) 추가 정리
- AI Foundry W19 BeSir 미팅 사전 준비 (5/15 D-9)
- Phase 47 GAP-3 27 stale proposals 검토
