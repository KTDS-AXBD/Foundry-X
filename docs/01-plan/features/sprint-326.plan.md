---
id: FX-PLAN-326
sprint: 326
feature: F579
req: FX-REQ-646
status: approved
date: 2026-05-03
---

# Sprint 326 Plan — F579: services/agent (i) 17 files deduplicate + 외부 import 갱신

## 목표

**F578(Sprint 325, PR #706 Match 95%) OBSERVED 후속.** F578 Design §A 분류표상 "(i) 즉시 이전 가능" 20 files 중 dead code 3건만 삭제 → **17 files 미처리 잔존**. 본 Sprint는 fx-agent에 이미 동명 파일이 존재하는 17 files를 packages/api에서 deduplicate.

## 배경 — F578 표면 충족 함정 12회차 회피

| 항목 | F578 (Sprint 325) | F579 (Sprint 326, 본 sprint) |
|------|------------------|----------------------------|
| 작업 방식 | 분류표 작성 + 3 dead code 삭제 | 17 files 실 deduplicate + 외부 callers 갱신 |
| autopilot 자체 Match | 95% | ≥ 90% (OBSERVED P-c PASS 필수) |
| OBSERVED P-c | ❌ git rename 0건 (FAIL) | git rm + import update count로 측정 |
| services/agent 변화 | 44 → 41 (-3) | 41 → ≤ 24 (-17, 41 - 17 = 24) |
| Phase Exit P-h | ✅ dual_ai_reviews ≥ 3 (실제 4) | ✅ ≥ 5 (자동 INSERT ≥ 1 추가) |

> **표면 충족 함정 12회차 (rules/development-workflow.md)**: F578 autopilot이 "이전"을 "삭제"로 임의 해석 → PR Match 95% 보고하면서 git rename 0건. 본 Plan §3 P-c는 측정 명령에 `find packages/api/src/services/agent -type f` ≤ 24 + `git log --diff-filter=D` count ≥ 17 + import path 갱신 여부 동시 검증.

## §1 사전 측정 (S317 baseline)

| # | 항목 | S317 baseline | 측정 명령 |
|---|------|--------------|----------|
| M1 | api/services/agent total files (F578 후) | **41** | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` |
| M2 | (i) 17 files DIFF=NONE (중복) 카운트 | **10** | claude-api-runner, external-ai-reviewer, help-agent-service, mcp-adapter, meta-approval, model-router, openrouter-runner, openrouter-service, prompt-utils, skill-guide |
| M3 | (i) 17 files DIFF=YES (다름) 카운트 | **10** | agent-definition-loader, agent-inbox, architect-agent, infra-agent, meta-agent, planner-agent, qa-agent, reviewer-agent, security-agent, test-agent |
| M4 | (i) 17 files 외부 callers (F578 측정 (i) 비례) | ~25건 | `for f in (i)17; do grep -rln "services/agent/$f" packages/api/src; done` |
| M5 | dual_ai_reviews D1 누적 | **4** (S315/S316 retroactive + S317 sprint 325 자동 2) | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews"` |

**참고 — DIFF=NONE/DIFF=YES 분류는 이미 검증 완료** (S317 sprint-326.plan 작성 시점에 sed/diff 비교):
- DIFF=NONE 10 files: 단순 git rm으로 충분
- DIFF=YES 10 files: fx-agent 측 파일이 최신본인지 또는 services/agent 측에 unique 변경사항이 있는지 분석 필요

## §2 범위 — 5 항목 (P-a ~ P-e)

### (a) DIFF=NONE 10 files 즉시 deduplicate

DIFF=NONE 10 files (M2):
- claude-api-runner.ts
- external-ai-reviewer.ts
- help-agent-service.ts
- mcp-adapter.ts
- meta-approval.ts
- model-router.ts
- openrouter-runner.ts
- openrouter-service.ts
- prompt-utils.ts
- skill-guide.ts

처리:
- `git rm packages/api/src/services/agent/{file}.ts`
- 외부 callers의 import 경로를 fx-agent로 변경 OR services/agent에 stub re-export 추가(차후 단계 정리)

### (b) DIFF=YES 10 files diff 분석 + 처리

DIFF=YES 10 files (M3):
- agent-definition-loader.ts
- agent-inbox.ts
- architect-agent.ts
- infra-agent.ts
- meta-agent.ts
- planner-agent.ts
- qa-agent.ts
- reviewer-agent.ts
- security-agent.ts
- test-agent.ts

처리:
1. 각 file에 대해 `diff packages/api/src/services/agent/{f} packages/fx-agent/src/services/{f}` 분석
2. fx-agent 쪽이 최신본인지 검증:
   - fx-agent 쪽이 최신 → packages/api 측 git rm (DIFF=NONE 처리와 동일)
   - packages/api 쪽이 최신 → fx-agent로 변경사항 백포팅 후 packages/api git rm
   - 양방향 unique 변경 → 수동 merge (drift 사유 사용자 검토)
3. 결과: 모두 packages/api 측 git rm (fx-agent에서만 보존)

### (c) 외부 callers import 갱신

(a)+(b) 17 files 외부 callers (~25건):
- 옵션 1: import 경로를 직접 변경 (`from "../../services/agent/{f}.js"` → fx-agent service binding 또는 alias)
- 옵션 2: services/agent에 stub re-export 추가 (`export * from fx-agent`) — 임시 호환층

본 Plan은 옵션 1 우선 (cleanest). 외부 callers가 packages/api 도메인 내부면 cross-package binding 필요. cross-package binding 회피가 F577 autopilot의 동기였으나, F579는 services/agent 정리가 목표이므로 **fx-agent에서 main-api 경로로 re-export하는 stub** 또는 **callers 측 fx-agent service binding 호출**.

> **중요 결정 포인트**: 외부 callers를 어떻게 처리할지(옵션 1 vs 2)는 autopilot이 trade-off 분석 후 결정. Plan §3 P-c는 결과만 검증.

### (d) 회귀 GREEN

- packages/api typecheck + lint + tests
- packages/fx-agent typecheck + tests
- fx-gateway routing 정합성

### (e) Phase Exit P1~P4 Smoke Reality

- production deploy success
- fx-gateway → fx-agent 401/200 정합
- **dual_ai_reviews 누적 ≥ 5건** (S315 1 + S316 1 + sprint 325 2 + 본 sprint 자동 ≥ 1)
- C104 효과 지속 확인

## §3 정량 PASS 조건 표 (semantic Match 90% 기준)

| ID | 항목 | PASS 조건 (numerical) | OBSERVED 측정 명령 | 비중 |
|----|------|---------------------|-------------------|-----|
| **P-a** | DIFF=NONE 10 files git rm | `git diff master sprint/326 --diff-filter=D --name-only \| grep "packages/api/src/services/agent"` 카운트 ≥ **10** | git diff | 25% |
| **P-b** | DIFF=YES 10 files diff 분석 + 처리 | (1) Design 문서 §B에 10 files diff 분석 결과 표 존재, (2) 결과적으로 packages/api 측 git rm 또는 stub로 처리 | Design grep + git diff | 20% |
| **P-c** | services/agent file count 감소 | `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l` ≤ **24** (41 - 17 = 24) | find 명령 | 20% |
| **P-d** | 외부 callers import 갱신 | (1) typecheck PASS, (2) tests PASS, (3) `grep -rln "from.*services/agent/{rm된 17 files 중 하나}" packages/api/src \| grep -v ".test.ts"` 카운트 = **0** (모든 외부 callers 변경 완료) | typecheck + grep | 15% |
| **P-e** | 회귀 GREEN + Phase Exit | (1) `turbo typecheck` 19/19, (2) `turbo test` PASS, (3) production deploy success, (4) **dual_ai_reviews 누적 ≥ 5** (autopilot 자동 INSERT ≥ 1) | turbo + wrangler d1 query | 20% |

> **합산 100% / Match Rate ≥ 90% 도달 조건**: 위 5 항목 비중 합 ≥ 90% PASS. **P-c(file count 감소)와 P-e(회귀 + dual_ai_reviews)는 NOT-NULL** — 둘 중 하나라도 미달이면 Match Rate < 90% 강제.
>
> **표면 충족 함정 회피**: P-c가 핵심 — F578에서 41 < 44로 PASS 표시했던 함정이 본 Plan에서는 ≤ 24로 더 강한 numerical 조건. P-d "rm된 17 files 중 하나라도 import 잔존 = 0건"이 import 갱신 강제.

## §4 영향 파일 수 (예상)

| 영역 | 변경 | 파일 수 |
|------|------|--------|
| `git rm` (delete) | DIFF=NONE 10 + DIFF=YES 10 (fx-agent 백포팅 후 rm) | ~17 files |
| import path 갱신 | 외부 callers (~25건) | ~25 files |
| 신규 (Design 문서) | sprint-326.design.md (DIFF=YES 10 files 분석 §B 포함) | 1 file |
| fx-agent 백포팅 (DIFF=YES 일부) | 변경사항 패치 | 0~5 files |
| 합계 | | **~50 files** |

## §5 위험 + 완화 전략

| 위험 | 완화 |
|------|------|
| DIFF=YES 10 files 백포팅 누락 — services/agent 측 unique 변경이 fx-agent에 없음 | Design §B에 10 files 각각 diff 분석 결과 + 백포팅 결정 표 |
| import 갱신 시 cross-package binding 추가 발생 → F577 autopilot이 회피한 패턴 재현 | services/agent에 stub re-export 옵션 검토 (외부 callers 변경 최소화) |
| autopilot이 또 다른 표면 충족 함정 — file count 감소 없이 PASS 표시 | P-c numerical (≤ 24) + P-d (rm된 file import 잔존 = 0) 동시 검증 |
| dual_ai_reviews 자동 INSERT 미발생 (C104 효과 회귀) | C103 fallback hook + sprint signal STATUS=DONE trigger 정상 작동 검증 |

## §6 완료 기준 (Exit Criteria)

- [ ] §3 정량 PASS 표 5 항목 모두 OBSERVED 측정값 기록 + 비중 합 ≥ 90% 충족
- [ ] services/agent files ≤ 24 (P-c)
- [ ] `turbo typecheck` 19/19 + `turbo test` all PASS (P-e)
- [ ] dual_ai_reviews 누적 ≥ 5건 (autopilot 자동 INSERT ≥ 1 — P-e)
- [ ] PR Match Rate ≥ 90% (autopilot 자체 평가)
- [ ] SPEC.md F579 상태 ✅ 갱신 + 변경 이력 §9 추가

## §7 제외 범위

- (ii) 5 files contract 추출 (F580 후보 — 후속 sprint)
- (iii) 19 files 잔존 처리 (Phase 46 종결 인정)
- D1 migration 없음
- packages/web/cli 변경 없음

## §8 후속 작업

- F579 ✅ 후 F580 후보 검토: (ii) 5 files contract 추출 (agent-orchestrator, prompt-gateway, skill-pipeline-runner, task-state-service, task-state)
- Phase 46 진정 종결 인정 시점 결정 — services/agent ≤ 24 도달 후 Phase 47 GAP-4 진입
- ax-config repo `~/.bashrc sprint()` C104 sync (다른 환경 적용)

## §9 prerequisite (sprint 326 시작 전 충족)

- ✅ F578 ✅ MERGED (PR #706, Match 95%, dead code 3 deletion)
- ✅ Design §A 44 files 분류표 (sprint-325.design.md §A) — 17 files 분류 명시됨
- ✅ DIFF=NONE/YES 검증 완료 (S317 plan 작성 시점)
- ✅ C104 + C103 silent fail layer 4 해소 검증 (dual_ai_reviews 누적 4건, sprint 325 자동 INSERT 2건)
