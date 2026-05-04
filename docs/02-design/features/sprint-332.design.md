---
id: FX-DSGN-332
sprint: 332
feature: F585 + F586
req: FX-REQ-652, FX-REQ-653
status: approved
date: 2026-05-04
---

# Sprint 332 Design — F585 (services/ 루트 agent 7 cleanup) + F586 (output_tokens=0 fix)

## §1 목표

**F585**: `packages/api/src/services/` 루트 직속 agent 7 files를 `packages/api/src/core/agent/services/`로 git mv. 16 callers import path 갱신.

**F586**: `AgentExecutionResult` 타입에 `outputTokens?: number, cacheReadTokens?: number` 옵션 필드 추가. provider runner에서 usage 추출 + diagnostic-collector INSERT bind 갱신. TDD Red→Green 사이클.

## §2 Architecture Decision

### F585 — 옵션 A (git mv, 16회차 패턴)

`packages/api/src/services/{file}.ts` → `packages/api/src/core/agent/services/{file}.ts`

이유: F579/F581/F583/F584 동일 패턴 16회차 정착화. MSA `core/{domain}/` 룰 복원.

### F586 — 옵션 Additive (non-breaking)

`tokensUsed: number` 기존 필드 유지 + `outputTokens?: number, cacheReadTokens?: number` 옵션 추가. ~10 callers 회귀 0건 보장.

## §3 변경 파일 매핑 (D1 주입 사이트 전수)

### F585 이동 대상 (7 files)

| 소스 | 목적지 |
|------|------|
| `packages/api/src/services/agent-inbox.ts` | `packages/api/src/core/agent/services/agent-inbox.ts` |
| `packages/api/src/services/agent-orchestrator.ts` | `packages/api/src/core/agent/services/agent-orchestrator.ts` |
| `packages/api/src/services/prompt-gateway.ts` | `packages/api/src/core/agent/services/prompt-gateway.ts` |
| `packages/api/src/services/reviewer-agent.ts` | `packages/api/src/core/agent/services/reviewer-agent.ts` |
| `packages/api/src/services/skill-pipeline-runner.ts` | `packages/api/src/core/agent/services/skill-pipeline-runner.ts` |
| `packages/api/src/services/task-state-service.ts` | `packages/api/src/core/agent/services/task-state-service.ts` |
| `packages/api/src/services/task-state.ts` | `packages/api/src/core/agent/services/task-state.ts` |

### F585 callers import path 갱신 (16 files)

| 파일 | 기존 | 갱신 후 |
|------|------|------|
| `core/shaping/services/bmc-agent.ts:4` | `../../../services/prompt-gateway.js` | `../../agent/services/prompt-gateway.js` |
| `core/discovery/routes/discovery-pipeline.ts:19` | `../../../services/skill-pipeline-runner.js` | `../../agent/services/skill-pipeline-runner.js` |
| `core/shaping/services/bd-skill-executor.ts:7` | `../../../services/prompt-gateway.js` | `../../agent/services/prompt-gateway.js` |
| `core/harness/services/transition-trigger.ts:9` | `../../../services/task-state-service.js` | `../../agent/services/task-state-service.js` |
| `core/harness/services/auto-rebase.ts:3` | `../../../services/agent-inbox.js` | `../../agent/services/agent-inbox.js` |
| `core/shaping/services/bmc-insight-service.ts:4` | `../../../services/prompt-gateway.js` | `../../agent/services/prompt-gateway.js` |
| `__tests__/transition-trigger.test.ts:7` | `../services/task-state-service.js` | `../core/agent/services/task-state-service.js` |
| `core/collection/services/insight-agent-service.ts:4` | `../../../services/prompt-gateway.js` | `../../agent/services/prompt-gateway.js` |
| `modules/portal/services/github-review.ts:2` | `../../../services/reviewer-agent.js` | `../../../core/agent/services/reviewer-agent.js` |
| `modules/portal/routes/github.ts:5` | `../../../services/reviewer-agent.js` | `../../../core/agent/services/reviewer-agent.js` |
| `__tests__/skill-pipeline-runner.test.ts:3` | `../services/skill-pipeline-runner.js` | `../core/agent/services/skill-pipeline-runner.js` |
| `__tests__/task-state-service.test.ts:5` | `../services/task-state-service.js` | `../core/agent/services/task-state-service.js` |
| `__tests__/task-state-service.test.ts:7` | `../services/task-state.js` | `../core/agent/services/task-state.js` |
| `modules/portal/routes/inbox.ts:2` | `../../../services/agent-inbox.js` | `../../../core/agent/services/agent-inbox.js` |
| `modules/portal/routes/webhook.ts:8` | `../../../services/reviewer-agent.js` | `../../../core/agent/services/reviewer-agent.js` |
| `middleware/constraint-guard.ts:2` | `../services/agent-orchestrator.js` | `../core/agent/services/agent-orchestrator.js` |

### F586 수정 파일

| 파일 | 변경 내용 |
|------|------|
| `packages/api/src/core/agent/services/execution-types.ts` | `outputTokens?: number, cacheReadTokens?: number` 추가 |
| `packages/fx-agent/src/services/execution-types.ts` | 동일 갱신 |
| `packages/api/src/core/agent/services/claude-api-runner.ts` | usage 추출 + result 매핑 |
| `packages/fx-agent/src/services/claude-api-runner.ts` | 동일 갱신 |
| `packages/api/src/core/agent/services/openrouter-runner.ts` | usage 추출 + result 매핑 |
| `packages/fx-agent/src/services/openrouter-runner.ts` | 동일 갱신 (존재 시) |
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | INSERT bind 갱신 (record + recordGraphResult) |
| `packages/fx-agent/src/services/diagnostic-collector.ts` | 동일 갱신 |
| `packages/api/src/__tests__/services/diagnostic-collector-output-tokens.test.ts` | TDD Red 신규 테스트 |

## §4 TDD Red Target (F586)

```ts
// diagnostic-collector-output-tokens.test.ts
it("record() persists output_tokens from result", async () => {
  const result: AgentExecutionResult = {
    status: "success", output: {}, model: "claude-3-5-sonnet",
    duration: 100, tokensUsed: 1000,
    outputTokens: 42, cacheReadTokens: 5,
  };
  await collector.record("session-1", "agent-1", result, 100);
  const row = await db.prepare(
    "SELECT output_tokens, cache_read_tokens FROM agent_run_metrics WHERE session_id='session-1'"
  ).first();
  expect(row?.output_tokens).toBe(42);
  expect(row?.cache_read_tokens).toBe(5);
});
```

## §5 OBSERVED Checklist (P-a ~ P-m)

Plan §3 Phase Exit OBSERVED 13항과 동일. Design Exit 기준:
- D1: §3 파일 매핑 전수 명시 ✅
- D2: callers 16건 갱신 경로 명시 ✅  
- D3: breaking change 없음 (additive) ✅
- D4: TDD Red target 명시 ✅
