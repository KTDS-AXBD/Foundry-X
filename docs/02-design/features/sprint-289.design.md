---
id: FX-DESIGN-289
title: Sprint 289 Design — F536 MetaAgent 자동 진단 훅
sprint: 289
f_items: [F536]
status: done
created: 2026-04-14
---

# Sprint 289 Design — F536 MetaAgent 자동 진단 훅

## §1 요구사항 매핑

| REQ | 내용 | 구현 |
|-----|------|------|
| FX-REQ-566-1 | Graph 실행 완료 시 자동 진단 트리거 | discovery-stage-runner.ts run-all 핸들러 후처리 |
| FX-REQ-566-2 | OrchestrationLoop graphDiscovery 분기에도 훅 | OrchestrationLoop + MetaAgentHook |
| FX-REQ-566-3 | score < 70 미달 축만 proposal 생성 | MetaAgent.diagnose() 기존 로직 재사용 |
| FX-REQ-566-4 | proposal 자동 저장 | MetaApprovalService.save() 루프 |

## §2 아키텍처

```
POST /biz-items/:id/discovery-graph/run-all
  ↓ DiscoveryGraphService.runAll()
  ↓ DiagnosticCollector.recordGraphResult()  [F534 기존]
  ↓ [F536 신규] autoTriggerMetaAgent()
      ├─ DiagnosticCollector.collect(sessionId, 'discovery-graph')
      ├─ MetaAgent.diagnose(report)
      └─ MetaApprovalService.save(proposal) × N

OrchestrationLoop.run() — graphDiscovery 분기
  ↓ graphSvc.runAll()
  ↓ diagnostics.recordGraphResult()          [F534 기존]
  ↓ [F536 신규] metaHook?.trigger(sessionId, 'discovery-graph')
```

## §3 테스트 계약 (TDD Red Target)

### 파일: `packages/api/src/__tests__/services/meta-agent-auto-trigger.test.ts`

```
describe('F536: MetaAgent 자동 진단 훅')
  ✓ autoTriggerMetaAgent — score < 70 시 proposal 저장
  ✓ autoTriggerMetaAgent — 전축 score >= 70 시 저장 없음 (빈 배열)
  ✓ autoTriggerMetaAgent — MetaAgent API 실패 시 에러 전파 안 함 (fire-and-forget 옵션)
  ✓ OrchestrationLoop — MetaAgentHook 제공 시 graphDiscovery 분기 완료 후 호출
  ✓ OrchestrationLoop — MetaAgentHook 미제공 시 에러 없음 (backward compat)
```

## §4 변경 파일 목록

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/api/src/__tests__/services/meta-agent-auto-trigger.test.ts` | 신규 | TDD Red 테스트 |
| 2 | `packages/api/src/core/agent/services/orchestration-loop.ts` | 수정 | MetaAgentHook 옵셔널 추가 |
| 3 | `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | 수정 | run-all 후 autoTrigger 호출 |

## §5 Worker 파일 매핑

단일 구현 (Worker 없음 — Claude 직접)

| 파일 | 작업 |
|------|------|
| `meta-agent-auto-trigger.test.ts` | F536 TDD Red 테스트 5개 작성 |
| `orchestration-loop.ts` | MetaAgentHook 인터페이스 + constructor 파라미터 추가 |
| `discovery-stage-runner.ts` | run-all 핸들러에 autoTriggerMetaAgent() fire-and-forget |

## §6 MetaAgentHook 인터페이스

```typescript
/** F536: MetaAgent 자동 진단 훅 — OrchestrationLoop 생성자 옵셔널 */
export interface MetaAgentHook {
  trigger(sessionId: string, agentId: string): Promise<void>;
}
```

`trigger()`는 내부에서:
1. `DiagnosticCollector.collect(sessionId, agentId)`
2. `MetaAgent.diagnose(report)`
3. 제안이 있으면 `MetaApprovalService.save()` × N

## §7 fire-and-forget 전략

Graph 실행 응답 시간에 영향 주지 않도록 `void trigger()` 호출.
실패 시 `console.error`로 로그만 남기고 사용자 응답에는 영향 없음.

```typescript
// discovery-stage-runner.ts run-all 핸들러
void autoTriggerMetaAgent(db, sessionId, apiKey).catch((e) =>
  console.error('[F536] MetaAgent auto-trigger failed:', e)
);
return c.json({ sessionId, status: 'completed', result });
```

## §8 autoTriggerMetaAgent 함수 시그니처

```typescript
// packages/api/src/core/discovery/routes/discovery-stage-runner.ts

async function autoTriggerMetaAgent(
  db: D1Database,
  sessionId: string,
  apiKey: string,
): Promise<void>
```

내부에서 DiagnosticCollector, MetaAgent, MetaApprovalService 생성·실행.

## §9 D1 Migration

불필요 — `agent_improvement_proposals` 테이블은 F530(0133)에서 기생성.

## §10 Gap 분석 기준

| 항목 | 기준 |
|------|------|
| autoTriggerMetaAgent 함수 존재 | ✅ |
| OrchestrationLoop MetaAgentHook 파라미터 | ✅ |
| discovery-stage-runner run-all fire-and-forget | ✅ |
| TDD 테스트 5개 PASS | ✅ |
