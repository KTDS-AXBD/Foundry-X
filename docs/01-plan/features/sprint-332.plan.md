---
id: FX-PLAN-332
sprint: 332
feature: F585 + F586
req: FX-REQ-652, FX-REQ-653
status: approved
date: 2026-05-04
---

# Sprint 332 Plan — F585 (services 루트 agent 7 cleanup) + F586 (Phase 47 GAP-2 output_tokens=0 fix)

## 목표

**1 sprint에 2 F-item 묶음** — F585 (services/ 루트 agent 7 files cleanup, F584 패턴 16회차 확장) + F586 (agent_run_metrics output_tokens=0 fix, Phase 47 GAP-2 해소). 두 트랙은 모두 agent execution path를 만지므로 작업 영역 인접 → autopilot 동시 처리 안전.

**핵심 원칙 1 (F585)**: F579/F581/F583/F584 16회차 정착화된 옵션 A 패턴 — `git mv api/services/{file}.ts → api/core/agent/services/{file}.ts`. 18 callers import path 갱신.

**핵심 원칙 2 (F586)**: token 메트릭 정확성 회복 — provider runner에서 `usage.output_tokens` 추출 + `diagnostic-collector.ts` INSERT bind 갱신 (양 패키지) + AgentExecutionResult 타입 확장. Production D1 실측 125건 100% output_tokens=0 사실 해소.

**OBSERVED 강제 13항** (F585 9 + F586 4) — 표면 충족 함정 17회차 회피.

## 사전 측정 (S323, 2026-05-04)

### F585 측정 — services/ 루트 agent 7 files

| 파일 | api callers | fx callers | DIFF | 비고 |
|------|------|------|------|------|
| `agent-inbox.ts` | 2 | 0 | NONE | F580 KEEP에서 잔존, deduplicate 적기 |
| `agent-orchestrator.ts` | 1 | 1 | YES | dual callers, fx-agent 본 사용 검토 |
| `prompt-gateway.ts` | 4 | 1 | YES | api 측 high callers, 합본 필요 가능 |
| `reviewer-agent.ts` | 3 | 1 | YES | F580 KEEP에서 잔존 |
| `skill-pipeline-runner.ts` | 2 | 0 | YES | api-only flow |
| `task-state-service.ts` | 3 | 2 | YES | dual callers, 코어 파일 |
| `task-state.ts` | 3 | 2 | YES | task-state-service와 짝 |
| **합계** | **18** | **7** | — | — |

services/ 루트 직속 .ts: 40 files (서브디렉토리 `adapters/`만). 7 agent files 외 33 files는 logger/llm/methodology/pm-skills-*/prd-*/prototype-*/sr-*/work-*/spec-* 등 도메인 다양 → F-track 별도 분리 후속.

services/agent 디렉토리: **0 files** ✅ (F583 Sprint 330 종결 유지).

core/agent/services 현재: **34 files** (F583/F584 누적). 본 sprint 후 **41 files** (+7).

### F586 측정 — output_tokens=0 누락 범위 (Production D1)

```bash
$ wrangler d1 execute foundry-x-db --remote --command "..."
total: 125
zero_cnt: 125
nonzero_cnt: 0
avg_in: 2705.072
max_out: 0
```

**125행 100% output_tokens=0** (max=0). avg input_tokens=2705는 정상 기록. 즉 **input은 정상 추출 되지만 output은 누락**.

#### Smoking Gun

`packages/api/src/core/agent/services/diagnostic-collector.ts:51, 71` + `packages/fx-agent/src/services/diagnostic-collector.ts:51, 71` (양쪽 247L 동일):

```ts
// L47-54 (record 함수)
await this.db
  .prepare(
    `INSERT INTO agent_run_metrics
       (id, session_id, agent_id, status, input_tokens, output_tokens,
        cache_read_tokens, rounds, stop_reason, duration_ms, error_msg,
        started_at, finished_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?, ?, ?)`,
  )
  //                       ^^^ ^^^ output_tokens=0, cache_read_tokens=0 하드코딩
  .bind(id, sessionId, agentId, status, result.tokensUsed, stopReason, durationMs, errorMsg, now, now, now)
  //                                                       ^^^^^^^^^^^^^^^^^^^^^^ input만 bind
  .run();

// L65-74 (recordGraphResult 함수) — 동일 패턴
VALUES (?, ?, 'discovery-graph', 'completed', 0, 0, 0, ?, 'end_turn', ?, NULL, ?, ?, ?)
//                                            ^^^ ^ output_tokens=0, cache_read_tokens=0 하드코딩
```

#### 타입 분석

`packages/api/src/core/agent/services/execution-types.ts:85`:

```ts
export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: { ... };
  tokensUsed: number;  // ← 단일 필드, input/output 분리 안 됨
  model: string;
  duration: number;
  reflection?: { ... };
}
```

`tokensUsed: number` 단일 필드 → output 정보 통과 채널 부재. **shared 타입 확장 필요**.

#### tokensUsed 할당 사이트 (~10 callers)

`grep -rn 'tokensUsed\s*[:=]'`:

```
packages/api/src/core/discovery/services/trend-data-service.ts:35,107,183
packages/api/src/core/discovery/schemas/bd-artifact.ts:38,51
packages/api/src/core/discovery/services/agent-collector.ts:21,71
packages/api/src/core/shaping/services/bd-artifact-service.ts:35,80
packages/api/src/core/agent/services/test-agent.ts:9,21
packages/api/src/core/agent/services/architect-agent.ts:10,22
packages/api/src/core/agent/services/mcp-sampling.ts:73,90
```

본 sprint는 **outputTokens 추가** (additive non-breaking) 채택 — `tokensUsed: number` 유지 + `outputTokens?: number, cacheReadTokens?: number` 옵션 필드 추가.

## 인터뷰 결정 (S323, 2026-05-04)

### F585 — 옵션 A 채택

`git mv api/services/{file}.ts → api/core/agent/services/{file}.ts` 7개 동시 + 18 callers import path 갱신. 이유:

1. F579/F581/F583/F584 패턴 16회차 정착화 (autopilot 자동 채택)
2. MSA `core/{domain}/` 룰 부분 복원 (services/ 루트 사용 회피)
3. DIFF=YES 5 files는 fx-agent 측 최신본인지 검증 후 합본 또는 main-api 본 유지 — autopilot 판단

### F586 — 옵션 Additive 채택

`AgentExecutionResult.tokensUsed: number` 유지 + `outputTokens?: number, cacheReadTokens?: number` 옵션 필드 추가 (additive non-breaking). 이유:

1. ~10 callers 갱신 minimize (기존 `tokensUsed` 할당 깨지지 않음)
2. provider runner만 새 필드 populate (claude-api-runner, openrouter-runner)
3. diagnostic-collector.ts INSERT bind 두 줄만 변경
4. shared 타입 breaking change 회피

## 범위

### F585 작업

#### (a) 7 files git mv

```bash
git mv packages/api/src/services/agent-inbox.ts          packages/api/src/core/agent/services/agent-inbox.ts
git mv packages/api/src/services/agent-orchestrator.ts   packages/api/src/core/agent/services/agent-orchestrator.ts
git mv packages/api/src/services/prompt-gateway.ts       packages/api/src/core/agent/services/prompt-gateway.ts
git mv packages/api/src/services/reviewer-agent.ts       packages/api/src/core/agent/services/reviewer-agent.ts
git mv packages/api/src/services/skill-pipeline-runner.ts packages/api/src/core/agent/services/skill-pipeline-runner.ts
git mv packages/api/src/services/task-state-service.ts   packages/api/src/core/agent/services/task-state-service.ts
git mv packages/api/src/services/task-state.ts           packages/api/src/core/agent/services/task-state.ts
```

#### (b) 18 api callers import path 갱신

각 caller가 `from "../../services/{file}"` 또는 `from "../../../services/{file}"` 형식 → `from "../core/agent/services/{file}"` 또는 `from "../../agent/services/{file}"` 또는 동일 디렉토리 시 `from "./{file}"`로 갱신.

#### (c) DIFF=YES 5 files diff 분석

agent-orchestrator/prompt-gateway/skill-pipeline-runner/task-state-service/task-state — fx-agent 측 동명 파일과 비교 후 최신본 결정. autopilot이 자체 판단.

### F586 작업

#### (d) AgentExecutionResult 확장

`packages/api/src/core/agent/services/execution-types.ts`:

```ts
export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: { ... };
  tokensUsed: number;            // 기존 (input 또는 total, 이전 호환성)
  outputTokens?: number;         // 신규 (provider response.usage.output_tokens)
  cacheReadTokens?: number;      // 신규 (provider response.usage.cache_read_input_tokens)
  model: string;
  duration: number;
  reflection?: { ... };
}
```

`packages/fx-agent/src/services/execution-types.ts` — 양쪽 동일 갱신.

#### (e) provider runner 추출 갱신

`packages/api/src/core/agent/services/claude-api-runner.ts` — Anthropic SDK 응답에서 `response.usage.input_tokens, output_tokens, cache_read_input_tokens` 추출하여 result 객체에 매핑:

```ts
return {
  // ... 기존 필드
  tokensUsed: response.usage?.input_tokens ?? 0,
  outputTokens: response.usage?.output_tokens ?? 0,
  cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
};
```

`packages/fx-agent/src/services/claude-api-runner.ts` 동일 갱신. openrouter-runner도 OpenRouter API의 usage 객체 동일 처리.

#### (f) diagnostic-collector.ts 양쪽 INSERT bind 갱신

```ts
// 변경 후 (record)
`INSERT INTO agent_run_metrics
   (id, session_id, agent_id, status, input_tokens, output_tokens,
    cache_read_tokens, rounds, stop_reason, duration_ms, error_msg,
    started_at, finished_at, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
.bind(id, sessionId, agentId, status,
      result.tokensUsed, result.outputTokens ?? 0, result.cacheReadTokens ?? 0,
      stopReason, durationMs, errorMsg, now, now, now)
```

(g) **TDD Red 새 테스트** — `packages/api/src/__tests__/services/diagnostic-collector-output-tokens.test.ts`:

```ts
it("record() persists output_tokens from result", async () => {
  const result: AgentExecutionResult = {
    status: "success", output: {}, model: "...", duration: 100,
    tokensUsed: 1000, outputTokens: 42, cacheReadTokens: 0,
  };
  await collector.record("session-1", "agent-1", result, 100);
  const row = await db.prepare("SELECT output_tokens FROM agent_run_metrics WHERE session_id='session-1'").first();
  expect(row?.output_tokens).toBe(42);
});
```

### (h) 회귀 검증

- packages/api typecheck PASS
- packages/api lint PASS  
- packages/api vitest GREEN (전체 또는 변경 파일 관련)
- packages/fx-agent typecheck PASS
- packages/fx-agent vitest GREEN

## §3 Phase Exit OBSERVED — Smoke Reality 13항

표면 충족 함정 회피용 numerical 강제. 모든 항목은 PR merge 직전·직후 실측해야 한다.

### F585 트랙 (P-a ~ P-i)

| # | 검증 항목 | 명령 / 측정 | 기대값 |
|---|---------|----------|------|
| **P-a** | services/ 루트 agent 7 files 사라짐 | `find packages/api/src/services -maxdepth 1 -type f \( -name "agent-*.ts" -o -name "prompt-gateway.ts" -o -name "reviewer-agent.ts" -o -name "skill-pipeline-runner.ts" -o -name "task-state*.ts" \) \| wc -l` | **0** |
| **P-b** | core/agent/services/로 7 files 이동 | `find packages/api/src/core/agent/services -type f \( -name "agent-inbox.ts" -o -name "agent-orchestrator.ts" -o -name "prompt-gateway.ts" -o -name "reviewer-agent.ts" -o -name "skill-pipeline-runner.ts" -o -name "task-state-service.ts" -o -name "task-state.ts" \) \| wc -l` | **7** |
| **P-c** | 외부 callers 잔존 import 0건 | `grep -rEn "from.*services/(agent-inbox\|agent-orchestrator\|prompt-gateway\|reviewer-agent\|skill-pipeline-runner\|task-state)" packages/api/src \| grep -v "core/agent/services" \| grep -v "\\./" \| wc -l` | **0** |
| **P-d** | services/ 루트 직속 .ts 파일 = 33 (40 - 7) | `find packages/api/src/services -maxdepth 1 -type f -name "*.ts" \| wc -l` | **33** |
| **P-e** | typecheck + test GREEN (api + fx-agent) | `pnpm -w turbo typecheck test` | exit 0 |
| **P-f** | dual_ai_reviews sprint 332 자동 INSERT | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=332"` | **≥ 1** (누적 ≥ 17건) |
| **P-g** | F560 회귀 0건 + F582 회귀 0건 + F584 회귀 0건 | curl + grep 3-way | 401 + ≥21 + 1 (model-router core 위치) |
| **P-h** | autopilot Match Rate | autopilot 자체 평가 | **≥ 90%** |
| **P-i** | F586과 충돌 0건 (양 트랙 commit 동시 squash) | `git log --oneline sprint/332 \| wc -l` | autopilot 변형 가능 |

### F586 트랙 (P-j ~ P-m)

| # | 검증 항목 | 명령 / 측정 | 기대값 |
|---|---------|----------|------|
| **P-j** | diagnostic-collector.ts 하드코딩 0 제거 | `grep -E "VALUES.*0,\\s*0,\\s*1" packages/api/src/core/agent/services/diagnostic-collector.ts packages/fx-agent/src/services/diagnostic-collector.ts \| wc -l` | **0** (양 패키지 모두 0,0 패턴 사라짐) |
| **P-k** | output_tokens 동적 binding 추가 | `grep -E "outputTokens" packages/api/src/core/agent/services/diagnostic-collector.ts packages/fx-agent/src/services/diagnostic-collector.ts \| wc -l` | **≥ 4** (record + recordGraphResult × 2 packages) |
| **P-l** | TDD Red→Green 새 테스트 PASS | `pnpm -F @foundry-x/api test diagnostic-collector-output-tokens` | exit 0 + 1+ assertion |
| **P-m** | **Production Smoke Reality** — 새 metric 행에서 output_tokens > 0 ≥ 1건 | `wrangler d1 execute foundry-x-db --remote --command "SELECT COUNT(*) FROM agent_run_metrics WHERE output_tokens > 0 AND created_at > 'YYYY-MM-DD'"` | **≥ 1** (운영자 KOAMI Dogfood 1회 후, 별건) |

### 표면 충족 함정 회피 핵심 조항

- **F585 P-a + P-b 동시 충족**: services/ 루트에서 7 files 사라지고 core/agent/services/에 정확히 7개 추가 (단순 git rm 함정 차단)
- **F585 P-c numerical 강제**: 외부 callers 잔존 import 0건 — 18 callers 모두 갱신
- **F586 P-j numerical 강제**: 하드코딩 `VALUES (..., 0, 0, 1, ...)` 패턴 양 패키지에서 0건 (수정 누락 함정 차단)
- **F586 P-l TDD Red 새 테스트**: 단순 grep PASS가 아닌 functional assert (record() → output_tokens 보존 검증)
- **F586 P-m Production Smoke Reality**: P-l unit test PASS는 환경 mock 가능 → production D1 새 행 실측이 ground truth

### 회귀 회피 항목

- **F583 회귀 점검**: `find packages/api/src/services/agent -type f -name "*.ts" \| wc -l = 0` 유지 (Phase 46 100% literal 종결 회귀 차단)
- **agent_run_metrics 회귀 0건**: F582 인프라 가동 유지 (F586 추가 작업으로 인한 INSERT 깨짐 차단)
- **AgentExecutionResult 기존 callers 호환성**: `tokensUsed: number` 필드 유지로 ~10 callers 회귀 0건

## 전제 조건

- F584 ✅ (Sprint 331, PR #715 Match 100%, model-router core/agent/services 이동 완결)
- F583 ✅ (Sprint 330, services/agent 0 도달, Phase 46 100% literal 종결)
- F582 ✅ (Sprint 328, Phase 47 GAP-4 회복, fx-discovery DiagnosticCollector 배선)
- C103 ✅ + C104 ✅ (silent fail layer 1~5 종결, .dev.vars 자동 cp)
- save-dual-review hook 자동 trigger ✅ (sprint 327~331 5 sprint 연속 검증됨)

## 예상 시간

- autopilot 가동: **~1.5~2h** (F585 ~30분 + F586 ~1h, breaking change 회피로 단축)
- Master 가동 + 인터뷰 + Plan 작성: ~25분
- OBSERVED 검증: ~10분 (P-m Production Smoke Reality는 운영자 권한 필요로 별건)
- **총 ~2.5h** (F578 sprint와 유사 규모)

## Risk

- **F585 Low**: F584 16회차 패턴 정착화 + DIFF=NONE 2 / DIFF=YES 5 자동 처리. 회귀만 점검.
- **F586 Medium**: shared 타입 확장 (additive)이라 기존 callers 호환성 유지되지만 ~10 callers 회귀 점검 필수.
- **autopilot 옵션 변형 risk**: 옵션 A vs 옵션 C autopilot 임의 선택 (F583 패턴 동일). semantic acceptable variant로 처리.
- **P-m Production Smoke Reality risk**: 운영자(admin) 권한이 필요한 KOAMI Dogfood 1회 실행 — autopilot이 자체 증명 불가, Master 독립 실측 필수 (rules/development-workflow.md "Autopilot Production Smoke Test" 11회차 패턴).

## 다음 사이클 후보

본 sprint 완결 후:

- **F587 (or backlog)**: services/ 루트의 다른 잔존 33 files 추가 점검 (logger/llm/methodology/pm-skills-*/prd-*/prototype-*/sr-*/work-*/spec-* 등 도메인 분리)
- **Phase 47 GAP-3** (P2 F-track): 27 stale autoTrigger proposals 검토 루프 + TTL 정책
- **모델 A/B 비교** (P3 F-track 실험): Opus 4.7 vs Sonnet 4.6 (autopilot 모델 선택)
- **AI Foundry W18 활동** (별도 PRD 트랙): 시간 민감도 高, 5/15(금) 회의 D-day, 5/22 H1 Red 자동 전환
