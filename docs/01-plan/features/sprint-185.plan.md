---
code: FX-PLAN-S185
title: "Sprint 185 — F398: 이벤트 카탈로그 + EventBus PoC + Web IA 개편"
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-390]]"
---

# Sprint 185: F398 — 이벤트 카탈로그 + EventBus PoC + Web IA 개편

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F398 — 이벤트 카탈로그 8종 스키마 확정 + EventBus PoC + Web IA 개편 |
| Sprint | 185 |
| 우선순위 | P1 |
| 의존성 | F397 (Sprint 183~184 ✅) — modules/gate/ + modules/launch/ 완료 |
| REQ | FX-REQ-390 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 서비스 분리를 위한 이벤트 계약이 미확정이고, 웹 IA가 모듈 경계를 반영하지 않아 혼란 가중 |
| Solution | 8종 이벤트 스키마를 shared 패키지에 확정 + D1 기반 EventBus PoC + 사이드바 서비스 경계 그룹화 |
| Function UX Effect | 서비스별 명확한 메뉴 그룹 + "이관 예정" 라벨로 현재 상태 투명성 확보 |
| Core Value | Phase 20-B 분리 준비의 핵심 인프라(이벤트 계약 + IA 가시화) 완성 → Sprint 186 프록시 레이어 착수 가능 |

## 작업 목록

### Track A: 이벤트 카탈로그 (`packages/shared/events/`)

| # | 파일 | 내용 |
|---|------|------|
| 1 | `packages/shared/src/events/catalog.ts` | 8종 이벤트 payload TypeScript 스키마 (`BizItemCreatedEvent`, `BizItemUpdatedEvent`, `BizItemStageChangedEvent`, `ValidationCompletedEvent`, `ValidationRejectedEvent`, `OfferingGeneratedEvent`, `PrototypeCreatedEvent`, `PipelineStepCompletedEvent`) |
| 2 | `packages/shared/src/events/index.ts` | 이벤트 타입 export 통합 |
| 3 | `packages/shared/src/index.ts` | events 재export 추가 |

**이벤트 스키마 설계 기준**:
- 기반: `harness-kit/src/events/types.ts`의 `EventType` 8종을 공식화
- 각 이벤트는 `DomainEvent<TPayload>` 제네릭 기반: `{ id, type, source, timestamp, payload, metadata? }`
- `source`: `ServiceId` (`'discovery' | 'gate' | 'launch' | 'portal' | 'core'`)
- payload 필드는 서비스 컨텍스트에 맞게 구체화

### Track B: EventBus PoC (D1 + Cron Trigger)

| # | 파일 | 내용 |
|---|------|------|
| 4 | `packages/api/src/db/migrations/0114_domain_events.sql` | `domain_events` D1 테이블 생성 |
| 5 | `packages/shared/src/events/d1-bus.ts` | `D1EventBus` — D1 기반 이벤트 발행/폴링 구현 |
| 6 | `packages/api/src/core/events/event-cron.ts` | Cron Trigger 핸들러 — 미처리 이벤트 폴링 + 소비자 호출 |
| 7 | `packages/api/src/index.ts` | Cron Trigger 등록 (`scheduled` export 추가) |

**D1 EventBus 설계**:
```sql
-- domain_events 테이블
CREATE TABLE domain_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  metadata TEXT,          -- JSON nullable
  status TEXT DEFAULT 'pending',  -- pending | processed | failed
  created_at TEXT NOT NULL,
  processed_at TEXT
);
```

**Cron 폴링 패턴**: `SELECT * FROM domain_events WHERE status='pending' ORDER BY created_at LIMIT 50` → 핸들러 호출 → `UPDATE status='processed'`

### Track C: Web IA 개편 (`packages/web/`)

| # | 파일 | 내용 |
|---|------|------|
| 8 | `packages/web/src/components/sidebar.tsx` | 사이드바 서비스 경계 그룹 + "이관 예정" 라벨 |
| 9 | `packages/web/src/router.tsx` | 잔여 `/ax-bd/*` 레거시 경로 → 신규 경로 redirect |

