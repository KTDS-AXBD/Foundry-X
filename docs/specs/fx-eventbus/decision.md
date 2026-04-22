# EventBus 기술스택 결정 문서

> **작성일**: 2026-04-22  
> **Sprint**: 316  
> **F-item**: F568 (FX-REQ-611)  
> **결정자**: Sinclair Seo (S310)  
> **타임박스**: 2주 PoC

---

## 배경

Phase 45 PRD Gap 10 — EventBus/비동기 통신 PoC 부재.  
Discovery→Shaping 트리거를 비동기 파이프라인으로 구현하기 위한 기술스택 선정 필요.

---

## 평가 대상 3종

### 1. D1 Event Table (domain_events)

**구현 방식**: `domain_events` 테이블에 이벤트를 INSERT하고, Cron Trigger 또는 polling으로 소비.

**장점**:
- `D1EventBus` 이미 `packages/harness-kit`에 완전 구현됨 (Sprint 185/191)
- `domain_events` 테이블 이미 `foundry-x-db`에 존재 (migration 0114+0115)
- fx-discovery, fx-shaping 모두 `DB` binding 보유 — 추가 인프라 불필요
- local dev 완전 지원 (`wrangler dev` + miniflare)
- 이벤트 이력 D1 SQL로 직접 쿼리 가능 (디버깅 용이)
- at-least-once 구현 가능 (poll + ack 패턴)
- retry_count, last_error 컬럼 이미 있음 (migration 0115)

**단점**:
- 순서 보장이 `created_at` 기반 약보장
- poll 주기(Cron Trigger)가 최소 1분 — 실시간 near-zero latency 불가
- D1 read 비용 (초당 50만 reads 무료)

### 2. Cloudflare Queue

**구현 방식**: Producer Worker가 큐에 메시지 push → Consumer Worker 자동 invoke.

**장점**:
- at-least-once 자동 보장
- push 즉시 소비 가능 (near-realtime)
- Cloudflare가 retry 자동 처리

**단점**:
- `wrangler.toml`에 `[[queues.producers]]` / `[[queues.consumers]]` 신규 설정 필요
- local dev 불가 (`miniflare` Queue 미지원, 2025 기준)
- PoC 2주 타임박스 초과 가능성 (infra 설정 + 테스트 환경 확보)
- 이벤트 이력 별도 저장 없음 (DLQ 아니면 유실)

### 3. Durable Object (DO)

**구현 방식**: DO 인스턴스가 상태(이벤트 큐)를 유지하고 Worker 간 조율.

**장점**:
- 강한 순서 보장 (단일 DO 인스턴스 직렬화)
- WebSocket 실시간 연결 가능
- 복잡한 워크플로우 상태 관리 적합

**단점**:
- DO 클래스 신규 구현 필요 (현재 코드베이스에 없음)
- 비용: DO 요청 단가 높음 ($0.15/백만 요청)
- 디버깅 복잡 (상태가 DO 내부에 격리됨)
- PoC 2주 타임박스 확실히 초과

---

## 비교표

| 기준 | D1 Event Table | Cloudflare Queue | Durable Object |
|------|:---:|:---:|:---:|
| 구현 현황 | ✅ 완비 | ❌ 없음 | ❌ 없음 |
| local dev | ✅ | ❌ | ✅ |
| at-least-once | 수동 | 자동 | 수동 |
| 순서 보장 | 약 | 없음 | 강 |
| PoC 타임박스 적합 | ✅ | ⚠️ | ❌ |
| 이벤트 이력 조회 | ✅ SQL | ❌ | ❌ |
| 추가 인프라 | 없음 | Queue 설정 | DO 클래스 |
| 월 비용 (예상) | D1 read ~$0 | Queue ~$0.03 | DO ~$0.15 |

---

## 결정: **D1 Event Table 선택**

### 근거

1. **구현 비용 최소화**: D1EventBus가 이미 harness-kit에 완전 구현됨 — PoC에서 신규 인프라 불필요
2. **로컬 개발 환경 지원**: Cloudflare Queue의 local dev 미지원은 TDD 사이클에 치명적
3. **PoC 타임박스 준수**: 2주 내 Discovery→Shaping 1 flow 실증을 위한 최단 경로
4. **이벤트 이력 가시성**: domain_events 테이블을 D1 console에서 직접 쿼리 가능
5. **F562 shared-contracts 연계**: DomainEventEnvelope 타입이 D1EventBus 페이로드와 구조 일치

### 제약

- **실시간 트리거 불가**: Cron Trigger 최소 1분 주기 → PoC에서는 manual poll endpoint로 대체
- **프로덕션 전환 시 검토**: 대용량(초당 수천 이벤트) 환경에서는 Cloudflare Queue 재검토 필요

---

## 구현 범위 (Sprint 316 PoC)

| 구현 | 파일 | 상태 |
|------|------|------|
| StagePublisher (discovery) | `packages/fx-discovery/src/events/stage-publisher.ts` | ✅ |
| DiscoveryTrigger (shaping) | `packages/fx-shaping/src/events/discovery-trigger.ts` | ✅ |
| discovery-stages route 주입 | `packages/fx-discovery/src/routes/discovery-stages.ts` | ✅ |
| 기술스택 결정 문서 | 이 파일 | ✅ |

---

## 실전 전환 체크리스트 (Phase 46+)

- [ ] Cron Trigger 설정 (`fx-shaping/wrangler.toml`에 `[triggers]` 추가)
- [ ] DiscoveryTrigger.poll()을 Cron handler로 연결
- [ ] domain_events 테이블 파티셔닝 또는 TTL 정책 수립
- [ ] FORMALIZATION → shaping API 실제 호출로 교체 (현재 console.log)
- [ ] 대용량 환경 Cloudflare Queue 재평가 (초당 500+ 이벤트 임계점)

---

## 참조

- F568 PRD: `docs/specs/fx-msa-followup/prd-final.md §Gap 10`
- D1EventBus: `packages/harness-kit/src/events/d1-bus.ts`
- shared-contracts events: `packages/shared-contracts/src/events.ts`
- domain_events migration: `packages/api/src/db/migrations/0114_domain_events.sql`
