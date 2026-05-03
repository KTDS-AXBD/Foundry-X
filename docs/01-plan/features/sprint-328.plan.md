---
id: FX-PLAN-328
sprint: 328
feature: F582
req: FX-REQ-648
status: approved
date: 2026-05-03
---

# Sprint 328 Plan — F582: GAP-4 Discovery 인프라 회복 + DiagnosticCollector trigger 경로 fix (옵션 C)

## 목표

**F553 4주 회고 GAP-4 후속.** S319 진단으로 본질 재정의: "DiagnosticCollector 배선 누락"이 아니라 **"F560(Sprint 312, 4월 22일경) Pipeline/Stages fx-discovery 이관 후 stage 경로가 main-api `discoveryStageRunnerRoute`(DiagnosticCollector 4 위치 + autoTriggerMetaAgent trigger)를 우회하면서 metrics record가 끊김"**. KOAMI Dogfood 인프라가 12일+ stop된 직접 원인.

**옵션 C 채택**: graph 경로는 main-api 유지(이미 wired), stage 경로는 fx-discovery 측에 DiagnosticCollector + autoTriggerMetaAgent 추가. MSA 원칙 보존, F560 회귀 0건 보장.

## 사전 측정 (S319, 2026-05-03)

### Production D1 실측

| 테이블 | 건수 | 마지막 활동 | 진단 |
|--------|------|------------|------|
| graph_sessions | 10 | **2026-04-21T00:34:29Z** | 12일 stale |
| biz_items | 11 | **2026-04-21T00:24:52Z** | 12일 stale |
| agent_run_metrics | 116 | **2026-04-21T00:38:00Z** | 12일 stale |
| agent_improvement_proposals | 27 | **2026-04-21T00:38:18Z** | 12일 stale |
| agent_sessions | **0** | — | empty (별건, F582 범위 외) |
| dual_ai_reviews | 8 | **2026-05-03T13:04:47Z** | 오늘 활성 ✅ (C103+C104 효과) |

> **시간 일치 패턴**: 모든 4 테이블이 4월 21일 stop ≡ F560 Sprint 312(4월 22일경) 이관 직전 마지막 데이터.

### 코드 grep 측정

- DiagnosticCollector 배선 위치: 9곳 ✅
  - `packages/api/src/core/discovery/routes/discovery-stage-runner.ts:34/107/139/170/213` (4 + 1 = 5곳)
  - `packages/api/src/services/agent/graphs/discovery-graph.ts:39`
  - `packages/fx-agent/src/services/orchestration-loop.ts:37`
  - `packages/fx-agent/src/routes/meta.ts:44`
  - `packages/fx-agent/src/orchestration/graphs/discovery-graph.ts:39`

- **fx-discovery `DiscoveryStageService` 측 DiagnosticCollector 호출 = 0건** ❌
  - `packages/fx-discovery/src/services/discovery-stage.service.ts` 자체 service, collector 미사용
  - `packages/fx-discovery/src/routes/discovery-stages.ts` `POST /biz-items/:id/discovery-stage` collector 미호출

- autoTriggerMetaAgent: `packages/api/src/core/discovery/routes/discovery-stage-runner.ts:27, 274` (main-api에만 정의, fx-discovery에는 0건)

- Routing 경로:
  - fx-gateway `app.ts:57` `app.post("/api/biz-items/:id/discovery-stage", c => c.env.DISCOVERY.fetch())` → fx-discovery
  - main-api `app.ts:202` `app.route("/api", discoveryStageRunnerRoute)` (collector wired) — fx-gateway에서 catch-all로만 도달

## 범위 (옵션 C)

### (a) Routing 실차 점검

```bash
# fx-discovery 도달 확증
curl -X POST -H "Authorization: Bearer $JWT" \
  "https://foundry-x-api.ktds-axbd.workers.dev/api/biz-items/{id}/discovery-stage" \
  --data '{"stageId":"STAGE_2","status":"in_progress"}' &
PID=$!
wrangler tail foundry-x-api --format pretty &
TAIL=$!
sleep 30
kill $PID $TAIL
# 기대: fx-discovery `discoveryStagesRoute` 핸들러 도달, main-api `discoveryStageRunnerRoute` 미도달
```

