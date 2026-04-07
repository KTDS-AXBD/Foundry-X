---
code: FX-PLAN-S191
title: Sprint 191 — F406 Foundry-X ↔ Gate-X 이벤트 연동
version: "1.0"
status: Active
category: PLAN
created: "2026-04-07"
updated: "2026-04-07"
author: Claude (Sprint Autopilot)
sprint: 191
f_items: [F406]
req_ids: [FX-REQ-398]
---

# FX-PLAN-S191: Sprint 191 — F406 이벤트 연동

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F406 Foundry-X ↔ Gate-X 이벤트 연동 |
| Sprint | 191 |
| Phase | Phase 21-B (M2: 이벤트 연동) |
| 우선순위 | P1 |
| 선행 Sprint | Sprint 190 (F404+F405: Queue + JWT/RBAC 기반) |

## 목표

Sprint 190에서 완성된 Gate-X 비동기 큐 PoC와 JWT/RBAC 기반 위에,
**이벤트 유실 복구 메커니즘**을 추가하여 Foundry-X ↔ Gate-X 간 신뢰성 있는 이벤트 교환을 구현한다.

### 핵심 문제
- 현재 `D1EventBus`는 `poll()` 중 handler 오류 시 `failed` 상태로만 기록하고 재시도 없음
- `failed` 이벤트가 누적되어도 복구 경로 없음
- Gate-X 측에서 이벤트 수신 상태를 확인할 API 없음

## F406 구현 범위

### 1. 이벤트 재시도 메커니즘
- `D1EventBus`에 `retry()` 메서드 추가 — `failed` 이벤트 재처리
- 최대 재시도 횟수(3회) + 지수 백오프 지원
- D1 migrations: `retry_count`, `last_error` 컬럼 추가

### 2. 보상 트랜잭션 (Dead-Letter Queue)
- 최대 재시도 초과 이벤트 → `dead_letter` 상태로 이관
- DLQ 조회 API: `GET /api/events/dlq`
- 수동 재처리 API: `POST /api/events/dlq/:id/reprocess`

### 3. Gate-X 이벤트 연동 서비스
- `GateXEventBridge` 서비스: Gate-X 검증 이벤트를 D1EventBus로 발행
- Foundry-X → Gate-X: `validation.completed`, `validation.rejected` 이벤트 구독
- Gate-X → Foundry-X: `biz-item.stage-changed` 이벤트 발행

### 4. 이벤트 상태 폴링 API
- `GET /api/events/status` — pending/failed/dlq 건수 반환
- `GET /api/events/:id` — 특정 이벤트 상태 조회

## 구현 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `packages/shared/src/events/d1-bus.ts` | 수정 | retry() + DLQ 이동 로직 |
| `packages/api/src/db/migrations/0115_event_recovery.sql` | 신규 | retry_count, last_error, dlq 지원 |
| `packages/api/src/modules/gate/services/gate-event-bridge.ts` | 신규 | GateXEventBridge 서비스 |
| `packages/api/src/core/events/event-cron.ts` | 수정 | retry() + DLQ 통계 로깅 |
| `packages/api/src/routes/event-status.ts` | 신규 | 이벤트 상태 조회 API |
| `packages/api/src/__tests__/event-recovery.test.ts` | 신규 | 복구 메커니즘 단위 테스트 |

## 비기능 요구사항
- 재시도는 Cron Trigger(6시간마다) 기반 — poll() 호출 시 자동 포함
- DLQ 이벤트는 30일 후 자동 정리 (Cron)
- 상태 API 응답 < 200ms (D1 인덱스 활용)

## 완료 기준
- [ ] `D1EventBus.retry()` — failed 이벤트 최대 3회 재처리
- [ ] DLQ 조회 API + 수동 재처리 API
- [ ] `GateXEventBridge` — validation 이벤트 Foundry-X 연동
- [ ] 이벤트 상태 폴링 API (`/api/events/status`)
- [ ] 단위 테스트 100% pass
- [ ] typecheck 오류 0건
