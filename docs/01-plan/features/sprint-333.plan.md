---
id: FX-PLAN-333
sprint: 333
feature: F587
req: FX-REQ-654
status: approved
date: 2026-05-04
---

# Sprint 333 Plan — F587: services/ 루트 dead code 2 git rm + 도메인 이동 2 (P2)

## 목표

**F584(Sprint 331, ~7분 8초)/F585(Sprint 332, ~17분 40초) 후속.** services/ 루트 33 files에서 logger 도메인 분리 인터뷰 진행 중 사전 측정에서 발견된 **dead code 2 + 도메인 분산 2 패턴** 해소. logger.ts/telemetry-collector.ts는 api 내부 callers 0건 dead code(F578 패턴), monitoring.ts/traceability.service.ts는 각각 harness/work 도메인 단일 caller라 자연스러운 도메인 이동 후보.

**핵심 원칙**: F578 dead code deletion + F584/F585 옵션 A 도메인 이동 패턴 결합. 표면 충족 함정 18회차 회피용 P-a~P-i 9항 numerical 강제.

**부수 효과**: `core/work/` 도메인 신설(traceability.service가 첫 파일). routes/work.ts와 services/work.service.ts/work-kg.service.ts는 별건 후속 sprint(work 도메인 MSA 분리 트랙).

## 사전 측정 (S324, 2026-05-04)

### 4 files 분류

| 파일 | LOC | api/src 내부 callers | 외부(타 패키지) callers | DIFF (fx-agent) | 분류 |
|------|-----|------|------|------|------|
| `services/logger.ts` | 47 | **0** | 0 (CLI는 `cli/src/services/logger.ts` 별도 파일 사용) | N/A (fx-agent에 동명 파일 없음) | **DEAD** |
| `services/telemetry-collector.ts` | 96 | **0 (test 1)** | fx-agent/src/routes/orchestration.ts (1) — fx-agent는 `fx-agent/src/services/telemetry-collector.ts` 별도 파일 사용 | DIFF=YES (3108 vs 3113 bytes) | **DEAD** (api 측만) |
| `services/monitoring.ts` | 130 | **1** (`core/harness/routes/health.ts`) | 0 | N/A | **harness 도메인 이동** |
| `services/traceability.service.ts` | 373 | **1** (`routes/work.ts`) | 0 | N/A | **work 도메인 이동 (신설)** |

### 실제 import 경로 검증

```bash
# logger: api 내부 0건, CLI는 별도 파일 사용
grep -rn "from.*services/logger" packages/api/src/ | wc -l   # = 0
grep -rn "from.*services/logger" packages/cli/src/           # 3 callers, 모두 cli/src/services/logger.ts 참조

# telemetry-collector: api 내부 src 0건, test만 1
grep -rn "from.*services/telemetry-collector" packages/api/src/   # __tests__/telemetry-collector.test.ts 1건만
# fx-agent는 ../services/telemetry-collector.js → fx-agent/src/services/telemetry-collector.ts 자체 파일

# monitoring: harness route 단일
grep -rn "from.*services/monitoring" packages/api/src/   # health.ts (1) + monitoring.test.ts (1)

# traceability: work route 단일
grep -rn "from.*services/traceability" packages/api/src/   # work.ts (1) + traceability.service.test.ts (1)
```

### core/ 도메인 현황

```
packages/api/src/core/
├── agent/      ✅ services/ 다수
├── collection/
├── decode-bridge/
├── discovery/
├── events/
├── files/
├── harness/    ✅ services/ 다수 (monitoring 추가 가능)
├── offering/
├── shaping/
└── verification/
```

`core/work/`는 미존재 — **본 sprint에서 신설**(traceability.service가 시드 파일).

## 인터뷰 결정 (S324, 2026-05-04)

### 1차 인터뷰
"메인 트랙 = Foundry-X 코드 사이클 / F587 = logger 도메인 분리 먼저 / observability 4 files 번들"

### 2차 인터뷰 (사전 측정 후 재결정)
**Dead code 2 git rm + 2 files 도메인 이동 (Recommended)** 채택. 이유:
1. logger/telemetry-collector는 api 측 callers 0건 = 진정 dead code (F578 패턴)
2. monitoring은 harness 단일 caller = 도메인 응집도 100% (자연스러운 이동)
3. traceability.service는 work 단일 caller = work 도메인 시드 (F583 model-router → core/agent/services 패턴 동일)
4. 4 files 모두 core/observability/services/로 묶기는 불필요한 dead code 유지 + 단일 caller 도메인 위배

