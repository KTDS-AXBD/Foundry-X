---
id: FX-PLAN-324
sprint: 324
feature: F577
req: FX-REQ-642
status: approved
date: 2026-05-03
---

# Sprint 324 Plan — F577: packages/api/src/agent → fx-agent 실 이전 (Phase 46 진정 종결)

## 목표

**Phase 46 Strangler Fig 패턴의 진정 완결.** F576(Sprint 323)이 `git mv core/agent → agent` directory rename으로 literal `find core/agent = 0`만 충족 → semantic Match ~30%였다는 회고 결과 후속.

본 Sprint는 packages/api/src/agent 120 files를 **물리적으로 fx-agent로 이전**하거나 폐기하여 `find packages/api/src/agent -type f = 0` 도달이 목표.

## 배경 — F576의 실패 패턴 회피

| 항목 | F576 (Sprint 323) | F577 (Sprint 324, 본 sprint) |
|------|------------------|----------------------------|
| 작업 방식 | `git mv core/agent → agent` directory rename | 파일별 물리 이전 + 외부 import 모두 갱신 |
| literal Match | 100% (`find core/agent = 0`) | 99~100% (`find agent = 0` 목표) |
| semantic Match | ~30% (autopilot 자체 평가는 97%) | ≥ 90% 정량 PASS 9 항목 모두 충족 |
| 90 test 처리 | 미이전 (packages/api/src/__tests__에 잔존) | packages/fx-agent/test로 물리 이동 |
| services 65 처리 | 미분류 (그대로 잔존) | 3분기 분류 표 + git mv 65건 |
| Phase Exit P2 | 미검증 → S315 C103 retroactive 처리 | autopilot 안에서 자동 검증 (dual_ai_reviews ≥ 1건) |

> **표면 충족 함정 (S315 회고)**: autopilot Match metric은 PR 본문 description에 명시된 산출물의 존재만 본다. directory rename도 "100% 검증"으로 평가하지만 sematic 가치는 0. **본 Plan의 §3 PASS 조건 표는 OBSERVED 측정 명령까지 포함**하여 이 함정을 회피한다.

## §1 사전 측정 (S315 baseline + 본 Plan 시점 재측정)

| # | 항목 | S315 baseline | 본 Plan 시점 | 측정 명령 |
|---|------|--------------|-------------|----------|
| M1 | packages/api/src/agent total files | 120 | 120 (동일) | `find packages/api/src/agent -type f \| wc -l` |
| M2 | agent/services/ files | 65 | 65 (동일) | `find packages/api/src/agent/services -type f -name "*.ts" \| grep -v ".test.ts" \| wc -l` |
| M3 | agent/routes/ files | 15 | 15 (동일) | `find packages/api/src/agent/routes -type f \| wc -l` |
| M4 | agent/orchestration+streaming+runtime+schemas+specs | 39 | 39 (동일) | `find packages/api/src/agent/{orchestration,streaming,runtime,schemas,specs} -type f \| wc -l` |
| M5 | 외부 non-test 사용처 | 45 | **45** | `grep -rln "from.*['\"].*agent/" packages/api/src \| grep -v ".test.ts" \| grep -v "^packages/api/src/agent" \| wc -l` |
| M6 | 외부 test 사용처 (90 통합 test) | 90 | **90** | `grep -rln "from.*['\"].*agent/" packages/api \| grep -E "\.test\.(ts\|tsx)$" \| wc -l` |
| M7 | agent/→core/ cross-domain dep | 20 | **8** (F575 효과로 자연 감소) | `grep -rE "from ['\"]\.\.?/.*core/(discovery\|offering\|shaping\|gateway\|ontology\|verification\|prototype)/" packages/api/src/agent --include="*.ts" \| grep -v ".test.ts" \| wc -l` |
| M8 | fx-agent routes 카운트 | 15 (F575 완성) | 15 | `find packages/fx-agent/src/routes -type f \| wc -l` |
| M9 | dual_ai_reviews D1 누적 | 1건 (S315 retroactive) | 1건 | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews"` |

> **참고**: M7이 20→8로 자연 감소한 것은 F575 sprint 322에서 cross-domain 사용 7개 routes를 fx-agent로 이전하면서 하위 의존성이 줄어든 효과. Plan 작성 시 baseline은 항상 sprint 시작 시점 재측정값을 기준으로 한다.

