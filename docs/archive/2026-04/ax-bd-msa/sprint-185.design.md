---
code: FX-DSGN-S185
title: "Sprint 185 Design — F398: 이벤트 카탈로그 + EventBus PoC + Web IA 개편"
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-PLAN-S185]], [[FX-REQ-390]]"
---

# Sprint 185 Design: F398

## 1. 개요

Plan 문서 기반 구현 설계. 3개 트랙 병렬 구현.

| 트랙 | 범위 | 파일 수 |
|------|------|---------|
| A — 이벤트 카탈로그 | `packages/shared/src/events/` 신규 | 2 + 1 수정 |
| B — EventBus PoC | D1 migration + D1Bus + cron 연동 | 3 신규 + 1 수정 |
| C — Web IA 개편 | sidebar.tsx + router.tsx | 2 수정 |

## 2. Track A: 이벤트 카탈로그 (`packages/shared/src/events/`)

### 2.1 디렉토리 구조

```
packages/shared/src/
├── events/
│   ├── catalog.ts   ← 8종 이벤트 payload 타입 (신규)
│   └── index.ts     ← 이벤트 모듈 public API (신규)
└── index.ts         ← events re-export 추가 (수정)
```

### 2.2 `packages/shared/src/events/catalog.ts`

8종 이벤트 타입은 `harness-kit/src/events/types.ts`의 `EventType` 기준.
각 이벤트는 `DomainEvent<TPayload>` 제네릭을 채우는 payload 인터페이스.

```typescript
// ─── F398: 이벤트 카탈로그 8종 — 서비스 경계 이벤트 계약 (Sprint 185) ───

import type { DomainEvent } from '@foundry-x/harness-kit';

// ── 1. BizItem 도메인 (Discovery 서비스) ──

export interface BizItemCreatedPayload {
  bizItemId: string;
  title: string;
  type: 'I' | 'M' | 'P' | 'T' | 'S';
  orgId: string;
  createdBy: string;
}
export type BizItemCreatedEvent = DomainEvent<BizItemCreatedPayload>;

export interface BizItemUpdatedPayload {
  bizItemId: string;
  fields: string[];       // 변경된 필드 목록
  orgId: string;
  updatedBy: string;
}
export type BizItemUpdatedEvent = DomainEvent<BizItemUpdatedPayload>;

export interface BizItemStageChangedPayload {
  bizItemId: string;
  fromStage: string;
  toStage: string;
  orgId: string;
  changedBy: string;
}
export type BizItemStageChangedEvent = DomainEvent<BizItemStageChangedPayload>;

// ── 2. Validation 도메인 (Gate 서비스) ──

export interface ValidationCompletedPayload {
  validationId: string;
  bizItemId: string;
  score: number;
  verdict: 'PASS' | 'CONDITIONAL' | 'FAIL';
  orgId: string;
}
export type ValidationCompletedEvent = DomainEvent<ValidationCompletedPayload>;

export interface ValidationRejectedPayload {
  validationId: string;
  bizItemId: string;
  reason: string;
  orgId: string;
}
export type ValidationRejectedEvent = DomainEvent<ValidationRejectedPayload>;

// ── 3. Offering 도메인 (Launch 서비스) ──

export interface OfferingGeneratedPayload {
  offeringId: string;
  bizItemId: string;
  format: 'html' | 'pptx' | 'pdf';
  url: string;
  orgId: string;
}
export type OfferingGeneratedEvent = DomainEvent<OfferingGeneratedPayload>;

export interface PrototypeCreatedPayload {
  prototypeId: string;
  bizItemId: string;
  prototypeType: string;
  orgId: string;
  createdBy: string;
}
export type PrototypeCreatedEvent = DomainEvent<PrototypeCreatedPayload>;

// ── 4. Pipeline 도메인 (Core 서비스) ──

export interface PipelineStepCompletedPayload {
  pipelineId: string;
  stepId: string;
  stepName: string;
  result: 'success' | 'failure' | 'skipped';
  durationMs: number;
  orgId: string;
}
export type PipelineStepCompletedEvent = DomainEvent<PipelineStepCompletedPayload>;

// ── 유니언 타입 (전체 도메인 이벤트) ──

export type AnyDomainEvent =
  | BizItemCreatedEvent
  | BizItemUpdatedEvent
  | BizItemStageChangedEvent
  | ValidationCompletedEvent
  | ValidationRejectedEvent
  | OfferingGeneratedEvent
  | PrototypeCreatedEvent
  | PipelineStepCompletedEvent;
```

### 2.3 `packages/shared/src/events/index.ts`

