---
id: FX-PLAN-342
sprint: 342
feature: F608
req: FX-REQ-672
status: approved
date: 2026-05-05
---

# Sprint 342 Plan — F608: MSA 룰 강제 교정 Pass 1 (lint script src/ 확장 + Forward-only baseline)

## 목표

**S327~S332 4 sprint 권고 누적 압력 정점 해소.** F591/F592/F594 4차 인터뷰 권고에서 반복 등장한 "MSA 룰 강제 교정 별건 F-item"을 Pass 1으로 분할 시작. 161 violations 전수 fix는 무리 → **Pass 1 = 룰 강제 차단막만**, fix는 Pass 2~4 (sprint 343+) 분할.

**핵심 원칙**:
- **Forward-only**: 신규 위반만 CI fail. 기존 161건은 baseline known-issue로 등록 (regression 방지)
- **2중 가드 유지**: `lint:msa-new` (PR diff 기반) + 신규 `lint:msa-baseline` (전체 baseline 비교)
- **불가역적 측정 차단막 해소**: `pnpm lint` 스코프가 `src/eslint-rules/`로 좁혀있어 src/ 전체 적용 시 위반 측정 자체가 silent fail이었던 layer 1 해소

## 사전 측정 (S332, 2026-05-05 오후 KST — 본 세션)

### 룰별 위반 카운트 (`pnpm exec eslint 'src/**/*.ts'` 직접 실행)

| 룰 | 심각도 | 카운트 |
|----|--------|--------|
| `foundry-x-api/no-cross-domain-import` | error | **129** |
| `foundry-x-api/no-cross-domain-d1` | warn | **31** |
| `foundry-x-api/no-direct-route-register` | error | **1** (`src/app.ts:129`) |
| `foundry-x-api/use-model-ssot` | error | 0 |
| **MSA 룰 위반 합계** | | **161** (errors 130 / warnings 31) |
| 기타 typescript-eslint | mixed | 116 (errors 72 / warnings 44, 별 트랙) |

**Unique fingerprints** (file:line:rule): **160** (1건 중복 라인 동일 룰 복수 메시지)

### 핫스팟 단일 파일 (no-cross-domain-import)

| 파일 | 위반 수 |
|------|---------|
| `core/discovery/routes/biz-items.ts` | **19** ★★ (별 sprint 후보) |
| `core/harness/routes/mcp.ts` | 5 |
| `core/discovery/routes/discovery-stage-runner.ts` | 5 |
| `core/offering/services/business-plan-generator.ts` | 5 |
| `core/agent/services/skill-pipeline-runner.ts` | 4 |
| `core/discovery/services/discovery-shape-pipeline-service.ts` | 4 |
| `core/harness/services/auto-fix.ts` | 4 (3 import + 1 D1) |
| `core/harness/services/automation-quality-reporter.ts` | 4 (D1) |
| `core/harness/services/backup-restore-service.ts` | 4 (D1) |
| `core/offering/services/business-plan-template.ts` | 4 |
| `core/offering/services/prd-generator.ts` | 4 |
| `core/offering/services/prototype-generator.ts` | 4 |
| `core/work/services/work.service.ts` | 6 (D1, agent_sessions 6회) |

### 도메인 의존 매트릭스 (no-cross-domain-import)

| from \ to | agent | discovery | harness | shaping | offering | collection | spec |
|-----------|-------|-----------|---------|---------|----------|------------|------|
| agent | — | 3 | 7 | 1 | 0 | 0 | 0 |
| collection | 6 | 3 | 0 | 3 | 0 | — | 0 |
| discovery | 25 | — | 1 | 4 | 8 | 1 | 0 |
| harness | 17 | 3 | — | 3 | 1 | 0 | 1 |
| offering | 8 | 18 | 0 | 0 | — | 0 | 0 |
| shaping | 12 | 0 | 0 | — | 0 | 1 | 0 |

핫 의존 방향: **discovery → agent (25)**, **offering → discovery (18)**, **harness → agent (17)**, **shaping → agent (12)**.

## 인터뷰 패턴 (S332, 27회차)

