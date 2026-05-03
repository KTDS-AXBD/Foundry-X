---
id: FX-DESIGN-328
sprint: 328
feature: F582
req: FX-REQ-648
status: approved
date: 2026-05-03
---

# Sprint 328 Design — F582: GAP-4 Discovery 인프라 회복 (Option C)

## §1 문제 요약

F560(Sprint 312, 4월 22일경) Pipeline/Stages fx-discovery 이관 이후:
- fx-gateway `app.post("/api/biz-items/:id/discovery-stage")` → fx-discovery → `DiscoveryStageService.updateStage()` (DiagnosticCollector 0건)
- 이전에는 이 경로가 main-api `discoveryStageRunnerRoute`를 통해 DiagnosticCollector를 호출함
- 결과: `agent_run_metrics` / `agent_improvement_proposals` 신규 기록 0건 (12일 stale)

## §2 옵션 C 설계 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| DiagnosticCollector | fx-discovery 내부 신규 작성 | D1 `foundry-x-db` 공유, MSA 원칙 보존 |
| autoTriggerMetaAgent | fx-discovery에 standalone 구현 복사 (C-1) | fx-agent stub에 이미 단순화된 standalone 버전 존재, service binding 불필요 |
| fx-gateway 라우팅 | 변경 없음 | F560 회귀 방지 |
| main-api discoveryStageRunnerRoute | 변경 없음 | graph 실행 경로 유지 |

## §3 신규 파일

### `packages/fx-discovery/src/services/diagnostic-collector.ts` (신규)
- DiagnosticCollector 클래스 — `record(sessionId, agentId, status, tokensUsed, durationMs)` 단순화 시그니처
- INSERT INTO `agent_run_metrics` — `foundry-x-db`의 기존 스키마 공유
- `crypto.randomUUID()` 사용 (nodejs_compat)

### `packages/fx-discovery/src/services/auto-trigger-meta-agent.ts` (신규)
- `autoTriggerMetaAgent(db, sessionId, apiKey, bizItemId?, metaAgentModel?)` — fx-agent stub과 동일 시그니처
- `agent_run_metrics` → overallScore 계산 → Anthropic API fetch → `agent_improvement_proposals` INSERT
- fire-and-forget 패턴 (호출처 `.catch()` 처리)

## §4 수정 파일

### `packages/fx-discovery/src/routes/discovery-stages.ts` (수정)
- POST `/biz-items/:id/discovery-stage` 핸들러:
  1. `updateStage()` 호출 후 `DiagnosticCollector.record()` 호출
     - `sessionId = "stage-{parsed.data.stage}-{bizItemId}"`
     - `agentId = "discovery-stage-runner"`
     - `status = parsed.data.status === "completed" ? "success" : "success"` (항상 success)
     - `tokensUsed = 0`, `durationMs = 0` (수동 업데이트)
  2. `autoTriggerMetaAgent()` fire-and-forget (status=completed 시에만, ANTHROPIC_API_KEY 있을 때)
     - `sessionId = "stage-{stage}-{bizItemId}"`
     - `bizItemId` 전달

### `packages/fx-discovery/src/__tests__/discovery-stages.test.ts` (수정)
- `DiagnosticCollector.record` mock 추가
- `POST /discovery-stage status=completed` → record 1회 호출 검증 (TDD Red)
- `autoTriggerMetaAgent` 참조 검증 (grep으로 P-c 충족)

## §5 파일 매핑 (D1 체크리스트)

| 파일 | 변경 종류 | D1 migration |
|------|----------|-------------|
| `packages/fx-discovery/src/services/diagnostic-collector.ts` | 신규 | 없음 (기존 테이블 사용) |
| `packages/fx-discovery/src/services/auto-trigger-meta-agent.ts` | 신규 | 없음 |
| `packages/fx-discovery/src/routes/discovery-stages.ts` | 수정 | 없음 |
| `packages/fx-discovery/src/__tests__/discovery-stages.test.ts` | 수정 | 없음 |
| `packages/fx-gateway/src/app.ts` | **변경 없음** | — |
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | **변경 없음** | — |

> **D1 migration 없음**: 기존 `agent_run_metrics` + `agent_improvement_proposals` 테이블 재사용.
> `foundry-x-db` 공유 (fx-discovery wrangler.toml `DB` binding).

## §6 TDD Red Target

```typescript
// discovery-stages.test.ts 추가 테스트
it("POST /discovery-stage status=completed → DiagnosticCollector.record 1회 호출", async () => {
  // record mock setup
  // POST { stage: "2-1", status: "completed" }
  // expect(mockRecord).toHaveBeenCalledOnce()
  // expect(mockRecord.mock.calls[0][0]).toBe("stage-2-1-item-001") // sessionId
});
```

## §7 Plan §3 OBSERVED P-a~P-h 매핑

| Plan 항목 | Design 대응 |
|-----------|-----------|
| P-b: DiagnosticCollector ≥ 1 | `diagnostic-collector.ts` 신규 생성 → grep ≥ 1 |
| P-c: autoTriggerMetaAgent ≥ 1 | `auto-trigger-meta-agent.ts` 신규 + routes 참조 |
| P-g: typecheck GREEN | 새 파일 타입 충돌 없음 |
| P-f: F560 회귀 0건 | fx-gateway/main-api 변경 없음 |
| P-d: Dogfood Smoke Reality | 구현 후 수동 검증 |
| P-e: dual_ai_reviews ≥ 1 | C103+C104 hook 자동 |