## §2 범위 — PRD §3-2 (a)~(i) 9 항목

### (a) routes 15 dead 즉시 삭제
fx-agent에 동등 routes 15 존재 + app.ts mount 해제 완료(F576) → packages/api/src/agent/routes/는 dead code. `git rm` 후 dist orphan 제거.

### (b) 90 통합 test → packages/fx-agent/test 물리 이동
agent를 import하는 test 90 files를 fx-agent로 이동 + import path 갱신 + fx-agent vitest 회귀 GREEN.

### (c) services 65 3분기 분류
- **fx-agent 이관** (예상 ~50): agent 도메인 전용 service
- **shared-contracts (F562) 이동** (예상 ~10): 다른 도메인과 공유되는 type/interface
- **폐기** (예상 ~5): F571/F575 이후 사용처 없는 service
분류 결정 표를 Design 문서 §A에 기록 (sprint 시작 시점에 services 65 각각 분류).

### (d) 45 non-test 외부 사용처 변경
- `core/* (28)`: agent import 제거 또는 fx-agent service binding 호출로 변경
- `services/* (8)` + `modules/* (7)` + `middleware (1)` + `routes (1)`: 동일 처리

### (e) cross-domain dep 8건 contract화 (M7 baseline 기준)
agent/→core/discovery / offering / shaping 등 잔존 의존성을 shared-contracts/types.ts로 추출. agent에서 직접 import 금지 → contract 경유.

### (f) orchestration 7 / streaming 3 / runtime 6 / schemas 15 / specs 8 처리
fx-agent 이전 또는 폐기 결정. 39 files 각각 분류.

### (g) packages/api/src/agent 디렉토리 자체 `git rm -rf`
**목표: `find packages/api/src/agent -type f = 0`** (literal & semantic 둘 다 충족).

### (h) 회귀 GREEN
- packages/api typecheck + lint + test
- packages/fx-agent typecheck + test
- fx-gateway routing 정합성 (서비스 binding)
- packages/web e2e 변동 없음

### (i) Phase Exit P1~P4 Smoke Reality
fx-gateway 경유 KOAMI Dogfood Graph 실행 → proposals ≥ 1건 + dual_ai_reviews D1 INSERT ≥ 1건 (autopilot 안에서 자동 측정).

## §3 정량 PASS 조건 표 (semantic Match 99% 기준)

| ID | 항목 | PASS 조건 (numerical) | OBSERVED 측정 명령 | 비중 |
|----|------|---------------------|-------------------|-----|
| **P-a** | routes 15 dead 삭제 | `find packages/api/src/agent/routes -type f` = **0** | `find packages/api/src/agent/routes -type f \| wc -l` | 10% |
| **P-b** | 90 test 물리 이동 + GREEN | (1) `grep -rln "from.*['\"].*agent/" packages/api \| grep -E "\.test\.(ts\|tsx)$"` = **0**, (2) `find packages/fx-agent/test -name "*.test.ts"` ≥ **90**, (3) `cd packages/fx-agent && pnpm test` = PASS | 위 명령 + import error 0건 | 20% |
| **P-c** | services 65 분류 + 이관 | (1) Design §A 분류 표에 65 row 모두 행 존재, (2) `find packages/api/src/agent/services -type f` = **0**, (3) fx-agent + shared-contracts + 폐기 합 = 65 | Design 문서 grep + find 명령 | 15% |
| **P-d** | 45 non-test 외부 사용처 변경 | `grep -rln "from.*['\"].*agent/" packages/api/src \| grep -v ".test.ts" \| grep -v "^packages/api/src/agent"` = **0** | 위 명령 | 15% |
| **P-e** | cross-domain dep 8 contract화 | (1) shared-contracts/agent-types.ts 또는 동등 파일 신규 추가, (2) `grep -rE "from ['\"]\.\.?/.*core/(discovery\|offering\|shaping\|gateway\|ontology\|verification\|prototype)/" packages/api/src/agent --include="*.ts"` = **0** | 위 명령 | 10% |
| **P-f** | orchestration 7 / streaming 3 / runtime 6 / schemas 15 / specs 8 처리 | `find packages/api/src/agent/{orchestration,streaming,runtime,schemas,specs} -type f` = **0** | 위 명령 | 10% |
| **P-g** | agent 디렉토리 완전 제거 | `find packages/api/src/agent -type f` = **0** | 위 명령 | 10% |
| **P-h** | 회귀 GREEN | (1) `turbo typecheck` = 19/19 PASS, (2) `turbo test` = all PASS, (3) `turbo lint` = 0 errors, (4) packages/web e2e 회귀 fail 0건 | turbo 명령 | 5% |
| **P-i** | Phase Exit Smoke Reality | (1) production deploy success, (2) fx-gateway → fx-agent routing 401/200 정상(이전 sprint와 동일), (3) **dual_ai_reviews 누적 ≥ 2건** (S315 1건 + 본 sprint autopilot 검증 1건 추가) | wrangler d1 query | 5% |