```typescript
export type {
  BizItemCreatedPayload, BizItemCreatedEvent,
  BizItemUpdatedPayload, BizItemUpdatedEvent,
  BizItemStageChangedPayload, BizItemStageChangedEvent,
  ValidationCompletedPayload, ValidationCompletedEvent,
  ValidationRejectedPayload, ValidationRejectedEvent,
  OfferingGeneratedPayload, OfferingGeneratedEvent,
  PrototypeCreatedPayload, PrototypeCreatedEvent,
  PipelineStepCompletedPayload, PipelineStepCompletedEvent,
  AnyDomainEvent,
} from './catalog.js';
```

### 2.4 `packages/shared/src/index.ts` 수정

기존 TaskEvent export 블록 아래에 추가:

```typescript
// F398: 이벤트 카탈로그 8종 (Sprint 185)
export type {
  BizItemCreatedPayload, BizItemCreatedEvent,
  BizItemUpdatedPayload, BizItemUpdatedEvent,
  BizItemStageChangedPayload, BizItemStageChangedEvent,
  ValidationCompletedPayload, ValidationCompletedEvent,
  ValidationRejectedPayload, ValidationRejectedEvent,
  OfferingGeneratedPayload, OfferingGeneratedEvent,
  PrototypeCreatedPayload, PrototypeCreatedEvent,
  PipelineStepCompletedPayload, PipelineStepCompletedEvent,
  AnyDomainEvent,
} from './events/index.js';
```

## 3. Track B: EventBus PoC

### 3.1 D1 Migration: `0114_domain_events.sql`

```sql
-- F398: Domain Events Table — D1 기반 이벤트 버스 PoC (Sprint 185)

CREATE TABLE IF NOT EXISTS domain_events (
  id          TEXT    NOT NULL PRIMARY KEY,
  type        TEXT    NOT NULL,  -- EventType enum 값
  source      TEXT    NOT NULL,  -- ServiceId ('discovery'|'gate'|'launch'|'portal'|'core')
  tenant_id   TEXT    NOT NULL,  -- org 격리
  payload     TEXT    NOT NULL,  -- JSON
  metadata    TEXT,              -- JSON nullable (correlationId, userId 등)
  status      TEXT    NOT NULL DEFAULT 'pending',  -- 'pending'|'processed'|'failed'
  created_at  TEXT    NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_domain_events_status_created
  ON domain_events (status, created_at);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant
  ON domain_events (tenant_id, status);
```

### 3.2 `packages/shared/src/events/d1-bus.ts` (신규)

**설계 원칙**: `packages/api/src/services/event-bus.ts`의 인메모리 EventBus와 동일한 인터페이스를 유지하되, 영속성은 D1으로.

```typescript
// ─── F398: D1EventBus — D1 기반 이벤트 발행 + 폴링 PoC (Sprint 185) ───

import type { DomainEvent, EventType } from '@foundry-x/harness-kit';

export type D1Database = {
  prepare(query: string): {
    bind(...args: unknown[]): {
      run(): Promise<{ success: boolean }>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

export type EventHandler = (event: DomainEvent) => Promise<void>;

export class D1EventBus {
  private handlers: Map<EventType | '*', Set<EventHandler>> = new Map();

  constructor(private readonly db: D1Database) {}

  /** 이벤트 D1에 발행 (persist) */
  async publish(event: DomainEvent, tenantId: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO domain_events
         (id, type, source, tenant_id, payload, metadata, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        event.id,
        event.type,
        event.source,
        tenantId,
        JSON.stringify(event.payload),
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.timestamp,
      )
      .run();
  }

  /** 인메모리 핸들러 등록 (Cron이 poll 후 호출) */
  subscribe(type: EventType | '*', handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /** Cron 폴링: pending 이벤트 최대 50개 처리 */
  async poll(): Promise<number> {
    const { results } = await this.db
      .prepare(
        `SELECT id, type, source, tenant_id, payload, metadata, created_at
         FROM domain_events
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT 50`,
      )
      .bind()
      .all<{
        id: string; type: string; source: string;
        tenant_id: string; payload: string;
        metadata: string | null; created_at: string;
      }>();

    let processed = 0;
    for (const row of results) {
      const event: DomainEvent = {
        id: row.id,
        type: row.type as EventType,
        source: row.source as DomainEvent['source'],
        timestamp: row.created_at,
        payload: JSON.parse(row.payload),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };

      try {
        await this._dispatch(event);
        await this._ack(row.id, 'processed');
        processed++;
      } catch {
        await this._ack(row.id, 'failed');
      }
    }
    return processed;
  }

  private async _dispatch(event: DomainEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type as EventType) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    await Promise.all([...typeHandlers, ...wildcardHandlers].map((h) => h(event)));
  }

  private async _ack(id: string, status: 'processed' | 'failed'): Promise<void> {
    await this.db
      .prepare(
        `UPDATE domain_events SET status = ?, processed_at = ? WHERE id = ?`,
      )
      .bind(status, new Date().toISOString(), id)
      .run();
  }
}
```

