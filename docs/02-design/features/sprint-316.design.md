---
id: sprint-316-design
type: design
sprint: 316
features: [F567, F568]
phase: 45
status: in_progress
created: 2026-04-22
---

# Sprint 316 Design — F567 + F568

## §1 목표

- **F567**: k6 multi-hop latency benchmark script + SLO p95 < 300ms 확정
- **F568**: EventBus PoC 3종 비교 → D1 선정 + Discovery→Shaping 1 flow

## §2 아키텍처

### F567 — 3-hop 측정 경로

```
[k6 Client]
    │  HTTP (external)
    ▼
[fx-gateway Worker]         hop 1: HTTP → Worker (~10ms 추가)
    │  Service Binding (V8 isolate 간 호출)
    ▼
[fx-discovery Worker]       hop 2: Service Binding (+10~14ms per F543 baseline)
    │  D1 SQL
    ▼
[D1 SQLite]
```

**측정 지점**:
- `gateway_total`: fx-gateway URL 직접 HTTP (`https://fx-gateway.ktds-axbd.workers.dev`)
- `discovery_direct`: fx-discovery URL 직접 HTTP (baseline)
- `overhead = gateway_total - discovery_direct`

### F568 — D1 EventBus Flow

```
POST /api/biz-items/:id/discovery-stage
    │
    ▼
DiscoveryStageService.updateStage()  (기존)
    │
    ▼
StagePublisher.publishIfComplete()   (신규)
    │  D1EventBus.publish()
    ▼
domain_events table (status='pending')

─── Consumer (manual poll or Cron) ───────────────────────

DiscoveryTrigger.poll(env.DB)
    │  D1EventBus.poll()
    ▼
handler(event: biz-item.stage-changed)
    │  if toStage === 'FORMALIZATION'
    ▼
console.log / D1 shaping_triggers row  (PoC scope)
```

## §3 F568 기술스택 비교 (3종 PoC)

| 기준 | D1 Event Table | Cloudflare Queue | Durable Object |
|------|:---:|:---:|:---:|
| 구현 복잡도 | 낮음 (이미 구현) | 중간 | 높음 |
| At-least-once 보장 | 수동 (poll+ack) | 자동 | 수동 |
| 순서 보장 | 약 (created_at) | 없음 | 강 |
| 비용 | D1 reads | Queue msg 단가 | DO 호출 단가 |
| Local dev | ✅ miniflare 지원 | ❌ 불가 | ✅ miniflare |
| 기존 코드 재사용 | ✅ D1EventBus 완비 | ❌ 신규 | ❌ 신규 |
| 모니터링 | D1 SQL 직접 | Queue metrics | DO logs |
| PoC 타임박스 적합 | ✅ | ❌ wrangler.toml 설정 필요 | ❌ DO 클래스 신규 |

**결정**: D1 Event Table 선택 (이미 구현 완비, local dev, PoC 타임박스 적합)

## §4 테스트 계약 (TDD Red Target)

### F567

```typescript
// scripts/benchmarks/k6/__tests__/k6-script.test.mjs
// multi-hop-latency.js가 유효한 k6 설정을 export하는지 검증

test('thresholds include p95 < 300ms', ...)
test('scenarios exist', ...)
test('vus and duration configured', ...)
```

### F568 — StagePublisher

```typescript
// packages/fx-discovery/src/__tests__/events/stage-publisher.test.ts
describe('StagePublisher', () => {
  it('publishes biz-item.stage-changed event when stage updated', ...)
  it('includes bizItemId, fromStage, toStage, orgId in payload', ...)
  it('does not publish if stage unchanged', ...)
  it('uses source = "discovery"', ...)
})
```

### F568 — DiscoveryTrigger

```typescript
// packages/fx-shaping/src/__tests__/events/discovery-trigger.test.ts
describe('DiscoveryTrigger', () => {
  it('triggers shaping when toStage = FORMALIZATION', ...)
  it('does not trigger for DISCOVERY stage', ...)
  it('returns count of triggered events', ...)
})
```

## §5 파일 매핑 (D1 체크리스트 검증)

### 신규 생성 파일