| # | 질문 | 사용자 답변 |
|---|------|-------------|
| 1 | git pull 0건 + 별 트랙 untracked 처리 | 폴더 rename + 분석 + backlog 반영 |
| 2 | 별 트랙 폴더명 결정 | `ai-foundry-master-plan` (서브 ai-foundry-os/와 명확 구분) |
| 3 | 별 트랙 폴더 위치 | `docs/specs/` 유지 |
| 4 | .dev.vars secrets 처리 | 폴더 외부 이동 + 루트 .gitignore (이미 line 33 등록됨) |
| 5 | SPEC backlog/roadmap 반영 범위 | B+ 중간 (INDEX + REQ 8건 + MEMORY) |
| 6 | 메인 작업 트랙 | MSA 룰 강제 교정 F-item |
| 7 | Sprint 342 범위 | Pass 1 = 룰 강제 + lint script src/ 확장 |
| 8 | grandfathered 161건 처리 전략 | Forward-only baseline ignore |

**결정 정착화**: closure 통합 18회차 다음 단계 = 누적 압력 정점 해소. Pass 1 차단막부터 → Pass 2~4 분할 fix.

## 범위

### (a) lint script 스코프 확장

`packages/api/package.json`:

```diff
-  "lint": "eslint src/eslint-rules/ --max-warnings 0",
+  "lint": "eslint src/ --max-warnings 0",
+  "lint:rules": "eslint src/eslint-rules/ --max-warnings 0",
```

기존 `lint:msa-new` 유지 (PR diff 기반).

### (b) Forward-only baseline 파일

`packages/api/.eslint-baseline.json` 신규 (gitignore에서 제외, repo에 commit):

```json
{
  "version": "1.0",
  "generated_at": "2026-05-05T...",
  "msa_total": 161,
  "msa_errors": 130,
  "msa_warnings": 31,
  "fingerprints": [
    "src/app.ts:129:foundry-x-api/no-direct-route-register",
    "src/core/agent/services/agent-adapter-factory.ts:12:foundry-x-api/no-cross-domain-import",
    "...160 entries..."
  ]
}
```

160 unique fingerprints sorted set으로 직렬화. fingerprint = `<file>:<line>:<rule>`.

### (c) Baseline check script

`scripts/lint-baseline-check.sh` 신규:

```bash
#!/usr/bin/env bash
# 현재 src/ violations에서 baseline 빠진 fingerprint = 신규 위반 = fail
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/packages/api"
CURRENT=$(pnpm exec eslint 'src/**/*.ts' -f json 2>/dev/null \
  | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));
             d.forEach(f=>f.messages.forEach(m=>{
               if (m.ruleId && m.ruleId.startsWith("foundry-x-api/")) {
                 const rel = f.filePath.split("/packages/api/")[1];
                 console.log(`${rel}:${m.line}:${m.ruleId}`);
               }
             }))' | sort -u)
BASELINE=$(node -e 'const b=JSON.parse(require("fs").readFileSync(".eslint-baseline.json","utf8"));
                    b.fingerprints.forEach(f=>console.log(f))' | sort -u)
NEW=$(comm -23 <(echo "$CURRENT") <(echo "$BASELINE"))
if [ -n "$NEW" ]; then
  echo "❌ MSA regression — 신규 위반 발견:"
  echo "$NEW" | sed 's/^/  /'
  exit 1
fi
echo "✅ MSA baseline maintained ($(echo "$CURRENT" | wc -l) violations, all in baseline)"
```

### (d) `package.json` lint scripts

```diff
+  "lint:msa-baseline": "bash ../../scripts/lint-baseline-check.sh",
+  "lint:all": "pnpm lint && pnpm lint:msa-baseline",
```

### (e) CI deploy.yml step

`/.github/workflows/deploy.yml`에 신규 step 추가:

```yaml
- name: MSA Baseline Check (F608)
  run: pnpm --filter foundry-x-api lint:msa-baseline
```

기존 `lint:msa-new` step 유지 (병행).

### (f) Baseline 자동 갱신 인터페이스

`scripts/lint-baseline-update.sh` 보조 신규 (manual run only — fix 후 baseline 축소 시):