## 범위

### (a) git rm — Dead Code 2 files

```bash
# 1. logger.ts (api 내부 callers 0건)
git rm packages/api/src/services/logger.ts

# 2. telemetry-collector.ts (api 내부 callers 0건, fx-agent 측은 자체 파일 사용)
git rm packages/api/src/services/telemetry-collector.ts

# 3. 관련 test 파일도 dead code (테스트 대상이 사라짐)
git rm packages/api/src/__tests__/telemetry-collector.test.ts
```

> logger.test.ts는 미존재 확인됨 (사전 측정시 grep). logger 자체에 별도 테스트 파일 없었음.

### (b) git mv — 도메인 이동 2 files

```bash
# 1. monitoring → harness 도메인
git mv packages/api/src/services/monitoring.ts packages/api/src/core/harness/services/monitoring.ts

# 2. traceability.service → work 도메인 (신설)
mkdir -p packages/api/src/core/work/services/
git mv packages/api/src/services/traceability.service.ts packages/api/src/core/work/services/traceability.service.ts
```

### (c) Callers import path 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `core/harness/routes/health.ts:9` | `from "../../../services/monitoring.js"` | `from "../services/monitoring.js"` |
| `routes/work.ts:22` | `from "../services/traceability.service.js"` | `from "../core/work/services/traceability.service.js"` |

### (d) Test 파일 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `__tests__/monitoring.test.ts:4` | `from "../services/monitoring.js"` | `from "../core/harness/services/monitoring.js"` |
| `__tests__/traceability.service.test.ts:3` | `from "../services/traceability.service.js"` | `from "../core/work/services/traceability.service.js"` |

### (e) typecheck + lint + tests 회귀 GREEN

- packages/api typecheck PASS
- packages/api lint PASS
- packages/api vitest GREEN (특히 monitoring.test.ts, traceability.service.test.ts)
- packages/fx-agent typecheck PASS (회귀만 확인, telemetry-collector fx-agent 자체 파일은 변경 없음)
- packages/cli typecheck PASS (cli logger 별도 파일 회귀 확인)

## §3 Phase Exit OBSERVED — Smoke Reality 9항

표면 충족 함정 회피용 numerical 강제. 모든 항목은 PR merge 직전·직후 실측해야 한다.

| # | 검증 항목 | 명령 / 측정 | 기대값 |
|---|---------|----------|------|
| **P-a** | services/ 루트에서 4 files 사라짐 | `find packages/api/src/services -maxdepth 1 -name "logger.ts" -o -name "telemetry-collector.ts" -o -name "monitoring.ts" -o -name "traceability.service.ts" \| wc -l` | **0** |
| **P-b** | core/harness/services/에 monitoring 존재 | `find packages/api/src/core/harness/services -name "monitoring.ts" \| wc -l` | **1** |
| **P-c** | core/work/services/에 traceability.service 존재 | `find packages/api/src/core/work/services -name "traceability.service.ts" \| wc -l` | **1** |
| **P-d** | services/ 루트 .ts files = **29** | `ls packages/api/src/services/*.ts \| wc -l` | **29** (33-4) |
| **P-e** | 외부 callers 잔존 OLD import 0건 | `grep -rn "from.*services/\\(logger\\|telemetry-collector\\|monitoring\\|traceability\\.service\\)" packages/api/src/ \| grep -v "core/harness/services\\|core/work/services" \| wc -l` | **0** (2 callers + 2 tests 모두 갱신) |
| **P-f** | typecheck + test GREEN | `cd packages/api && pnpm typecheck && pnpm test` + `cd packages/fx-agent && pnpm typecheck && pnpm test` + `cd packages/cli && pnpm typecheck` | exit 0 |
| **P-g** | dual_ai_reviews sprint 333 자동 INSERT | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=333"` | **≥ 1** (누적 ≥ 19건) |
| **P-h** | F560/F582/F583/F584/F585/F586 회귀 0건 | (1) `curl -i .../api/discovery-stages/health` = 401 / (2) `grep -rn "diagnosticCollector" packages/fx-discovery/src \| wc -l` ≥ 21 / (3) `find packages/api/src/services/agent -type f \| wc -l` = 0 / (4) `find packages/api/src/core/agent/services -name "model-router.ts" \| wc -l` = 1 / (5) `find packages/api/src/core/agent/services -type f -name "*.ts" \| wc -l` ≥ 7 (F585 7 files 유지) | 모두 PASS |
| **P-i** | autopilot Match Rate | autopilot 자체 평가 | **≥ 90%** |