| 파일 | 목적 | F-item |
|------|------|--------|
| `scripts/benchmarks/k6/multi-hop-latency.js` | k6 main benchmark script | F567 |
| `scripts/benchmarks/k6/single-hop-baseline.js` | 1-hop fx-discovery 직접 baseline | F567 |
| `scripts/benchmarks/k6/__tests__/k6-script.test.mjs` | k6 script 구조 검증 테스트 | F567 |
| `docs/dogfood/sprint-316-latency.md` | latency 실측값 리포트 | F567 |
| `docs/specs/fx-eventbus/decision.md` | EventBus 기술스택 결정 문서 | F568 |
| `packages/fx-discovery/src/events/stage-publisher.ts` | BizItem 스테이지 변경 이벤트 발행 | F568 |
| `packages/fx-discovery/src/__tests__/events/stage-publisher.test.ts` | StagePublisher TDD 테스트 | F568 |
| `packages/fx-shaping/src/events/discovery-trigger.ts` | Discovery→Shaping 트리거 핸들러 | F568 |
| `packages/fx-shaping/src/__tests__/events/discovery-trigger.test.ts` | DiscoveryTrigger TDD 테스트 | F568 |
| `docs/04-report/features/sprint-316-report.md` | Sprint 회고 리포트 | F567+F568 |

### 수정 파일

| 파일 | 변경 내용 | F-item |
|------|----------|--------|
| `packages/fx-discovery/src/routes/discovery-stages.ts` | `updateStage()` 후 StagePublisher 호출 추가 | F568 |

### D1 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | `discovery-stages.ts` POST handler — StagePublisher 호출 1곳 명시 |
| D2 | 식별자 계약 | event.id = UUID v4, source = "discovery", type = "biz-item.stage-changed" |
| D3 | Breaking change | 없음 — StagePublisher는 fire-and-forget (throw 시 스테이지 업데이트 영향 없음) |
| D4 | TDD Red 파일 | 위 테스트 파일 2종 (F568), k6 테스트 1종 (F567) |

## §6 StagePublisher 인터페이스 설계

```typescript
// packages/fx-discovery/src/events/stage-publisher.ts

import { D1EventBus } from "@foundry-x/harness-kit";
import type { D1Database } from "@cloudflare/workers-types";

export class StagePublisher {
  constructor(private readonly db: D1Database) {}

  async publishIfComplete(
    bizItemId: string,
    orgId: string,
    fromStage: string | null,
    toStage: string,
  ): Promise<void>
}
```

**Fire-and-forget 패턴**: `publishIfComplete`가 실패해도 `updateStage` 응답에 영향 없음. 로그만 남기고 swallow.

## §7 DiscoveryTrigger 인터페이스 설계

```typescript
// packages/fx-shaping/src/events/discovery-trigger.ts

export class DiscoveryTrigger {
  constructor(private readonly db: D1Database) {}

  // PoC scope: FORMALIZATION 스테이지 도달 시 트리거 기록
  async poll(): Promise<{ triggered: number; processed: number }>
}
```

**PoC 동작**: FORMALIZATION stage-changed 이벤트를 받으면 `shaping_triggers` 로그 또는 console.log. 실전 전환(Phase 46+)에서 실제 shaping API 호출로 교체.

## §8 k6 Script 설계

```javascript
// scripts/benchmarks/k6/multi-hop-latency.js
export const options = {
  scenarios: {
    gateway_3hop: { executor: 'constant-vus', vus: 10, duration: '30s' },
    direct_baseline: { executor: 'constant-vus', vus: 10, duration: '30s' },
  },
  thresholds: {
    'http_req_duration{scenario:gateway_3hop}': ['p(95)<300'],
    'http_req_duration{scenario:direct_baseline}': ['p(95)<200'],
  },
};
```

## §9 리스크

| 리스크 | 대응 |
|--------|------|
| k6 실행 불가 (CF Workers 환경 아님) | k6 script + estimated report 생성, 실측은 deploy 후 수동 실행 |
| domain_events table on DISCOVERY_DB | shared DB (DB binding) 사용 — 기존 0114 migration 그대로 활용 |
| DiscoveryEnv에 DISCOVERY_DB 없음 | DB binding 사용 (기존 코드와 일치) |
