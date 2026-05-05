---
id: FX-PLAN-343
sprint: 343
feature: F609
req: FX-REQ-673
status: approved
date: 2026-05-05
depends_on: F608 (Sprint 342, baseline JSON 존재 필수)
---

# Sprint 343 Plan — F609: types.ts 12 도메인 신설 + single-domain 44 fix (Pass 2)

## 목표

**F608 (Sprint 342, baseline 161건 차단막) MERGED 후속.** 룰 정의가 `core/{domain}/types.ts` re-export만 cross-domain 통과 허용 → 12 도메인 중 11 도메인 types.ts 부재가 fix 차단막 (silent fail layer 2). 본 sprint에서 7 도메인 types.ts 신설 (외부 caller 존재) + 5 도메인 future-proof types.ts 빈 파일 + 44 single-domain caller import path 일괄 갱신.

**핵심 원칙**:
- **단순 re-export 자동화**: 도메인 owner의 contract 정제 작업은 후속 sprint (F614+) 별 PR로. 본 sprint는 baseline 감소 우선
- **multi-domain 9건 deferred**: biz-items.ts 19 + 기타 8 = F610 단일 파일 리팩터링 별 sprint
- **baseline 161 → ~77 목표**: 84 violations fix (44 callers × 평균 1.9 viol/file)

## 사전 측정 (S332, 2026-05-05 오후 KST — 본 세션)

### Target 도메인별 callers + import symbol

| Target | callers | violations | 우선순위 | 비고 |
|--------|---------|-----------|---------|------|
| **agent/types.ts** | **22** | **50** | P0 | 가장 큰 hub, harness/discovery/offering/shaping/collection 모두 의존 |
| **harness/types.ts** | 7 | 9 | P1 | agent 도메인이 가장 많이 import |
| **discovery/types.ts** | 5 | 10 | P1 | offering/agent/harness 의존 |
| **shaping/types.ts** | 5 | 7 | P1 | collection/discovery/harness 의존 |
| **offering/types.ts** | 2 | 4 | P2 | discovery 의존 |
| **collection/types.ts** | 2 | 3 | P2 | discovery/shaping 의존 |
| **spec/types.ts** | 1 | 1 | P2 | harness/health-calc만 |
| **합계** | **44** | **84** | | 모두 single-domain (multi-domain은 F610) |

### Future-proof 도메인 (외부 caller 0, 빈 types.ts 신설 권장)

`decode-bridge` / `events` / `files` / `sr` / `entity` / `work` — 빈 placeholder만 (`// future contract exports`). 일관성 + 룰 자동 통과 + 후속 sprint contract 추가 시 path 변경 불필요.

### 위반 fix 패턴 (자동화)

**Before**:
```typescript
// core/discovery/services/agent-collector.ts (위반)
import { runAgent } from "../../agent/services/agent-runner";
import type { AgentConfig } from "../../agent/services/agent-types";
```

**After**:
```typescript
// core/discovery/services/agent-collector.ts (통과)
import { runAgent, type AgentConfig } from "../../agent/types";
```

**core/agent/types.ts** (신설):
```typescript
// F609: cross-domain contract re-exports
export { runAgent } from "./services/agent-runner";
export type { AgentConfig } from "./services/agent-types";
// ... (외부 caller가 import하던 모든 symbol)
```

자동화 도구: 각 단일-domain caller에서 imported symbol 추출 → 해당 target 도메인 types.ts에 re-export 추가 → caller import path 일괄 변경.

## 인터뷰 패턴 (S332, 28회차)

| # | 질문 | 사용자 답변 |
|---|------|-------------|
| 1 | F609 자동화 fix 전략 | 옵션 A 완전 자동화 (12 types.ts re-export) |

이전 sprint들 (F608 등록 시) 인터뷰 7회 + 본 인터뷰 1회 = 28회차. closure 통합 패턴이 안정 정착화되어 인터뷰 단순화 추세.

## 범위

### (a) 12 도메인 types.ts 신설 (또는 갱신)

| 도메인 | 신설 | callers re-export 대상 |
|--------|------|------------------------|
| `core/agent/types.ts` | NEW | 22 callers / 50 viol → 외부 caller가 import하던 symbol 전수 추출 후 re-export |
| `core/harness/types.ts` | NEW | 7 callers / 9 viol |
| `core/discovery/types.ts` | NEW | 5 callers / 10 viol |
| `core/shaping/types.ts` | NEW | 5 callers / 7 viol |
| `core/offering/types.ts` | NEW | 2 callers / 4 viol |
| `core/collection/types.ts` | NEW | 2 callers / 3 viol |
| `core/spec/types.ts` | NEW | 1 caller / 1 viol |
| `core/verification/types.ts` | EXISTS | 변경 없음 (이미 contract) |
| `core/decode-bridge/types.ts` | NEW | 빈 placeholder |
| `core/events/types.ts` | NEW | 빈 placeholder |
| `core/files/types.ts` | NEW | 빈 placeholder |
| `core/sr/types.ts` | NEW | 빈 placeholder |
| `core/entity/types.ts` | NEW | 빈 placeholder |
| `core/work/types.ts` | NEW | 빈 placeholder |