### 3.3 `packages/api/src/core/events/event-cron.ts` (신규)

Cron Trigger에서 D1EventBus 폴링을 호출하는 전용 핸들러.

```typescript
// ─── F398: 도메인 이벤트 Cron 핸들러 (Sprint 185) ───

import type { Env } from '../../env.js';
import { D1EventBus } from '@foundry-x/shared';

export async function processDomainEvents(env: Env): Promise<void> {
  const bus = new D1EventBus(env.DB);
  // TODO: subscribe handlers here as services are registered
  const count = await bus.poll();
  if (count > 0) {
    console.log(`[event-cron] processed ${count} domain events`);
  }
}
```

### 3.4 `packages/api/src/scheduled.ts` 수정

기존 `handleScheduled` 함수에 `processDomainEvents` 호출 추가:

```typescript
// 추가 import
import { processDomainEvents } from './core/events/event-cron.js';

// handleScheduled 내부 ctx.waitUntil 추가
ctx.waitUntil(processDomainEvents(env));
```

## 4. Track C: Web IA 개편

### 4.1 `packages/web/src/components/sidebar.tsx` 수정

#### 변경 1: 수집/GTM 그룹 badge 업데이트 (`TBD` → `이관 예정`)

```typescript
// 기존
badge: "TBD",

// 변경 (수집 그룹 + GTM 그룹 모두)
badge: "이관 예정",
```

#### 변경 2: Admin 관리 그룹 → 서비스 경계 5그룹으로 재분류

기존 `DEFAULT_ADMIN_GROUP` (단일 flat 목록) → 5개 NavGroup으로 분리:

```typescript
const DEFAULT_ADMIN_GROUPS: NavGroup[] = [
  {
    key: "admin-auth",
    label: "Auth 서비스",
    icon: Users,
    visibility: "admin",
    badge: "modules/auth",
    items: [
      { href: "/tokens", label: "토큰/모델", icon: Coins },
      { href: "/workspace", label: "워크스페이스", icon: FolderKanban },
    ],
  },
  {
    key: "admin-portal",
    label: "Portal 서비스",
    icon: LayoutDashboard,
    visibility: "admin",
    badge: "modules/portal",
    items: [
      { href: "/nps-dashboard", label: "NPS 대시보드", icon: BarChart3 },
      { href: "/dashboard/metrics", label: "운영 지표", icon: TrendingUp },
      { href: "/projects", label: "프로젝트", icon: FolderKanban },
    ],
  },
  {
    key: "admin-gate",
    label: "Gate 서비스",
    icon: CheckCircle,
    visibility: "admin",
    badge: "modules/gate",
    items: [
      { href: "/orchestration", label: "오케스트레이션", icon: Activity },
    ],
  },
  {
    key: "admin-launch",
    label: "Launch 서비스",
    icon: Rocket,
    visibility: "admin",
    badge: "modules/launch",
    items: [
      { href: "/prototype-dashboard", label: "Prototype", icon: FlaskConical },
      { href: "/builder-quality", label: "Quality", icon: BarChart3 },
    ],
  },
  {
    key: "admin-core",
    label: "Core (Foundry-X)",
    icon: GitBranch,
    visibility: "admin",
    badge: "core",
    items: [
      { href: "/agents", label: "에이전트", icon: Bot },
      { href: "/architecture", label: "아키텍처", icon: Blocks },
      { href: "/methodologies", label: "방법론", icon: Library },
    ],
  },
];
```

#### 변경 3: adminGroups 변수 타입 변경

```typescript
// 기존: const adminGroups: NavGroup[] = cmsNav?.adminGroups ? ... : [DEFAULT_ADMIN_GROUP];
// 변경:
const adminGroups: NavGroup[] = cmsNav?.adminGroups ? ... : DEFAULT_ADMIN_GROUPS;
```

### 4.2 `packages/web/src/router.tsx` 수정

레거시 `/ax-bd/*` 라우트 redirect 추가 (기존 ax-bd 라우트 블록 아래):

