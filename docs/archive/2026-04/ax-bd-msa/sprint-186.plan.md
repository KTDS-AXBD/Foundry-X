---
code: FX-PLAN-S186
title: Sprint 186 — F399 Strangler Fig 프록시 + harness-kit 이벤트 유틸리티
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
sprint: 186
f_items: [F399]
req_codes: [FX-REQ-391]
---

# Sprint 186 Plan — F399

## 1. 목표

F399 = **Strangler Fig 프록시 레이어 + harness-kit 이벤트 유틸리티**

Phase 20-B(분리 준비) M3 단계: harness-kit을 서비스 분리의 실용적 기반으로 강화한다.

## 2. 배경

- **Sprint 185 (F398)**: 이벤트 카탈로그 8종 스키마 + D1EventBus PoC를 `@foundry-x/shared`에 구현. domain_events D1 테이블(0114) 생성
- **Sprint 180 (F394+F395)**: harness-kit 패키지 생성 — Workers scaffold + JWT/CORS/RBAC 미들웨어 + ESLint no-cross-service-import
- **현재 gap**: harness-kit의 `NoopEventBus`는 stub, Strangler Fig 패턴 지원 없음

## 3. 범위

### 3.1 In Scope

| 항목 | 위치 | 설명 |
|------|------|------|
| `D1EventBus` | `packages/harness-kit/src/events/d1-bus.ts` | D1 기반 이벤트 발행/폴링 (standalone, @foundry-x/* 무의존) |
| `createEvent()` | `packages/harness-kit/src/events/helpers.ts` | 이벤트 팩토리 헬퍼 |
| `createStranglerMiddleware()` | `packages/harness-kit/src/middleware/strangler.ts` | mode: local/proxy 라우팅 미들웨어 |
| `StranglerRoute` 타입 | 위와 동일 | 경로별 라우팅 규칙 |
| API proxy.ts 리팩토링 | `packages/api/src/routes/proxy.ts` | StranglerMiddleware 활용 데모 |
| 테스트 2종 | `packages/harness-kit/__tests__/` | D1EventBus + Strangler 유닛 테스트 |

### 3.2 Out of Scope

- 실제 D1 migration 추가 (domain_events 테이블은 F398에서 이미 생성)
- gateway-x / launch-x 실제 서비스 구현 (F401 범위)
- E2E 테스트 변경 (F400 범위)

## 4. 기술 접근 방식

### 4.1 D1EventBus (harness-kit)

harness-kit은 독립 npm 패키지이므로 `@foundry-x/shared` 의존성 없이 자체 D1EventBus를 구현한다.
- `@foundry-x/shared`의 `D1EventBus`와 **동일한 D1 스키마** (domain_events 테이블) 사용
- harness-kit `EventBus` 인터페이스 (`publish`, `subscribe`, `publishBatch`) + `poll()` 메서드 추가
- `createEvent(type, source, payload, metadata?)` 헬퍼로 UUID + ISO timestamp 자동 생성

### 4.2 Strangler Fig 미들웨어

```
StranglerRoute {
  pathPrefix: string   // '/dx', '/gate', '/launch'
  serviceId: ServiceId
  mode: 'local' | 'proxy'  // 'local' = 모놀리스 처리, 'proxy' = 외부 서비스로 포워딩
  targetUrl?: string   // HTTP fallback
}
```

- `mode: 'local'` → `next()` 호출 (기존 로컬 핸들러로 fallthrough)
- `mode: 'proxy'` → targetUrl 또는 Workers Service Binding으로 포워딩
- Auth(JWT 검증)는 미들웨어 외부에서 처리 (관심사 분리)

### 4.3 proxy.ts 리팩토링

기존 `/dx/*`, `/aif/*` 라우트의 포워딩 로직을 `createStranglerMiddleware`로 추출.
SSO 토큰 검증은 별도 미들웨어로 유지 (Strangler와 분리).

## 5. 완료 기준

- [ ] D1EventBus: publish/subscribe/poll/publishBatch 정상 동작
- [ ] createEvent(): id(UUID) + timestamp 자동 주입
- [ ] createStranglerMiddleware: local 모드 → next() 호출
- [ ] createStranglerMiddleware: proxy 모드 → targetUrl 포워딩
- [ ] proxy.ts: createStranglerMiddleware 활용
- [ ] 테스트 전체 통과 (harness-kit)
- [ ] typecheck 통과

## 6. 의존성

- PRD: `docs/specs/ax-bd-msa/prd-final.md`
- F394+F395 (Sprint 180): harness-kit 패키지 기반
- F398 (Sprint 185): domain_events D1 테이블 + @foundry-x/shared D1EventBus 참고