```bash
#!/usr/bin/env bash
# 현재 violations로 .eslint-baseline.json 재작성 (fix PR에서만 수동 실행)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/packages/api"
node scripts/regenerate-baseline.mjs > .eslint-baseline.json
echo "✅ baseline regenerated"
```

이건 본 sprint out-of-scope, Pass 2+ sprint에서 fix 후 사용.

## TDD Red→Green

### Red Phase
- `__tests__/lint-baseline-check.test.ts` 신규
- 케이스 1: baseline 등록된 violation만 있으면 exit 0
- 케이스 2: 인위적 신규 violation 1건 추가 시 exit 1
- 케이스 3: 빈 baseline (0건) + 위반 0건 시 exit 0

### Green Phase
- `scripts/lint-baseline-check.sh` 구현
- baseline JSON parsing + sort 비교 로직
- 신규 fingerprint 출력 + exit code 1

## Phase Exit P-a~P-i Smoke Reality 9항

| # | 항목 | 측정 | 목표 |
|---|------|------|------|
| P-a | `pnpm lint` 직접 실행 시 src/ 전체 적용 | exit code 0 또는 N (baseline 인지) | src/eslint-rules/ 단독 검사 아님 확증 |
| P-b | `.eslint-baseline.json` fingerprints | jq `.fingerprints | length` | **160** (실측치) |
| P-c | baseline check 정상 케이스 | 현재 violations vs baseline 비교 | exit 0 (신규 0건) |
| P-d | baseline check regression 케이스 | 인위적 위반 1건 추가 → 실행 | exit 1 + 신규 fingerprint 출력 |
| P-e | typecheck + tests | `pnpm typecheck && pnpm test` | GREEN, 회귀 0건 |
| P-f | dual_ai_reviews sprint 342 자동 INSERT | D1 query | **≥1건** (누적 31→32+, hook 17 sprint 연속) |
| P-g | F560 회귀 | fx-discovery 401 일관 | 0 |
| P-h | F582 회귀 | DiagnosticCollector grep 21건 유지 | 0 |
| P-i | Match | autopilot self-eval | **≥ 90%** (semantic 100% 목표) |

**전제**: F595/F594 ✅, C103+C104 ✅ (16 sprint 연속 정상)

## 위험 + 완화

| 위험 | 완화 |
|------|------|
| ESLint flat config baseline 표준 부재 | 자체 wrapper script (sorted set diff) — 50줄 내외, 의존성 0 |
| baseline 파일이 거대 (160 entries) | 정렬 + line-based JSON으로 PR diff 가독성 유지 |
| `pnpm lint` 직접 실행 시 130 errors로 실패 → 개발 흐름 차단 | `lint:rules` 보조 script 유지 + `lint:all` 별도. 기본 `lint`는 baseline check를 거치게 wrapper |
| CI에서 fix PR이 baseline JSON 갱신 깜빡 → false positive | `lint-baseline-update.sh` 명시적 manual + PR review에서 baseline diff 확인 |
| Pass 2+ fix sprint에서 baseline 줄이는 작업 흐름 표준 부재 | F609~F611 plan 작성 시 "fix → baseline 자동 축소" 패턴 표준화 |

## 다음 사이클 후보 (Pass 2~4)

- **F609 (Pass 2)** — `cross-domain-import` 자동화 가능 fix (types.ts re-export 패턴, 60~80건 예상)
- **F610 (Pass 3)** — `core/discovery/routes/biz-items.ts` 19건 단일 파일 리팩터링 (별 sprint, types.ts contract 신설)
- **F611 (Pass 4)** — `cross-domain-d1` 31 warnings → service API 신설 (agent_sessions/agent_messages/agent_feedback/discovery_pipeline_runs/offering_prototypes 등)
- **F612~ (Pass 5+)** — 잔존 cross-domain-import 수동 fix
- 그 외 무관: F596 infra cluster sse-manager+kv-cache+event-bus / llm.ts 별 도메인 결정 / Phase 47 GAP-3 27 stale proposals / 모델 A/B / fx-discovery 404 / AI Foundry W18+ D 액션 (5/15 D-10)
