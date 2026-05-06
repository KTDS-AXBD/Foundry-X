---
code: FX-PLAN-350
title: Sprint 350 — F627 llm + service-proxy infra 합류 → core/infra/
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 350
f_item: F627
req: FX-REQ-692
priority: P3
---

# Sprint 350 — F627 llm + service-proxy infra 합류

> SPEC.md §5 F627 row가 권위 소스. 본 plan은 실행 절차 + Phase Exit 체크리스트 정리용.

## §1 배경 + 사전 측정

F614(Sprint 349 PR #748 Match 100%) 직후 services/ 잔존 6 files 중 **횡단 인프라 2 files 묶음** 정밀 분석.

| 파일 | LOC | cross | callers | 도메인 |
|------|----:|------:|--------:|--------|
| `services/llm.ts` | 113 | 0 | 12 (5 도메인) | 횡단 util — 단일 owner 부재 |
| `services/service-proxy.ts` | 39 | 0 | 1 (routes/proxy.ts) | env만 import |

llm 12 callers 분포:
- modules/portal 2 (github + webhook)
- core/sr 2 (routes/sr + hybrid-sr-classifier)
- core/agent 2 (mcp-sampling + reviewer-agent)
- core/spec 1 (routes/spec)
- core/harness 1 (routes/mcp)
- tests 4

service-proxy 1 caller: routes/proxy.ts (`ServiceProxy` class만 사용)

`core/infra/` 현 구조 (F596 신설):
- sse-manager.ts + kv-cache.ts + event-bus.ts + types.ts (4 files, A2 평탄)

## §2 인터뷰 4회 패턴 (S336, 29회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | service-proxy + llm 2 files 묶음 | infra 명분 명확 + cross 0 + 묶음 위험 최소 |
| 2차 closure 범위 | X 2 files만 | routes/proxy.ts(68L)는 ServiceProxy path 갱신만, 다음 sprint deferred |
| 3차 옵션 | A2 평탄 (F596 cluster 일관성) | 기존 4 files와 동일 구조 |
| 4차 시동 | 즉시 (Sprint 350) | autopilot ~5분 추정 |

## §3 범위 (a~g)

### (a) 2 files git mv
```bash
git mv packages/api/src/services/llm.ts packages/api/src/core/infra/llm.ts
git mv packages/api/src/services/service-proxy.ts packages/api/src/core/infra/service-proxy.ts
```

### (b) core/infra/types.ts 갱신 (F609 패턴 + F596 types.ts 확장)
```typescript
// packages/api/src/core/infra/types.ts (기존 + 2 line 추가)
export { SSEManager } from "./sse-manager.js";
export { KVCacheService } from "./kv-cache.js";
export { EventBus } from "./event-bus.js";
export { LLMService } from "./llm.js";          // NEW
export { ServiceProxy } from "./service-proxy.js"; // NEW
```

### (c) 12 llm callers import path 갱신
| caller | 기존 → 신규 |
|--------|------------|
| `modules/portal/routes/github.ts` | `../../services/llm.js` → `../../core/infra/types.js` |
| `modules/portal/routes/webhook.ts` | 동일 패턴 |
| `core/sr/routes/sr.ts` | `../../../services/llm.js` → `../../infra/types.js` |
| `core/sr/services/hybrid-sr-classifier.ts` | 동일 패턴 |
| `core/agent/services/mcp-sampling.ts` | 동일 |
| `core/agent/services/reviewer-agent.ts` | 동일 |
| `core/spec/routes/spec.ts` | 동일 |
| `core/harness/routes/mcp.ts` | 동일 |
| 4 tests | `../services/llm.js` → `../core/infra/types.js` |

### (d) 1 service-proxy caller 갱신
- `routes/proxy.ts`: `../services/service-proxy.js` → `../core/infra/types.js`

### (e) dist orphan cleanup (S314 패턴 29회차)
```bash
rm -rf packages/api/dist/services/{llm,service-proxy}.{js,js.map,d.ts,d.ts.map}
```

### (f) packages/api typecheck + vitest GREEN
회귀 0 확증.

### (g) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | services/ 루트 llm + service-proxy 잔존 | `find packages/api/src/services -maxdepth 1 -name "llm.ts" -o -name "service-proxy.ts"` | 0+0 |
| P-b | core/infra/ files 카운트 | `find packages/api/src/core/infra -maxdepth 1 -name "*.ts" \| wc -l` | 6 (기존 4 + llm + service-proxy) |
| P-c | services/ 루트 .ts 카운트 | `find packages/api/src/services -maxdepth 1 -type f -name "*.ts" \| wc -l` | 4 (6-2) |
| P-d | 13 callers OLD path | `grep -rn 'services/llm\|services/service-proxy' packages/api/src --include="*.ts"` 중 OLD | 0 |
| P-e | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-f | dual_ai_reviews sprint 350 자동 INSERT | D1 query | ≥ 1건 (hook 25 sprint 연속, 누적 ≥ 36건) |
| P-g | F608~F613 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-h | F587~F596+F614 회귀 측정 11항 | grep + count | 모든 항목 회귀 0 |
| P-i | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-j | dist orphan = 0 | `find packages/api/dist/services -name "llm*" -o -name "service-proxy*"` | 0 |
| P-k | MSA cross-domain baseline=0 유지 | `bash scripts/lint-baseline-check.sh` | 0 (F609 types.ts re-export 패턴 적용) |
| P-l | API smoke | proxy mount 영향 0 | endpoint 살아있음 (internal infra 변경만) |

## §5 전제

- F614 ✅ (Sprint 349)
- F596 ✅ (Sprint 348, core/infra/ 신설)
- F608~F613 baseline=0 ✅
- C103+C104 ✅ (24 sprint 연속 정상)

## §6 예상 시간

- autopilot **~5분** (F596 cluster 패턴 재현 — types.ts 2 line + 13 callers + 평탄 구조)
- F593 최단 3분 42초 갱신 가능

## §7 다음 사이클 후보 (F627 후속)

- **routes/proxy.ts** 별 closure → core/infra/routes/ 또는 별 도메인 (proxy 통합 마무리)
- **conflict-detector** → core/spec/services/ (245L + 6 callers, 단일 spec 합류)
- **pr-pipeline** → core/agent/services/ (319L + 1 caller, agent 합류)
- **merge-queue** 도메인 결정 (381L + 3 callers, spec vs agent 모호)
- **pii-masker** → core/infra/ 또는 security 신설 (226L + 2 callers)
- Phase 47 GAP-3 27 stale proposals
- AI Foundry 작업 — **BeSir 게이트 무관, 내부 진행 가능 항목 추리기 (S336 사용자 지시)**
