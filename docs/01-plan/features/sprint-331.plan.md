---
id: FX-PLAN-331
sprint: 331
feature: F584
req: FX-REQ-651
status: approved
date: 2026-05-04
---

# Sprint 331 Plan — F584: services/model-router 자질구레 cleanup (P2)

## 목표

**F583 후속 (Sprint 330, PR #713 Match 98% semantic 100%).** Phase 46 **진정 100% literal 종결** 후 잔존하는 `packages/api/src/services/model-router.ts` 1 file을 `core/agent/services/`로 이동하여 services/ 루트 정리한다. F583(Sprint 330)에서 services/agent 디렉토리는 완전 삭제(0 도달)됐으나 services/ 루트의 `model-router.ts`는 별건으로 잔존 — 본 sprint에서 해소.

**핵심 원칙**: F579/F581/F583에서 14회차 정착화된 autopilot 패턴(`core/agent/services/`로 이동) + MSA `core/{domain}/` 룰 부분 복원. fx-agent 측 동명 파일과 DIFF=NONE 확증(except execution-types import path 1줄)이라 단순 path 치환만으로 종결 가능. 4 callers 모두 monorepo 내부라 cross-package 부담 0.

**OBSERVED 강제 8항** — 표면 충족 함정 16회차 회피.

## 사전 측정 (S322, 2026-05-04)

### 양측 model-router 비교

| 위치 | LOC | DIFF | deps |
|------|-----|------|------|
| `packages/api/src/services/model-router.ts` | 158 | (baseline) | `../core/agent/services/execution-types` + `@foundry-x/shared` |
| `packages/fx-agent/src/services/model-router.ts` | 158 | **NONE** except 1줄 | `./execution-types` + `@foundry-x/shared` |

차이점: execution-types import path만 1줄 차이. 핵심 로직 100% 동일.

### main-api 측 callers (4건, 모두 `core/{domain}/`)

| 도메인 | 파일 | import 경로 |
|-------|------|-----------|
| shaping | `core/shaping/services/bmc-agent.ts` | `../../../services/model-router.js` |
| shaping | `core/shaping/services/bmc-insight-service.ts` | `../../../services/model-router.js` |
| agent | `core/agent/services/agent-runner.ts` | `../../../services/model-router.js` |
| collection | `core/collection/services/insight-agent-service.ts` | `../../../services/model-router.js` |

### model-router 자체 deps

```ts
import type { AgentTaskType, AgentRunnerType } from "../core/agent/services/execution-types.js";
import { OR_MODEL_SONNET, OR_MODEL_HAIKU } from "@foundry-x/shared";
```

## 인터뷰 결정 (S322, 2026-05-04)

**옵션 A 채택**: `git mv api/services/model-router.ts → api/core/agent/services/model-router.ts` + 4 callers import path 갱신. 이유:

1. F579/F581/F583 패턴 14회차 정착화 (autopilot 자동 채택)
2. MSA `core/{domain}/` 룰 부분 복원 (services/ 루트 사용 회피)
3. DIFF=NONE이라 path 치환만, ~15분 autopilot 예상
4. 옵션 B(fx-agent SSOT)는 cross-package import 정책 risk + monorepo 컨벤션 미정 → 별건

옵션 C(병존 유지) 미채택: model-router는 가장 deps 적은 고아 파일이라 cleanup 적기.

## 범위

### (a) git mv

```bash
git mv packages/api/src/services/model-router.ts packages/api/src/core/agent/services/model-router.ts
```

### (b) 4 callers import path 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `core/shaping/services/bmc-agent.ts` | `../../../services/model-router.js` | `../../agent/services/model-router.js` |
| `core/shaping/services/bmc-insight-service.ts` | `../../../services/model-router.js` | `../../agent/services/model-router.js` |
| `core/agent/services/agent-runner.ts` | `../../../services/model-router.js` | `./model-router.js` |
| `core/collection/services/insight-agent-service.ts` | `../../../services/model-router.js` | `../../agent/services/model-router.js` |

### (c) model-router 자체 내부 path 갱신

```ts
// 변경 전
import type { AgentTaskType, AgentRunnerType } from "../core/agent/services/execution-types.js";

// 변경 후 (같은 디렉토리로 이동했으므로)
import type { AgentTaskType, AgentRunnerType } from "./execution-types.js";
```

### (d) typecheck + lint + tests 회귀 GREEN

- packages/api typecheck PASS
- packages/api lint PASS
- packages/api vitest GREEN (전체 또는 변경 파일 관련)
- packages/fx-agent typecheck PASS (변경 없으므로 회귀만 확인)
- packages/fx-agent vitest GREEN

## §3 Phase Exit OBSERVED — Smoke Reality 8항

표면 충족 함정 회피용 numerical 강제. 모든 항목은 PR merge 직전·직후 실측해야 한다.

| # | 검증 항목 | 명령 / 측정 | 기대값 |
|---|---------|----------|------|
| **P-a** | services/ 루트 model-router 사라짐 | `find packages/api/src/services -maxdepth 1 -name "model-router*" \| wc -l` | **0** |
| **P-b** | core/agent/services/로 이동 | `find packages/api/src/core/agent/services -name "model-router*" \| wc -l` | **1** |
| **P-c** | 외부 callers 잔존 import 0건 | `grep -rn "from.*\\.\\.\\./services/model-router" packages/api/src \| wc -l` | **0** (모두 `core/agent/services/` 또는 `./model-router` 경유) |
| **P-d** | typecheck + test GREEN | `cd packages/api && pnpm typecheck && pnpm test` + `cd packages/fx-agent && pnpm typecheck && pnpm test` | exit 0 |
| **P-e** | dual_ai_reviews sprint 331 자동 INSERT | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=331"` | **≥ 1** (누적 ≥ 15건) |
| **P-f** | F560 회귀 0건 (fx-discovery 일관) | `curl -i https://foundry-x-api.ktds-axbd.workers.dev/api/discovery-stages/health` | 401 (auth 미인증) |
| **P-g** | F582 회귀 0건 (DiagnosticCollector grep) | `grep -rn "diagnosticCollector" packages/fx-discovery/src \| wc -l` | **≥ 21** |
| **P-h** | autopilot Match Rate | autopilot 자체 평가 | **≥ 90%** |

### 회귀 회피 항목

- **F583 회귀 점검**: `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l = 0` 유지 (Phase 46 100% literal 종결 회귀 차단)
- **agent_run_metrics 회귀 0건**: F582 인프라 가동 유지 (별건 검증)

### 표면 충족 함정 회피 핵심 조항

- **P-a + P-b 동시 충족**: services/에서 사라지고 core/agent/services/에 정확히 1개 존재 (단순 git rm 함정 차단)
- **P-c numerical 강제**: 외부 callers 잔존 import 0건 — 4 callers 모두 갱신 (path 치환 누락 함정 차단)
- **P-e dual_ai_reviews**: hook 인프라 회귀 차단 (C103+C104 재발 검증)

## 전제 조건

- F583 ✅ (Sprint 330, PR #713 Match 98%, services/agent 0 도달)
- C103 ✅ (silent fail layer 1~3 종결)
- C104 ✅ (silent fail layer 4 종결, .dev.vars 자동 cp)
- save-dual-review hook 자동 trigger ✅ (sprint 327~330 4 sprint 연속 검증됨)

## 예상 시간

- autopilot 가동: **~15분** (F579 12분 32초 ~ F581 14분 21초 패턴 = 단순 path 치환만)
- Master 가동 + 인터뷰 + Plan 작성: ~20분
- OBSERVED 검증: ~5분
- **총 ~40분** (S320 F581 sprint와 유사)

## Risk

- **Low**: DIFF=NONE이라 핵심 로직 변경 없음. tests 회귀만 확인.
- **autopilot 옵션 B 채택 risk**: autopilot이 fx-agent SSOT 옵션을 자동 선택할 수 있음 → 그 경우 cross-package import 정책 risk → P-b가 fx-agent 측에서 ≥ 1로 충족되지만 main-api 측 0건이 됨. semantic acceptable variant로 처리 가능.

## 다음 사이클 후보

본 sprint 완결 후:

- **F585 (or backlog)**: services/ 루트의 다른 잔존 파일 점검 (`find packages/api/src/services -maxdepth 1 -type f -name "*.ts"` 결과 정리)
- **Phase 47 GAP-2** (P2 C-track): output_tokens=0 진단
- **Phase 47 GAP-3** (P2 F-track): 27 stale proposals 검토 루프
- **모델 A/B 비교** (P3): Opus 4.7 vs Sonnet 4.6 (autopilot 모델 선택)
- **AI Foundry W18 활동** (별도 PRD 트랙): 시간 민감도 高, 5/15(금) 회의 D-day
