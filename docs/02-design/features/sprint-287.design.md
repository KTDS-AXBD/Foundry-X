---
id: sprint-287
title: "F534 DiagnosticCollector 실행 경로 훅 삽입"
sprint: 287
f_items: [F534]
status: in_progress
created_at: 2026-04-14
---

# Sprint 287 Design — F534 DiagnosticCollector 실행 경로 훅 삽입

## §1 컨텍스트

**현재 문제**: Discovery 단계 실행이 비스트리밍 경로(`runner.execute()`)를 통해 이루어지지만
`AgentMetricsService`와 연결이 없어 `agent_run_metrics` 테이블에 기록이 안 됨.

**해결 방향**: `DiagnosticCollector`에 `record()` 메서드를 추가해 훅 삽입의 단일 진입점으로 만들고,
두 실행 경로 (`StageRunnerService`, `OrchestrationLoop`) 에 각각 삽입한다.

## §2 DiagnosticCollector.record() 메서드 설계

### 메서드 시그니처

```typescript
/**
 * LLM 실행 결과를 agent_run_metrics에 기록한다.
 * AgentMetricsService를 직접 사용하지 않는 실행 경로(비스트리밍)를 위한 훅 진입점.
 */
async record(
  sessionId: string,
  agentId: string,
  result: AgentExecutionResult,
  durationMs: number,
): Promise<void>
```

### 내부 구현 흐름

```
AgentExecutionResult.status → "success"/"partial" → INSERT completed
                             → "failed"            → INSERT failed
agent_run_metrics 직접 INSERT (AgentMetricsService 내부 의존하지 않음)
  - id: randomUUID()
  - session_id: sessionId
  - agent_id: agentId
  - status: "completed" | "failed"
  - input_tokens: result.tokensUsed (총합, 세분화 불가)
  - output_tokens: 0 (분리 불가 — tokensUsed는 합산값)
  - rounds: 1 (단일 호출)
  - stop_reason: result.status === "success" ? "end_turn" : "error"
  - duration_ms: durationMs
  - error_msg: status === "failed" ? result.output?.analysis : null
  - started_at: isoNow() (정확한 시각 대신 완료 시각 사용)
  - finished_at: isoNow()
  - created_at: isoNow()
```

> **설계 선택**: `AgentExecutionResult.tokensUsed`는 `input + output`의 합산값이라
> `input_tokens`에 전체를 기록하고 `output_tokens=0`으로 처리.
> 향후 `AgentExecutionResult`에 `inputTokens`/`outputTokens` 분리 필드 추가 시 개선 가능.

## §3 StageRunnerService 훅 삽입

### 변경 위치: `packages/api/src/core/discovery/services/stage-runner-service.ts`

```typescript
// Constructor 변경 — DiagnosticCollector 옵션 주입
constructor(
  private db: D1Database,
  private runner: AgentRunner,
  private diagnostics?: DiagnosticCollector,  // 추가 (optional — 기존 호출 호환)
) {}
```

### runStage() 변경 포인트

```
Line 160: const aiResult = await this.runner.execute(request);
  ↓ 추가
Line ~161: 실행 완료 후 this.diagnostics?.record(taskId, agentId, aiResult, duration) 호출
```

### sessionId 전략

`taskId = stage-${stage}-${bizItemId}`를 sessionId로 사용.
별도 sessionId 파라미터 추가 없이 기존 시그니처 유지.

## §4 OrchestrationLoop graph 분기 훅 삽입

### 변경 위치: `packages/api/src/core/agent/services/orchestration-loop.ts`

graph 분기 (`graphDiscovery && graphRunner`) 실행 후 결과 기록:

```typescript
// F531 graph 분기
const graphSvc = new DiscoveryGraphService(extended.graphRunner, this.db, params.taskId, extended.graphApiKey);
const graphResult = await graphSvc.runAll(extended.graphDiscovery);
// F534: 실행 결과 메트릭 기록
await this.diagnostics?.recordGraphResult(params.taskId, graphResult);
return { status: "resolved", ... };
```

`DiagnosticCollector`에 `recordGraphResult()` 추가:
- `GraphRunResult`에서 executedNodeCount, durationMs 등 추출
- summary 행 INSERT (session_id = taskId, agent_id = "discovery-graph")

## §5 파일 매핑 (TDD 대상)

| 파일 | 변경 유형 | 테스트 파일 |
|------|----------|------------|
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | record() + recordGraphResult() 추가 | `packages/api/src/__tests__/diagnostic-collector.test.ts` (신규) |
| `packages/api/src/core/discovery/services/stage-runner-service.ts` | constructor + runStage() 훅 | `packages/api/src/__tests__/stage-runner-metrics.test.ts` (신규) |
| `packages/api/src/core/agent/services/orchestration-loop.ts` | graph 분기 훅 | 기존 테스트 확인 |

## §6 테스트 계약 (TDD Red Target)

### diagnostic-collector.test.ts

```typescript
describe("DiagnosticCollector.record() — F534", () => {
  it("성공 결과를 agent_run_metrics에 INSERT한다", async () => {
    const result: AgentExecutionResult = {
      status: "success", output: { analysis: "ok" }, tokensUsed: 123, model: "test", duration: 456
    };
    await collector.record("sess-1", "agent-1", result, 456);
    const row = db.prepare("SELECT * FROM agent_run_metrics WHERE session_id='sess-1'").get();
    expect(row.status).toBe("completed");
    expect(row.input_tokens).toBe(123);
    expect(row.duration_ms).toBe(456);
  });

  it("실패 결과를 status=failed로 INSERT한다", async () => {
    const result: AgentExecutionResult = {
      status: "failed", output: { analysis: "err" }, tokensUsed: 0, model: "test", duration: 100
    };
    await collector.record("sess-2", "agent-1", result, 100);
    const row = db.prepare("SELECT * FROM agent_run_metrics WHERE session_id='sess-2'").get();
    expect(row.status).toBe("failed");
    expect(row.error_msg).toBe("err");
  });

  it("record() 후 collect()가 rawValue > 0인 축을 반환한다", async () => {
    // record를 먼저 호출하여 데이터 삽입 후 collect
    const report = await collector.collect("sess-1", "agent-1");
    const nonZero = report.scores.filter(s => s.rawValue > 0);
    expect(nonZero.length).toBeGreaterThanOrEqual(1);
  });
});
```

### stage-runner-metrics.test.ts

```typescript
describe("StageRunnerService 메트릭 기록 — F534", () => {
  it("runStage() 완료 후 agent_run_metrics에 1건 이상 INSERT된다", async () => {
    const service = new StageRunnerService(db, mockRunner, new DiagnosticCollector(db));
    await service.runStage("biz-1", "org-1", "2-1", null);
    const rows = db.prepare("SELECT * FROM agent_run_metrics").all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("DiagnosticCollector 미주입 시 기존 동작 유지 (메트릭 없이 실행)", async () => {
    const service = new StageRunnerService(db, mockRunner); // diagnostics 없음
    await expect(service.runStage("biz-1", "org-1", "2-1", null)).resolves.toBeDefined();
  });
});
```