> **합산 100% / Match Rate ≥ 90% 도달 조건**: 위 9 항목 중 비중 합 ≥ 90% PASS. P-g(디렉토리 완전 제거)와 P-h(회귀 GREEN)은 NOT-NULL 조건 — 둘 중 하나라도 미달이면 Match Rate를 강제로 < 90%로 평가.

## §4 영향 파일 수 (예상)

| 영역 | 변경 | 파일 수 |
|------|------|--------|
| `git rm` (delete) | routes 15 + services 일부 + orchestration/streaming/runtime/schemas/specs 일부 | ~70 files |
| `git mv` (relocate) | services 50 → fx-agent, services 10 → shared-contracts, 90 test → fx-agent | ~150 files |
| import path 갱신 | 외부 non-test 45 + (test는 mv로 자동) | ~45 files |
| 신규 (shared-contracts) | agent-types.ts (cross-domain contract) | 1~2 files |
| 합계 | | **~265 files** |

## §5 위험 + 완화 전략

| 위험 | 완화 |
|------|------|
| services 65 분류 오판 | Design 문서 §A에 분류 표 작성 후 사용자 검토. 분류 결정 후 일괄 git mv |
| 90 test 이동 시 vitest config 충돌 | packages/fx-agent/vitest.config.ts에 test path 사전 등록 (Sprint 초반 1차 작업) |
| cross-domain contract 추출 시 순환 dependency | shared-contracts에 type-only export. runtime import 금지 |
| Phase Exit P2 자동 검증 실패 (S315 패턴) | C103 (a) task-daemon hook + (i) verification public mount 이미 적용 → autopilot 종료 시점 dual_ai_reviews INSERT 자동 |
| autopilot Match metric의 표면 충족 함정 | Plan §3 PASS 조건을 design 문서에도 복제 + autopilot 종료 시점 9 항목 OBSERVED 측정 명령 결과를 Report에 기록 |

## §6 완료 기준 (Exit Criteria)

- [ ] §3 정량 PASS 표 9 항목 모두 OBSERVED 측정값 기록 + ≥ 90% 충족
- [ ] `find packages/api/src/agent -type f` = 0 (P-g 핵심)
- [ ] `turbo typecheck` 19/19 + `turbo test` all PASS (P-h 핵심)
- [ ] PR Match Rate ≥ 90% (autopilot 자체 평가)
- [ ] Phase Exit P1~P4 검증 (KOAMI Dogfood + dual_ai_reviews ≥ 2건 누적)
- [ ] SPEC.md F577 상태 ✅ 갱신 + 변경 이력 §9 추가

## §7 제외 범위

- packages/fx-agent 내부 코드 신규 추가 없음 (F571+F575 완성분 그대로 사용)
- packages/web/cli 변경 없음
- D1 migration 없음 (schema 변경 없음)
- Phase 47 GAP-2/3/4 후속 작업 (본 sprint 완료 + 회고 시점에 별도 등록)

## §8 후속 작업

- F577 ✅ 후 Phase 47 회고 작성 시점에 다음 4건 SPEC 등록:
  - GAP-2 output_tokens=0 (P2 C-track)
  - GAP-3 proposals 검토 루프 (P2 F-track)
  - GAP-4 DiagnosticCollector 배선 (P1 F-track)
  - 모델 A/B Opus 4.7 vs Sonnet 4.6 (P3 F-track)
- F576 backlog C102 보존 → F577 ✅ 후 클로즈 표시