**사이드바 IA 변경 내용**:

1. **Admin 관리 그룹을 서비스 경계 기준으로 재분류**:
   - `modules/auth` 서비스 → Auth/SSO 관련 관리 항목
   - `modules/portal` 서비스 → Dashboard/Wiki/KPI 관련 항목
   - `modules/gate` 서비스 → 검증 관련 항목
   - `modules/launch` 서비스 → 제품화/GTM 관련 항목
   - Foundry-X 코어 → 오케스트레이션/아키텍처/방법론

2. **"이관 예정" 라벨**: `badge: "이관 예정"` 속성을 process group에 추가 (기존 `badge: "TBD"` 교체)
   - 1. 수집 그룹: `badge: "이관 예정"` (Discovery-X로 이관 예정)
   - 6. GTM 그룹: `badge: "이관 예정"` (Launch-X로 이관 예정)

3. **레거시 `/ax-bd/*` 라우트 redirect** (router.tsx):
   - `/ax-bd/ideas` → `/discovery/ideas-bmc`
   - `/ax-bd/ideas/:id` → `/discovery/ideas-bmc` (best effort)
   - `/ax-bd/bmc` → `/discovery/ideas-bmc`
   - `/ax-bd/bdp/:bizItemId` → `/discovery/items`
   - `/ax-bd/process-guide` → `/discovery`
   - `/ax-bd/skill-catalog` → `/discovery`
   - `/ax-bd/artifacts` → `/discovery`
   - `/ax-bd/artifacts/:id` → `/discovery`
   - `/ax-bd/progress` → `/discovery`
   - `/ax-bd/ontology` → `/discovery`

4. **코어 메뉴 정리**: Admin 관리 그룹에서 중복/미사용 항목 확인 후 정리

## 구현 전략

### 병렬 Worker 매핑

| Worker | 담당 | 파일 |
|--------|------|------|
| W1 | 이벤트 카탈로그 | `packages/shared/src/events/catalog.ts`, `index.ts`, shared `src/index.ts` |
| W2 | EventBus PoC | D1 migration `0114`, `d1-bus.ts`, `event-cron.ts`, API `index.ts` |
| W3 | Web IA 개편 | `sidebar.tsx`, `router.tsx` |

각 Worker는 독립 파일 영역을 담당하므로 충돌 없이 병렬 실행 가능.

## 테스트 계획

| # | 테스트 파일 | 검증 항목 |
|---|-------------|-----------|
| 1 | `packages/shared/src/__tests__/events.test.ts` | 8종 이벤트 타입 가드 + payload 구조 |
| 2 | `packages/api/src/__tests__/domain-events.test.ts` | D1EventBus publish/poll/ack 흐름 |
| 3 | `packages/web/src/__tests__/sidebar-ia.test.tsx` | 서비스 경계 그룹 렌더링 + 이관 예정 라벨 |

## 성공 기준 (Design → Analysis 기준)

| # | 항목 | 기준 |
|---|------|------|
| 1 | 이벤트 카탈로그 | 8종 TypeScript 인터페이스 정의 + typecheck 통과 |
| 2 | D1EventBus | publish → poll → ack 흐름 단위 테스트 통과 |
| 3 | Cron 핸들러 | scheduled export 존재 + D1 폴링 쿼리 검증 |
| 4 | 사이드바 IA | 서비스 경계 그룹 5개 렌더링 확인 |
| 5 | 이관 예정 라벨 | 수집/GTM 그룹에 badge 표시 |
| 6 | ax-bd redirect | 10개 레거시 경로 redirect 동작 확인 |
| 7 | 전체 테스트 | `turbo test` 0 fail |

## 예상 산출물

- `packages/shared/src/events/` — 카탈로그 + D1 bus + index (신규)
- `packages/api/src/db/migrations/0114_domain_events.sql` (신규)
- `packages/api/src/core/events/event-cron.ts` (신규)
- `packages/web/src/components/sidebar.tsx` (수정)
- `packages/web/src/router.tsx` (수정)
- 테스트 3종 (신규)