### (b) 44 caller import path 일괄 갱신

각 caller 파일에서 cross-domain import 라인을 `from "../{target}/types"` 또는 `from "../../{target}/types"`로 일괄 변경 (depth는 caller 위치에 따라 자동 계산).

### (c) baseline 갱신

`packages/api/.eslint-baseline.json` regenerate:
- F608 baseline: 161 fingerprints
- F609 baseline: ~77 fingerprints (84 fix)
- 잔존: multi-domain 9 파일 (~45 viol) + cross-domain-d1 31 + no-direct-route-register 1 = ~77

### (d) F608 baseline JSON 갱신 패턴 검증

`scripts/lint-baseline-update.sh` 실행 — F608 sprint에서 신설된 baseline regenerate script 활용. 본 sprint가 baseline 갱신 작업 흐름의 첫 적용 사례.

### (e) typecheck + tests GREEN

re-export 패턴이 export 누락 시 typecheck fail. 모든 caller가 사용하는 symbol을 types.ts에 정확히 노출했는지 검증.

## TDD Red→Green

### Red Phase
- `__tests__/types-contract.test.ts` 신규 (도메인별 1 케이스)
  - 케이스 1: agent/types.ts re-export 22 callers의 symbol 모두 노출 확인
  - 케이스 2: caller에서 직접 services/* import 0건 (grep)
- baseline check가 F609 fix 후 ~77 fingerprints만 남았는지 확인

### Green Phase
- types.ts 12개 신설
- caller path 변경
- baseline JSON 갱신

## Phase Exit P-a~P-i Smoke Reality 9항

| # | 항목 | 측정 | 목표 |
|---|------|------|------|
| P-a | 12 `core/{domain}/types.ts` 존재 | `find core -name types.ts` count | **14** (verification 1 + 13 신설) |
| P-b | 44 외부 caller import path NEW 패턴 | `grep -E "from.*core/[^/]+/(services|routes)"` count | **0** (모두 types.ts 경유) |
| P-c | baseline fingerprints | `.eslint-baseline.json` length | **~77** (161-84) |
| P-d | baseline check regression | `lint:msa-baseline` 실행 | exit 0 (신규 0건) |
| P-e | typecheck + tests | CI green | 회귀 0건 |
| P-f | dual_ai_reviews sprint 343 | D1 INSERT count | ≥1건 (누적 31→32+, hook 18 sprint 연속) |
| P-g | F560 / F582 회귀 | grep 일관 | 0 |
| P-h | 잔존 위반 분포 검증 | rule별 count | multi-domain ~45 + d1 31 + direct-route 1 = 77 |
| P-i | Match | autopilot self-eval | **≥ 90%** (semantic 100% 목표) |

**전제**: F608 ✅ MERGED (baseline JSON 존재), C103+C104 ✅ (16 sprint 연속 정상)

## 위험 + 완화

| 위험 | 완화 |
|------|------|
| caller imported symbol 누락 → typecheck fail | autopilot가 caller 별 imported list 정확 추출. P-e CI green 검증 |
| types.ts re-export 충돌 (동일 symbol을 여러 domain에서 export) | 도메인 owner 명시적 — agent의 symbol은 agent/types.ts만 export. 충돌 가능성 낮음 |
| F608 baseline JSON 미존재 시작 | F608 MERGED 후 가동 (이 plan의 depends_on 명시) |
| multi-domain 9 파일이 partial fix되면 baseline 카운트 어긋남 | autopilot가 single-domain 44만 정확히 fix. multi-domain은 import 변경 0 |
| 빈 placeholder types.ts (5개)에 lint 경고 | `// @ts-ignore` 또는 dummy export 또는 `// eslint-disable-next-line` 추가. autopilot 판단 |

## 다음 사이클 후보 (Pass 3+)

- **F610 (Pass 3)** — `core/discovery/routes/biz-items.ts` 19건 단일 파일 리팩터링 — types.ts contract 정제 + multi-domain 분해 (~45분 수동 多)
- **F611 (Pass 4)** — multi-domain 9 파일 (biz-items 외 8) cross-domain-import fix
- **F612 (Pass 5)** — cross-domain-d1 31 warnings → service API 신설 (agent_sessions / agent_messages / agent_feedback / discovery_pipeline_runs / offering_prototypes 등) ~60분
- **F613** — no-direct-route-register 1 (`src/app.ts:129` `/api/docs`) sub-app 분리 (~15분)
- **F614+ (선택)** — types.ts contract 정제 (단순 re-export → 의도적 contract 설계)
- 무관 트랙: F596 infra cluster / llm.ts 도메인 결정 / Phase 47 GAP-3 / 모델 A/B / fx-discovery 404 / **AI Foundry W19 BeSir 미팅 5/15 D-day**