### 회귀 회피 항목

- **F578 dead code deletion 패턴 일관성**: telemetry-collector는 fx-agent 측 자체 파일(3113 bytes)이 살아있음 → fx-agent 회귀 차단 검증 필수
- **CLI logger 회귀**: `packages/cli/src/services/logger.ts`는 api와 별도 파일이라 영향 없어야 하나 typecheck로 재확인
- **work 도메인 신설 시드**: `core/work/services/traceability.service.ts`는 work 도메인 첫 파일. routes/work.ts와 services/work.service.ts/work-kg.service.ts는 별건(F588+ 후보, work 도메인 본격 분리 sprint)

### 표면 충족 함정 회피 핵심 조항

- **P-a + P-d numerical 동시 강제**: 4 files 사라지고 정확히 33→29로 감소 (단순 git rm 함정 차단, 누락 시 P-d FAIL)
- **P-b + P-c 위치 정확성**: monitoring은 harness로, traceability는 work로 정확히 분류 (autopilot이 임의로 다른 도메인 선택 시 FAIL)
- **P-e numerical 강제**: 외부 callers 잔존 import 0건 — `core/harness/services` 또는 `core/work/services` 경유 외 path 0건 (2 callers + 2 tests 모두 갱신, path 치환 누락 함정 차단)
- **P-h F585 회귀 차단**: F585에서 이동된 7 agent files이 core/agent/services/에 그대로 유지되어야 함 (numerical 검증 ≥ 7)

## 전제 조건

- F584 ✅ (Sprint 331, PR #715 Match 100%, services/model-router → core/agent/services 이동)
- F585 ✅ (Sprint 332, PR #717 Match 100%, services/ 루트 7 agent files → core/agent/services)
- F586 ✅ (Sprint 332, PR #717, output_tokens=0 fix additive)
- C103 ✅ (silent fail layer 1~3 종결)
- C104 ✅ (silent fail layer 4 종결, .dev.vars 자동 cp)
- save-dual-review hook 자동 trigger ✅ (sprint 327~332 7 sprint 연속 검증됨)

## 예상 시간

- autopilot 가동: **~10~15분** (F578 dead code deletion + F584 옵션 A 패턴 결합, callers 4건만 갱신)
- Master 가동 + 인터뷰 + Plan 작성: ~30분 (사전 측정 재인터뷰 1회 포함)
- OBSERVED 검증: ~5분
- **총 ~50분**

## Risk

- **Low**: dead code 2 files는 callers 0건 확증 → typecheck/test에 영향 없음
- **monitoring 이동 risk**: monitoring.test.ts의 import path 갱신만 누락하면 test FAIL → P-e numerical 강제로 차단
- **work 도메인 신설**: `core/work/services/` 디렉토리 생성 + index.ts 파일 부재 가능성 → autopilot이 work 도메인 init 누락 가능 → autopilot이 typecheck 통과시키는지 확인 (다른 도메인은 모두 index.ts 보유)
- **autopilot 옵션 변형 risk**: autopilot이 monitoring을 core/observability/services/ 등 다른 위치로 임의 이동 시 P-b FAIL → 옵션 A 18회차 정착화로 acceptable variant 처리 가능

## 다음 사이클 후보

본 sprint 완결 후 (services/ 루트 29 files):

- **F588 (or backlog)**: work 도메인 본격 분리 — routes/work.ts + services/work.service.ts + services/work-kg.service.ts → core/work/{routes,services}/ 통합 (P2, 큰 sprint)
- **F589 (or backlog)**: pm-skills 4 files (methodology-types/pm-skills-{guide,module,pipeline}) → core/methodology/services/ 또는 core/pm-skills/services/ (P2)
- **F590 (or backlog)**: prd/prototype 7 files 패키지화 → core/{prd,prototype}/ 신설 (P2)
- **Phase 47 GAP-3** (P2 F-track): 27 stale proposals 검토 루프
- **모델 A/B 비교** (P3): Opus 4.7 vs Sonnet 4.6 (autopilot 모델 선택)
- **F586 P-m**: 운영자 KOAMI Dogfood 1회 실행 (output_tokens > 0 production 실측, F582 P-d와 동일)
- **AI Foundry W18~W20 활동** (별도 PRD 트랙): 5/15+ 회의 D-day 사전 준비 (사용자 PM 작업, 본 sprint와 병렬)