### (b) fx-discovery `DiscoveryStageService`에 DiagnosticCollector 통합

- `packages/fx-discovery/src/services/discovery-stage.service.ts`:
  - `import { DiagnosticCollector } from "?"` — fx-discovery 내부 신규 추가 OR fx-agent service binding 결정
  - `runStage()` 또는 `updateStage()` 직후 `await collector.record(sessionId, agentId, result, durationMs)` 호출
- 결정: **fx-discovery 내부 DiagnosticCollector 신규 작성 (fx-agent와 분리)** — D1 binding 동일 (`foundry-x-db`), agent_run_metrics table 공유
- 또는 **fx-agent service binding** 사용: fx-discovery `wrangler.toml`에 `services = [{binding="AGENT", service="fx-agent"}]` 추가 → fx-agent 측 collector route 호출

### (c) autoTriggerMetaAgent fx-discovery 측 이전 또는 service binding

- 현재 main-api 전용 → fx-discovery에서 호출 불가
- 옵션 C-1: fx-discovery에 동일 함수 이전 + Anthropic API key env 주입
- 옵션 C-2: fx-discovery → fx-agent service binding으로 `POST /api/internal/meta-trigger` 호출 (fx-agent에 신규 internal route 추가 필요)

### (d) main-api `discoveryStageRunnerRoute` 유지

- graph 경로(별도 endpoint)는 변경 없음
- fx-gateway catch-all 라우팅 유지

### (e) typecheck + lint + tests 회귀 GREEN

- turbo 19/19 PASS
- ~3091 tests (api) + ~780 tests (fx-agent) + fx-discovery tests
- F560 회귀 0건 — fx-discovery 기존 7 routes 200 응답 유지

### (f) Production 1회 KOAMI Dogfood 수동 실행 (Smoke Reality)

- production curl로 stage 진행 1회 실행
- D1에서 `graph_sessions+1` / `biz_items` 변화 / `agent_run_metrics+1` / `agent_improvement_proposals+1` (또는 condition met) 자동 발생 검증
- `wrangler tail` 30s error 0건

## §3 OBSERVED P-a~P-h Numerical 강제 (autopilot 표면 충족 함정 14회차 회피)

| ID | 항목 | OBSERVED 측정 명령 | PASS 조건 |
|----|------|-------------------|-----------|
| P-a | Routing 실측 분기 확증 | `curl POST /api/biz-items/test/discovery-stage` + `wrangler tail` 30s | fx-discovery `discoveryStagesRoute` 도달 로그 ≥ 1, main-api `discoveryStageRunnerRoute` 도달 로그 = 0 |
| P-b | fx-discovery DiagnosticCollector 호출 추가 | `grep -rn "DiagnosticCollector\|collector\.record" packages/fx-discovery/src/` | ≥ 1 (sprint 시작 시 0) |
| P-c | autoTriggerMetaAgent fx-discovery 경로 | `grep -rn "autoTriggerMetaAgent\|meta-trigger" packages/fx-discovery/src/` 또는 fx-agent service binding `wrangler.toml` `AGENT` 추가 | ≥ 1 |
| P-d | Production 수동 KOAMI Dogfood Smoke Reality | curl POST stage + `wrangler d1 execute --command="SELECT COUNT(*) FROM agent_run_metrics WHERE created_at > '2026-05-03T14:00Z'"` | ≥ 1건 (sprint 종료 시점 신규 record) |
| P-e | dual_ai_reviews 자동 INSERT (sprint 328) | `wrangler d1 execute --command="SELECT COUNT(*) FROM dual_ai_reviews WHERE sprint_id=328"` | ≥ 1 (누적 ≥ 9) |
| P-f | F560 회귀 0건 | fx-discovery 기존 7 routes 200 응답 (`for r in biz-items biz-items/{id} biz-items/{id}/discovery-progress biz-items/{id}/discovery-stage discovery-pipeline/runs discovery-pipeline/runs/{id} ax-bd/discovery-reports; do curl -I; done`) | 모두 200 또는 401 (인증 필요 정상) |
| P-g | typecheck + lint + tests GREEN | `turbo typecheck && turbo lint && turbo test` | turbo 19/19, tests fail = 0 |
| P-h | wrangler tail error rate | `wrangler tail foundry-x-api --format pretty` 30s + `wrangler tail fx-discovery` 30s | error 0건 |

