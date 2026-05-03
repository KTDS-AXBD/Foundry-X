---
id: FX-PLAN-325
sprint: 325
feature: F578
req: FX-REQ-645
status: approved
date: 2026-05-03
---

# Sprint 325 Plan — F578: api/services/agent 44 files 분류 + 부분 이전 (Phase 46 진정 종결 마지막 한 걸음)

## 목표

**F577(Sprint 324, PR #705 Match 100%) autopilot이 cross-package binding 회피를 위해 신설한 `packages/api/src/services/agent/` 44 files 정리.** MSA 룰 `core/{domain}/` 관점에서 services/agent 잔존 = 진정 종결까지 한 단계 남음.

본 Sprint는 44 files를 **3분류**(즉시 이전 / contract 추출 후 후속 / 잔존 인정)하여 가능한 만큼만 fx-agent로 이전하고, 잔존 사유를 SPEC에 명문화한다.

## 배경 — 학습 모드 인터뷰 결정 (S317)

44 files의 외부 사용처 60건 + cross-domain dep 15건+ 이라는 강결합 측정값 앞에서 사용자가 4개 옵션 중 **분류 + 부분 이전**을 선택:

| 옵션 | 평가 | 채택 |
|------|------|------|
| 분류 + 부분 이전 | 2~3h, risk 낮음, 점진적 진정 종결 | ✅ |
| Phase 46 100% (전체 이전) | 4~6h+, contract 추출 + 사용처 60건 변경 | ❌ (risk 큼) |
| F578 drop + MSA 예외 명시 | 즉시 종결 | ❌ (Phase 46 명명과 괴리) |
| 다른 우선순위 | C104만 + Phase 47 GAP | ❌ (이번 사이클은 진정 종결 시도) |

> 근거: F577 회고에서 services/agent 44 = "진정 종결까지 한 걸음"으로 명시했으므로 적어도 일부 이전 시도가 필요. 단 100% 강제 이전은 risk 누적.

## §1 사전 측정 (S317 baseline)

| # | 항목 | S317 baseline | 측정 명령 |
|---|------|--------------|----------|
| M1 | api/services/agent total files | **44** | `find packages/api/src/services/agent -type f \| wc -l` |
| M2 | 외부 non-test 사용처 | **44** (44 = 60 - 16 test) | `grep -rln "from.*['\"].*services/agent" packages/api/src \| grep -v "/services/agent/" \| grep -v ".test.ts" \| wc -l` |
| M3 | __tests__ 사용처 | **16** | `grep -rln "from.*['\"].*services/agent" packages/api/src/__tests__ \| wc -l` |
| M4 | services/agent → cross-domain dep (core/harness, core/discovery, core/offering, core/shaping, modules/launch) | **15+** | `grep -rE "from ['\"]\.\.?/.*core/(harness\|discovery\|offering\|shaping)\|modules/(launch\|portal\|gate)" packages/api/src/services/agent --include="*.ts" \| sort -u \| wc -l` |
| M5 | fx-agent에서 api/services/agent import | **0** | `grep -rln "from.*api/services/agent\|from.*api/src/services/agent" packages/fx-agent \| wc -l` |
| M6 | dual_ai_reviews D1 누적 | 2건 (S315/S316) | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews"` |
| M7 | 사용처 디렉토리 분포 | core/discovery 7+3, core/shaping 5, core/harness 5+1, core/offering 4, modules/portal 4+1, modules/gate/auth/launch 3, services 4, adapters 5, routes 1, middleware 1 | grep + cut -d/ |

> M5=0이 핵심 — fx-agent는 services/agent에 의존하지 않음. 즉 (i) 분류 file을 fx-agent로 옮길 때 fx-agent 자체 회귀는 거의 없음. risk는 packages/api 측 60건 사용처에 집중.

## §2 범위 — 9 항목 (P-a ~ P-i)

### (a) 44 files를 3분류로 grep 측정 + Design 문서에 분류표 기록

각 file에 대해 grep으로:
- `cross-domain dep`: services/agent/{file} → core/* / modules/* import 카운트
- `외부 사용처`: 다른 파일에서 services/agent/{file} import 카운트
- `사용처 도메인`: import 호출자가 어느 디렉토리에서 옴

**3분류 기준**:
- **(i) 즉시 이전 가능**: cross-domain dep = 0 + 외부 사용처가 fx-agent 측 또는 stub 가능 → fx-agent로 git mv
- **(ii) contract 추출 후 다음 sprint**: cross-domain dep ≥ 1 OR 외부 사용처 다수 → shared-contracts에 type 추출 + 다음 sprint 이전
- **(iii) main-api 도메인 잔존**: prd-generator/prototype-generator/adapters 등 main-api 전용 사용 → 잔존 + 사유 명시

분류표는 Design 문서 §A에 기록 (44 row 표).

### (b) (i) 분류 file을 fx-agent/src/services/로 이전

- `git mv packages/api/src/services/agent/{file}.ts packages/fx-agent/src/services/{file}.ts`
- import path 갱신 (.js extension)
- 동일 디렉토리에 이미 동명 파일 있으면 conflict 분석 후 이름 변경 또는 통합

### (c) (i) file의 외부 사용처 변경

- 사용처가 fx-agent 측 → 그대로 (이전 후 같은 패키지 내부)
- 사용처가 packages/api/core 또는 modules → 옵션 1: stub 추가 (services/agent에 wrapper 두고 import는 fx-agent에서) / 옵션 2: import 경로를 `@foundry-x/fx-agent` 등 cross-package로 변경

### (d) (ii) 분류 file은 SPEC backlog 또는 후속 F-item 등록

- (ii) 분류 file count > 0 시 SPEC.md backlog C-track에 "F578 (ii) 후속" 등록 또는 F579 신규 등록
- contract 추출 + cross-domain dep 정리는 별 sprint에서 진행

### (e) (iii) 분류 file은 services/agent 잔존 + Design §A에 사유 명시

- main-api 도메인 속성 — adapters, prd-generator 등은 main-api 라이프사이클이지 agent 도메인이 아님
- ESLint MSA 룰 예외 등록 (services/agent/*는 main-api로 인정)

### (f) 회귀 GREEN

- packages/api typecheck + lint + tests
- packages/fx-agent typecheck + tests
- fx-gateway routing 정합성

### (g) C104 효과 확증 (.dev.vars 자동 복사)

- Sprint 325 WT 생성 시 `.dev.vars` 2개 자동 복사 확인 (master → WT)
- save-dual-review.sh가 secret 로드 성공 → POST 200 응답
- autopilot 종료 시점 dual_ai_reviews D1 INSERT 자동 발생 (retroactive 아님)

### (h) Phase Exit P1~P4 Smoke Reality

- production deploy success
- fx-gateway → fx-agent routing 정합 (이전 sprint와 동일 401/200)
- **dual_ai_reviews 누적 ≥ 3건** (S315 1건 + S316 1건 + 본 sprint autopilot 자동 INSERT 1건)
- KOAMI Dogfood Graph 실행 또는 codex-review.sh sprint 종료 hook 자동 trigger

### (i) 회귀 + 정합성 점검

- packages/web e2e 변동 없음 (services/agent는 백엔드만)
- D1 migration 없음

## §3 정량 PASS 조건 표 (semantic Match 90% 기준)

| ID | 항목 | PASS 조건 (numerical) | OBSERVED 측정 명령 | 비중 |
|----|------|---------------------|-------------------|-----|
| **P-a** | 44 files 3분류 + Design §A 작성 | (1) Design 문서 §A에 44 row 표 존재, (2) 각 file에 (i)/(ii)/(iii) 분류 명시 | `wc -l docs/02-design/features/sprint-325.design.md` + `grep -c "^\| " §A` | 15% |
| **P-b** | (i) 분류 file count ≥ 5건 | (i) 분류된 file count ≥ **5** (최소). (i) = 0 시 autopilot retry | Design §A grep `(i) 즉시` 카운트 | 10% |
| **P-c** | (i) file fx-agent 이전 | (1) `find packages/api/src/services/agent -type f` < 44, (2) (i) file 모두 `packages/fx-agent/src/services/`에 존재 | `find` + `git log --diff-filter=R` | 15% |
| **P-d** | (i) file 외부 사용처 import 갱신 | (1) (i) file을 import하던 외부 60건 중 (i) 비례 사용처가 모두 새 경로로 변경, (2) typecheck PASS | `grep -rln "from.*services/agent/{(i)file}" packages/api` = 0 | 15% |
| **P-e** | (ii) 분류 file 후속 등록 | (ii) > 0 시 SPEC backlog 또는 F-item 신규 row 추가. (ii) = 0 시 자동 PASS | SPEC.md grep `(ii)` | 10% |
| **P-f** | (iii) 분류 file 사유 명시 | (iii) > 0 시 Design §A에 각 file 사유 칼럼 비어있지 않음. (iii) = 0 시 자동 PASS | Design §A `(iii)` row 사유 grep | 5% |
| **P-g** | 회귀 GREEN | (1) `turbo typecheck` = 19/19 PASS, (2) `turbo test` = all PASS, (3) `turbo lint` = 0 errors | turbo 명령 | 15% |
| **P-h** | C104 효과 + dual_ai_reviews 자동 INSERT | (1) WT 생성 시 `ls WT/.dev.vars && ls WT/packages/api/.dev.vars` 둘 다 존재, (2) sprint 종료 시점 `dual_ai_reviews` 누적 ≥ **3건** (S315 1 + S316 1 + 본 sprint **자동** 1) — **retroactive 금지** | wrangler d1 query | 10% |
| **P-i** | Phase Exit Smoke Reality | (1) production deploy success, (2) fx-gateway → fx-agent 401/200 정합, (3) packages/web e2e 회귀 fail 0건 | deploy run + curl | 5% |

> **합산 100% / Match Rate ≥ 90% 도달 조건**: 위 9 항목 중 비중 합 ≥ 90% PASS. **P-g(회귀 GREEN)와 P-h(dual_ai_reviews 자동 INSERT)는 NOT-NULL 조건** — 둘 중 하나라도 미달이면 Match Rate를 강제로 < 90%로 평가.
>
> **표면 충족 함정 회피 (S315 회고 + S316 11회차)**: P-h의 "자동 INSERT" 조건이 핵심 — autopilot이 retroactive INSERT로 PASS 표시하면 함정. WT 생성 시점의 .dev.vars 존재 + sprint 종료 시점 자동 trigger가 동시 PASS여야 진짜 효과 확증.

## §4 영향 파일 수 (예상)

| 영역 | 변경 | 파일 수 |
|------|------|--------|
| `git mv` (relocate) | (i) 분류 file → packages/fx-agent/src/services/ | 5~20 files (분류 결과에 따라) |
| import path 갱신 | (i) file의 외부 사용처 | 5~30 files |
| 신규 (Design 문서) | sprint-325.design.md (분류표 §A 포함) | 1 file |
| SPEC.md backlog | (ii) 분류 file 후속 등록 | 1 row 추가 (ii) 발생 시 |
| 합계 | | **~30~80 files** (분류 결과에 따라 가변) |

## §5 위험 + 완화 전략

| 위험 | 완화 |
|------|------|
| 분류 오판 — main-api 도메인을 (i)으로 분류하여 강제 이전 시 60건 사용처 폭발 | Design §A 분류 후 `pnpm --filter @foundry-x/api typecheck`로 dry-run 검증 |
| (i) 분류 file = 0건 (전부 cross-domain dep 있음) | 그래도 PASS 인정 — Phase 46 진정 종결은 분류 문서화 자체가 진전 |
| C104 효과 미발현 (P-h FAIL) | save-dual-review.sh 호출 직접 검증 — sprint 시작 시점에 manual run으로 사전 확인 |
| autopilot Match metric 표면 충족 — 분류표만 작성하고 실제 이전 0건으로 완료 표시 | P-c: (i) file fx-agent 이전 OBSERVED 측정으로 검증 |
| services/agent 잔존이 ESLint MSA 룰 위반 → CI red | services/agent에 한해 룰 예외 등록 (Design 문서에 명시) |

## §6 완료 기준 (Exit Criteria)

- [ ] §3 정량 PASS 표 9 항목 모두 OBSERVED 측정값 기록 + 비중 합 ≥ 90% 충족
- [ ] (i) 분류 file count ≥ 5건 fx-agent 이전 (P-b + P-c)
- [ ] `turbo typecheck` 19/19 + `turbo test` all PASS (P-g)
- [ ] dual_ai_reviews 누적 ≥ 3건 (autopilot 종료 시점 자동 INSERT — P-h)
- [ ] PR Match Rate ≥ 90% (autopilot 자체 평가)
- [ ] SPEC.md F578 상태 ✅ 갱신 + 변경 이력 §9 추가

## §7 제외 범위

- 44 files 100% fx-agent 이전 (Phase 46 100%) — risk 회피, 다음 사이클 별도 sprint
- D1 migration 없음 (schema 변경 없음)
- packages/web/cli 변경 없음
- (ii)/(iii) 분류 file의 실제 이전은 후속 sprint
- Phase 47 GAP-2/3/4 후속 작업 (별도 사이클)

## §8 후속 작업

- F578 ✅ 후 Phase 47 GAP-4 진입 (DiagnosticCollector 배선, P1)
- (ii) 분류 file 후속 sprint (F579 또는 backlog C-track)
- ax-config repo `~/.bashrc` sync (C104 다른 환경 적용 검토 — 별 사이클)
- C104 효과 검증 결과를 rules/development-workflow.md "Autopilot Production Smoke Test" 패턴 누적 12회차로 기록

## §9 prerequisite C104 (선행 적용 완료)

- ✅ `~/.bashrc sprint()` 함수에 `.dev.vars` 자동 복사 로직 추가 (S317, F578 Sprint 325 시작 전)
- ✅ master에 `/home/sinclair/work/axbd/Foundry-X/.dev.vars` + `packages/api/.dev.vars` 존재 확인
- ✅ 임시 dry-run 검증 PASS (`/tmp/test-c104-wt`에서 idempotent + 정확한 cp 확인)
- 본 Sprint 325 WT 생성 시점에 자동 cp 실행 → C104 실 동작 첫 검증
