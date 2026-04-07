---
code: FX-DSGN-S186
title: Sprint 186 Design — F399 Strangler Fig 프록시 + harness-kit 이벤트 유틸리티
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
sprint: 186
references: [FX-PLAN-S186, FX-REQ-391]
---

# Sprint 186 Design — F399

## 1. 개요

harness-kit에 두 가지 핵심 유틸리티를 추가한다:
1. **D1EventBus** — D1 테이블 기반 이벤트 발행/구독 (NoopEventBus 대체)
2. **createStranglerMiddleware** — Strangler Fig 패턴 라우팅 미들웨어

## 2. 인터페이스 설계

### 2.1 D1EventBus

```typescript
// packages/harness-kit/src/events/d1-bus.ts

export type D1LikeDatabase = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<{ success: boolean }>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

export class D1EventBus implements EventBus {
  constructor(private readonly db: D1LikeDatabase) {}
  
  async publish(event: DomainEvent, tenantId?: string): Promise<void>
  async publishBatch(events: DomainEvent[], tenantId?: string): Promise<void>
  subscribe(type: EventType | '*', handler: (event: DomainEvent) => Promise<void>): void
  async poll(limit?: number): Promise<number>  // 미처리 이벤트 처리 (cron용)
}
```

`publish()` → domain_events INSERT (status='pending')
`poll()` → pending 이벤트 조회 → _dispatch → _ack('processed'|'failed')

### 2.2 createEvent 헬퍼

```typescript
// packages/harness-kit/src/events/helpers.ts

export function createEvent<T = unknown>(
  type: EventType,
  source: ServiceId,
  payload: T,
  metadata?: DomainEvent['metadata'],
): DomainEvent<T>
// id: crypto.randomUUID(), timestamp: new Date().toISOString() 자동 주입
```

### 2.3 Strangler Fig 미들웨어

```typescript
// packages/harness-kit/src/middleware/strangler.ts

export interface StranglerRoute {
  pathPrefix: string;      // '/dx', '/gate', '/launch'
  serviceId: ServiceId;
  mode: 'local' | 'proxy';
  targetUrl?: string;      // proxy 모드 HTTP endpoint
}

export interface StranglerConfig {
  routes: StranglerRoute[];
}

export function createStranglerMiddleware(config: StranglerConfig): MiddlewareHandler
```

**동작 흐름**:
```
요청 도착
  ↓
pathPrefix 매칭 라우트 검색
  ↓ 없으면 → next() (미매칭)
  ↓ 있으면
  mode === 'local' → next() (로컬 핸들러 처리)
  mode === 'proxy' → X-Forwarded-From 헤더 추가 + fetch(targetUrl + remainingPath)
                     targetUrl 없으면 → 502 "Service not configured"
```

**Query string 보존**: `c.req.url`에서 search params 추출하여 포워딩 URL에 포함

## 3. 파일 매핑

### §5 Worker 파일 매핑

| Worker | 파일 | 작업 |
|--------|------|------|
| W1 (이벤트) | `packages/harness-kit/src/events/d1-bus.ts` | 신규 생성 |
| W1 | `packages/harness-kit/src/events/helpers.ts` | 신규 생성 |
| W1 | `packages/harness-kit/src/events/index.ts` | D1EventBus + createEvent export 추가 |
| W1 | `packages/harness-kit/__tests__/events/d1-bus.test.ts` | 신규 생성 |
| W2 (프록시) | `packages/harness-kit/src/middleware/strangler.ts` | 신규 생성 |
| W2 | `packages/harness-kit/src/middleware/index.ts` | createStranglerMiddleware + 타입 export 추가 |
| W2 | `packages/harness-kit/src/index.ts` | StranglerRoute + createStranglerMiddleware 재export |
| W2 | `packages/harness-kit/__tests__/middleware/strangler.test.ts` | 신규 생성 |
| W2 | `packages/api/src/routes/proxy.ts` | createStranglerMiddleware 활용으로 리팩토링 |

## 4. 테스트 전략

### 4.1 D1EventBus 테스트 (`__tests__/events/d1-bus.test.ts`)

- in-memory mock DB (prepare/bind/run/all mock 구현)
- `publish()`: domain_events에 INSERT되는지 확인
- `subscribe() + poll()`: pending 이벤트 dispatch 후 handler 호출 확인
- `poll()`: processed/failed 상태로 ACK 확인
- `createEvent()`: id, timestamp 자동 생성 확인

### 4.2 Strangler 테스트 (`__tests__/middleware/strangler.test.ts`)

- Hono 앱에 미들웨어 등록 + `app.request()` 직접 호출
- 미매칭 경로: `next()` 실행 → 로컬 핸들러 응답
- local 모드 경로: `next()` 실행 → 로컬 핸들러 응답
- proxy 모드 + targetUrl 없음: 502 반환
- proxy 모드 + targetUrl 설정: fetch 호출 (mock) + X-Forwarded-From 헤더 확인

### 4.3 proxy.ts 리팩토링 검증

- 기존 테스트(`packages/api/src/__tests__/proxy.test.ts` 존재 시) 통과 유지
- 없으면 신규 스모크 테스트 1건 추가

## 5. 아키텍처 결정

### ADR-002: harness-kit D1EventBus는 @foundry-x/shared 미의존

**이유**: harness-kit은 Foundry-X 생태계 외부(gate-x, launch-x 등)에서도 사용되는 standalone npm 패키지. `@foundry-x/shared`를 의존하면 패키지 배포 시 internal types가 노출되고 monorepo 외부에서 설치 불가.

**방식**: `@foundry-x/shared`의 D1EventBus와 동일한 D1 스키마(`domain_events` 테이블)를 사용하되, 타입과 구현은 harness-kit 내부에서 독립 정의.

### ADR-003: Strangler 미들웨어는 Auth 미포함

**이유**: Auth는 서비스별 정책이 다를 수 있음 (일부 서비스는 API Key, 일부는 JWT). Strangler는 "어디로 갈지"만 결정하는 순수 라우팅 미들웨어.

## 6. 완료 기준 체크리스트

- [ ] D1EventBus: EventBus 인터페이스 완전 구현
- [ ] D1EventBus: poll() 정상 동작 (pending → processed/failed)
- [ ] createEvent(): UUID + ISO timestamp 자동 생성
- [ ] Strangler: local 모드 → next() fallthrough
- [ ] Strangler: proxy 모드 → targetUrl 포워딩 + 헤더 보존
- [ ] Strangler: 미매칭 경로 → next() fallthrough
- [ ] Strangler: targetUrl 없이 proxy 모드 → 502
- [ ] harness-kit exports 갱신 (index.ts, events/index.ts, middleware/index.ts)
- [ ] proxy.ts: StranglerMiddleware 활용
- [ ] 테스트 전체 통과
- [ ] typecheck 통과
