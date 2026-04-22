---
id: sprint-316-plan
type: plan
sprint: 316
features: [F567, F568]
phase: 45
status: in_progress
created: 2026-04-22
---

# Sprint 316 Plan — F567 Multi-hop latency + F568 EventBus PoC

## 목표

Phase 45 Gap 9+10 해소.
- **F567**: 3-hop 누적 latency 실측 → SLO p95 < 300ms 확정
- **F568**: EventBus 기술스택 선정(D1/Queue/DO) + Discovery→Shaping 1 flow PoC 구현

## 선행 충족 확인

| 선행 | 상태 | 근거 |
|------|------|------|
| F562 shared-contracts | ✅ MERGED | PR #656, `packages/shared-contracts/` 존재 |
| F569 harness-kit EventBus client | ✅ MERGED (partial) | PR #673, `packages/harness-kit/src/events/d1-bus.ts` 존재 |
| domain_events D1 table | ✅ 존재 | `packages/api/src/db/migrations/0114_domain_events.sql` + 0115 확장 |
| fx-discovery DB binding | ✅ 확인 | `packages/fx-discovery/src/env.ts` — `DB: D1Database` |
| fx-shaping DB binding | ✅ 확인 | `packages/fx-shaping/wrangler.toml` — `DB = foundry-x-db` |

## F567 — Multi-hop latency benchmark (FX-REQ-610)

### 범위

| 항목 | 내용 |
|------|------|
| (a) | k6 benchmark script — browser→gateway→discovery 3-hop 경로 |
| (b) | p50/p95/p99 측정 + 1-hop 대비 overhead 산출 |
| (c) | SLO p95 < 300ms 확정 + 미달 시 최적화 플랜 |
| (d) | 결과 리포트 `docs/dogfood/sprint-316-latency.md` |

### 아키텍처

```
실제 3-hop 경로:
  Browser (HTTP) → fx-gateway Worker → (Service Binding) → fx-discovery Worker → D1

2-hop (gateway 없이 직접):
  Browser (HTTP) → fx-discovery Worker → D1

1-hop baseline (F543):
  Service Binding 직접 호출 → +10~14ms per hop
```

### 측정 엔드포인트

- Primary: `GET /api/biz-items` (via fx-gateway → DISCOVERY binding)
- Baseline: `GET /api/biz-items` (fx-discovery 직접)
- 비교: Service Binding hop 당 overhead

### 배포 엔드포인트

- fx-gateway: `https://fx-gateway.ktds-axbd.workers.dev`
- fx-discovery: `https://fx-discovery.ktds-axbd.workers.dev` (직접 접근용)

## F568 — EventBus PoC (FX-REQ-611)

### 범위

| 항목 | 내용 |
|------|------|
| (a) | D1 Event Table vs Cloudflare Queue vs Durable Object PoC 3종 비교 |
| (b) | 기술스택 최종 선정 + `docs/specs/fx-eventbus/decision.md` |
| (c) | Discovery→Shaping 트리거 1 flow 구현 |
| (d) | 타임박스 2주 고정, PoC 범위 제한 |

### Flow 설계

```
POST /api/biz-items/:id/discovery-stage
  → DiscoveryStageService.updateStage()
  → StagePublisher.publishIfComplete()
  → D1EventBus.publish(biz-item.stage-changed)
  → domain_events table (status=pending)

Polling (Cron Trigger or manual):
  → DiscoveryTrigger.poll()
  → D1EventBus.poll()
  → handler: if stage=FORMALIZATION → trigger shaping workflow
```

### PoC 제약

- **프로덕션 최소화**: D1 Event Table을 shared foundry-x-db에서 사용 (별도 DB 불필요)
- **Cron Trigger 대신 manual poll endpoint** — PoC에서 Cron 설정 불필요
- 실전 전환(Phase 46+)에서 Cron Trigger 추가

## TDD 계획

### F567 — TDD Red Targets

```
scripts/benchmarks/k6/__tests__/k6-script.test.mjs
- ✓ multi-hop-latency.js exports valid k6 options
- ✓ thresholds includes http_req_duration p95 < 300ms
- ✓ scenarios includes at least 1 scenario
```

### F568 — TDD Red Targets

```
packages/fx-discovery/src/__tests__/events/stage-publisher.test.ts
- ✓ publishes biz-item.stage-changed event when stage is updated
- ✓ includes bizItemId, fromStage, toStage in payload
- ✓ skips publish when stage unchanged

packages/fx-shaping/src/__tests__/events/discovery-trigger.test.ts
- ✓ handles biz-item.stage-changed event
- ✓ triggers shaping when toStage = FORMALIZATION
- ✓ does not trigger for other stages
- ✓ marks event processed after handling
```

## 산출물

| 파일 | 용도 |
|------|------|
| `scripts/benchmarks/k6/multi-hop-latency.js` | k6 benchmark script |
| `scripts/benchmarks/k6/single-hop-baseline.js` | 1-hop baseline |
| `docs/dogfood/sprint-316-latency.md` | latency 실측 리포트 (P1) |
| `docs/specs/fx-eventbus/decision.md` | EventBus 기술스택 결정 (P2) |
| `packages/fx-discovery/src/events/stage-publisher.ts` | 이벤트 발행자 |
| `packages/fx-shaping/src/events/discovery-trigger.ts` | 트리거 핸들러 |
| `docs/04-report/features/sprint-316-report.md` | 회고 리포트 (P4) |

## Phase Exit Criteria

| # | 항목 | 판정 |
|---|------|------|
| P1 | `docs/dogfood/sprint-316-latency.md` 파일 존재 + latency 수치 기재 | 파일 존재 확인 |
| P2 | `docs/specs/fx-eventbus/decision.md` 기술스택 선정 근거 | 파일 + 결론 섹션 존재 |
| P3 | Discovery→Shaping 1 flow 실행 확증 (테스트 로그 또는 D1 row) | 테스트 PASS |
| P4 | `docs/04-report/features/sprint-316-report.md` | 파일 존재 |

## Out-of-scope

- F565 SDD CI 게이트 (Sprint 317)
- F570 Offering 이관 (Sprint 318)
- F571 Agent 분리, F572 modules (Sprint 319+)
- C78/C80/C89/C90 하드닝 (별도 C-track)
- fx-discovery/fx-shaping routes 추가 이관 (F563 완결됨)
- Cron Trigger 실전 배포 (Phase 46+)
- Grafana 대시보드 실제 등록 (읽기 전용 환경)
