# Sprint 177 Gap Analysis — F388 + F389

> **Sprint**: 177
> **Date**: 2026-04-06
> **Design**: `docs/02-design/features/sprint-177.design.md`
> **Parent Design**: `docs/02-design/features/fx-builder-evolution.design.md` §6 Sprint 177
> **Match Rate**: **95%** (Sprint Design 18/18 PASS, Parent Checklist 12/14 PASS)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Sprint Design Match | 100% (18/18) | PASS |
| Parent Design Checklist | 86% (12/14) | WARN |
| Test Coverage | 100% (20/20 tests) | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **95%** | PASS |

---

## 1. F388: CLI 듀얼 모드

| # | Design 항목 | 상태 | 구현 위치 |
|---|------------|:----:|----------|
| 1 | `fallback.ts`에 `runMaxCli()` 함수 추가 | PASS | fallback.ts:230-256 |
| 2 | `FallbackLevel`에 `'max-cli'` 추가 | PASS | fallback.ts:11 |
| 3 | `CLAUDE_CLI_PATH` 환경변수 지원 | PASS | fallback.ts:272 |
| 4 | CLI 가용성 자동 감지 (subprocess ping) | **FAIL** | 미구현 — runMaxCli 실패 시 자동 fallback으로 대체 |
| 5 | `CostTracker.recordCli()` 메서드 추가 | PASS | cost-tracker.ts:58-70 |
| 6 | 테스트: CLI 모드 mock 테스트 | PASS | fallback.test.ts — 10 tests |

### F388 상세 검증

**runMaxCli() 시그니처** — Design과 일치:
- `job: PrototypeJob, round: number, cliPath: string = 'claude'` PASS
- `--bare -p {prompt}` + `--allowedTools Bash,Read,Edit,Write` + `--max-turns 15` PASS
- timeout 5분 (`5 * 60 * 1000`) PASS
- 성공 시 `writeGeneratedFiles()` 호출 PASS
- 실패 시 `{ success: false, output: '' }` 반환 PASS

**executeWithFallback() 3-Level** — Design과 일치:
- `FallbackLevel = 'max-cli' | 'api' | 'ensemble'` PASS
- `SKIP_CLI !== 'true'` 조건 분기 PASS
- Level 0 → Level 1 → Level 2 fallback 체인 PASS

**CostTracker.recordCli()** — Design과 일치:
- `model: 'cli-subscription'`, `cost: 0`, tokens 0/0 PASS

---

## 2. F389: Enhanced O-G-D 루프

| # | Design 항목 | 상태 | 구현 위치 |
|---|------------|:----:|----------|
| 1 | `orchestrator.ts` — `evaluateQuality()` 통합 | PASS | orchestrator.ts:77 |
| 2 | qualityThreshold 단위 변경 (0.85 → 80) | PASS | orchestrator.ts:49 |
| 3 | 타겟 피드백 → `saveFeedback()` → 다음 라운드 입력 | PASS | orchestrator.ts:112-118 |
| 4 | maxRounds 3→5 확장 | PASS | orchestrator.ts:48 |
| 5 | 미수렴 시 best score 채택 + 미달 리포트 | PASS | orchestrator.ts:121-155 |
| 6 | 라운드별 점수 D1 저장 (`prototype_quality` INSERT) | **FAIL** | 미구현 — D1 연동 없음 (Sprint 178 선행 조건) |
| 7 | 테스트: Enhanced O-G-D 시나리오 테스트 | PASS | orchestrator.test.ts — 10 tests |

### F389 상세 검증

**OgdResult 확장** — Design과 일치:
- `qualityScore?: QualityScore` 필드 PASS
- `converged: boolean` 필드 PASS

**runOgdLoop() 흐름** — Design과 일치:
- `evaluateQuality()` → `score.total >= qualityThreshold` 수렴 판정 PASS
- `generateTargetFeedback(score)` → `saveFeedback()` → `job.feedbackContent` 주입 PASS
- 미수렴 시 `bestOutput` / `bestScore` 채택 PASS
- `unconverged-report.md` 자동 생성 (Design 명시 이상 구현) PASS

---

## 3. 테스트 매트릭스

### 3.1 fallback.test.ts (10 tests)

| Design 시나리오 | 테스트 | 상태 |
|----------------|--------|:----:|
| Max CLI 성공 → level='max-cli' | FallbackLevel 타입 확인 | PASS |
| SKIP_CLI=true → API 직행 | `SKIP_CLI=true이면 CLI를 건너뛰고 API로 가요` | PASS |
| 모두 실패 → ensemble | `SKIP_CLI=true + API 실패 시 ensemble 에러` | PASS |
| CostTracker.recordCli() cost=0 | `CLI 모드는 비용 $0으로 기록해요` | PASS |
| writeGeneratedFiles 파일 추출 | 3개 테스트 (단일/복수/빈 블록) | PASS |
| CLI+API 혼합 비용 추적 | `API + CLI 혼합 시 API 비용만 누적` | PASS |

### 3.2 orchestrator.test.ts (10 tests)

| Design 시나리오 | 테스트 | 상태 |
|----------------|--------|:----:|
| 1라운드 80점+ 수렴 | `converged=true, rounds=1` | PASS |
| 3라운드 수렴 | `여러 라운드 후 수렴` (45→65→82) | PASS |
| 5라운드 미수렴 | `converged=false, best score=78` | PASS |
| maxRounds 옵션 존중 | `maxRounds: 2` | PASS |
| qualityThreshold 옵션 존중 | `threshold 50 → 60점 수렴` | PASS |
| Generator 실패 → continue | `실패 후 다음 라운드 성공` | PASS |
| 타겟 피드백 saveFeedback | `feedback_0.md 파일 저장 확인` | PASS |
| CostTracker CLI 모드 | `model='cli-subscription', cost=0` | PASS |
| CostTracker API 모드 | `model='haiku' (round 0)` | PASS |
| 미수렴 리포트 생성 | `unconverged-report.md 확인` | PASS |

---

## 4. Missing Features (Design O, Implementation X)

| # | 항목 | 출처 | 영향도 | 사유 |
|---|------|------|:------:|------|
| 1 | CLI 가용성 자동 감지 (subprocess ping) | Parent Design:465 | Low | `runMaxCli()` 실패 시 자동 fallback이 동일 효과. 별도 ping은 지연만 추가 |
| 2 | 라운드별 점수 D1 저장 | Parent Design:475 | Medium | Sprint 178 대시보드(F390)의 데이터 소스. 현재 in-memory + 파일 리포트만 존재 |

---

## 5. Added Features (Design X, Implementation O)

| # | 항목 | 구현 위치 | 설명 |
|---|------|----------|------|
| 1 | `--output-format json` CLI 옵션 | fallback.ts:241 | CLI 출력 파싱 안정화 |
| 2 | `unconverged-report.md` 자동 생성 | orchestrator.ts:124-146 | 미수렴 시 차원별 상세 리포트 |
| 3 | `OgdOptions.useLlm` 옵션 | orchestrator.ts:31 | LLM 기반 prdScore 제어 |

---

## 6. Recommended Actions

### 의도적 제외 (코드 변경 불필요)

| 항목 | 판단 |
|------|------|
| CLI ping 테스트 | **제외 유지** — runMaxCli 실패 fallback이 동일 효과, ping은 5초 지연만 추가 |

### Sprint 178 선행 조건

| 항목 | 대상 | 설명 |
|------|------|------|
| D1 점수 저장 | orchestrator.ts | F390 대시보드가 이 데이터에 의존. Sprint 178 착수 시 추가 구현 필요 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial gap analysis | Claude |