> **자동 INSERT 검증 핵심**: P-d Production Smoke Reality는 manual curl 1회로도 충분. P-e dual_ai_reviews는 sprint 종료 hook이 자동 trigger. autopilot이 "측정 안 함"으로 임의 skip 못 하도록 Plan에 측정 명령 명시.

## 파일 매핑

| 파일 | 변경 |
|------|------|
| `packages/fx-discovery/src/services/diagnostic-collector.ts` | 신규 (또는 fx-agent service binding 채택 시 skip) |
| `packages/fx-discovery/src/services/discovery-stage.service.ts` | DiagnosticCollector 호출 추가 |
| `packages/fx-discovery/src/routes/discovery-stages.ts` | autoTriggerMetaAgent 호출 추가 (옵션 C-1) 또는 service binding 호출 (C-2) |
| `packages/fx-discovery/wrangler.toml` | (옵션 C-2 시) services binding `AGENT` 추가 |
| `packages/fx-discovery/src/env.ts` | (옵션 C-2 시) `AGENT: Service` 추가 |
| `packages/fx-discovery/src/__tests__/discovery-stages.test.ts` | DiagnosticCollector 호출 검증 + 회귀 |
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | **변경 없음** (main-api graph 경로 유지) |
| `packages/fx-gateway/src/app.ts` | **변경 없음** (catch-all 라우팅 유지) |

## 위험 / Rollback

- **위험 1**: fx-discovery에 `autoTriggerMetaAgent` 이전 시 Anthropic API key env 주입 필요 → C100 secret matrix 영향 (별건)
- **위험 2**: fx-discovery DiagnosticCollector 동시 INSERT 시 main-api graph 경로와 race condition 가능성 — autoTrigger의 `collectByBizItem`이 두 경로에서 동일 bizItemId로 record되면 dup 발생 가능. design 시점에 dedup 로직 검토
- **Rollback**: fx-discovery 코드 변경만이라 단일 PR revert로 즉시 원복 가능. F560 분리는 유지

## 사전 조건

- F580 ✅ (Phase 46 진정 종결 마지막 한 걸음 완료)
- C103+C104 ✅ (silent fail layer 1~4 종결, dual_ai_reviews 자동 trigger 검증)
- F560 fx-discovery 분리 ✅ (rollback 안 함)

## 일정

- **autopilot 예상**: 2~3시간
- **WT**: `bash -i -c "sprint 328"` → `ccs --model sonnet` → `/ax:sprint-autopilot`
- **Plan §3 OBSERVED P-a~P-h numerical 강제**가 표면 충족 함정 14회차 회피 무기

## 후속 (deferred)

- agent_sessions table 0건 진단 (F510 추적 인프라 가동 여부) — F583 또는 backlog C-track 별건
- C100 fx-modules secret matrix + autopilot Phase Exit P1 — 잔존 OPEN 항목, F582 종료 후 별건 처리
- F581 services/agent iii 16 files (Phase 46 100% 종결 마지막) — F582와 독립 진행 가능

## Insight

- **GAP-4의 실 본질 = Strangler 분리 부수효과**: F560 fx-discovery 이관이 collector 배선이 있는 main-api 경로를 우회하면서 metrics 끊김. 이는 코드 결함이 아니라 **MSA 분리 시 cross-cutting concern(metrics, telemetry, audit)의 도메인 분산 전략 미정의** 패턴.
- **재발 방지 권고 (별건)**: 향후 MSA 분리 시 cross-cutting concern 체크리스트 강제 — DiagnosticCollector / AuditLogger / TraceCollector 등의 도메인별 호출 위치 확증.
- **F553 회고 GAP-4 P1 → F582로 정의 명확화**: 단순 "DiagnosticCollector 배선" → "Strangler 분리로 끊긴 metrics 경로 도메인 측 회복".