```typescript
// 추가 redirect 10건 (ax-bd → 신규 경로)
{ path: "ax-bd/ideas", element: <Navigate to="/discovery/ideas-bmc" replace /> },
{ path: "ax-bd/ideas/:id", element: <Navigate to="/discovery/ideas-bmc" replace /> },
{ path: "ax-bd/bmc", element: <Navigate to="/discovery/ideas-bmc" replace /> },
{ path: "ax-bd/bmc/new", element: <Navigate to="/discovery/ideas-bmc" replace /> },
{ path: "ax-bd/bmc/:id", element: <Navigate to="/discovery/ideas-bmc" replace /> },
{ path: "ax-bd/bdp/:bizItemId", element: <Navigate to="/discovery/items" replace /> },
{ path: "ax-bd/process-guide", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/skill-catalog", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/skill-catalog/:skillId", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/artifacts", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/artifacts/:id", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/progress", element: <Navigate to="/discovery" replace /> },
{ path: "ax-bd/ontology", element: <Navigate to="/discovery" replace /> },
```

> **참고**: `/ax-bd/ideas`, `/ax-bd/bmc`, `/ax-bd/discovery`, `/ax-bd/ideas-bmc`, `/ax-bd/discover-dashboard` 중 일부는 이미 router.tsx L133~138에 redirect가 존재. 중복 방지를 위해 추가 전 확인 필수.

## 5. Worker 파일 매핑

| Worker | 파일 목록 | 독립성 |
|--------|----------|--------|
| W1 (이벤트 카탈로그) | `packages/shared/src/events/catalog.ts` (신규), `packages/shared/src/events/index.ts` (신규), `packages/shared/src/index.ts` (수정) | 완전 독립 |
| W2 (EventBus PoC) | `packages/api/src/db/migrations/0114_domain_events.sql` (신규), `packages/shared/src/events/d1-bus.ts` (신규), `packages/api/src/core/events/event-cron.ts` (신규), `packages/api/src/scheduled.ts` (수정) | W1 완료 후 가능 (import 의존) |
| W3 (Web IA 개편) | `packages/web/src/components/sidebar.tsx` (수정), `packages/web/src/router.tsx` (수정) | 완전 독립 |

## 6. 테스트 설계

### 6.1 `packages/shared/src/__tests__/events.test.ts`

```
- 8종 이벤트 payload 타입 구조 확인 (각 필드 존재 여부)
- AnyDomainEvent 유니언 타입 narrowing 테스트 (type guard)
- DomainEvent<BizItemCreatedPayload> 조립 테스트
```

### 6.2 `packages/api/src/__tests__/domain-events.test.ts`

```
- D1EventBus.publish() → D1 INSERT 실행 확인
- D1EventBus.poll() → pending 이벤트 조회 + 핸들러 호출 확인
- D1EventBus._ack() → status 업데이트 확인
- Cron 핸들러 processDomainEvents() 통합 흐름
```

**Mock 전략**: `better-sqlite3` in-memory SQLite (기존 API 테스트 패턴 동일)

### 6.3 `packages/web/src/__tests__/sidebar-ia.test.tsx`

```
- DEFAULT_ADMIN_GROUPS 5개 그룹 키 확인
- 수집 그룹 badge="이관 예정" 렌더링
- GTM 그룹 badge="이관 예정" 렌더링
- isAdmin=true 시 서비스 경계 그룹 표시
- isAdmin=false 시 Admin 그룹 미표시
```

## 7. 검증 체크리스트 (Gap Analysis 기준)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | 8종 이벤트 인터페이스 존재 | `packages/shared/src/events/catalog.ts` 파일 존재 + export 8종 확인 |
| 2 | shared/index.ts에 events 재export | `grep "AnyDomainEvent" packages/shared/src/index.ts` |
| 3 | D1 migration 0114 | `ls packages/api/src/db/migrations/0114_*` |
| 4 | D1EventBus.poll() 구현 | `packages/shared/src/events/d1-bus.ts` 존재 |
| 5 | event-cron.ts 존재 | `packages/api/src/core/events/event-cron.ts` 존재 |
| 6 | scheduled.ts에 processDomainEvents 호출 | `grep "processDomainEvents" packages/api/src/scheduled.ts` |
| 7 | sidebar badge 이관 예정 | `grep "이관 예정" packages/web/src/components/sidebar.tsx` |
| 8 | DEFAULT_ADMIN_GROUPS 5개 그룹 | `grep "admin-auth\|admin-portal\|admin-gate\|admin-launch\|admin-core" sidebar.tsx` |
| 9 | ax-bd redirect ≥10건 | `grep "ax-bd.*Navigate" packages/web/src/router.tsx` count |
| 10 | typecheck 통과 | `turbo typecheck` 0 errors |
| 11 | 테스트 통과 | `turbo test` 0 fail |
