---
code: FX-DSGN-S149
title: "Sprint 149 — F334 Hook Layer + Event Bus Design"
version: "1.0"
status: Active
category: DSGN
feature: F334
sprint: 149
phase: "Phase 14 — Agent Orchestration Infrastructure"
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
req: FX-REQ-326
plan: "[[FX-PLAN-S149]]"
---

# Sprint 149 Design — F334 Hook Layer + Event Bus

## 1. 개요

Phase 14 Foundation v2 — Hook 결과를 TaskEvent로 변환하고, Event Bus가 이기종 이벤트를 정규화하여 상태 전이를 자동 트리거하는 인프라.

**근거:** FX-Unified-Integration-Plan.md §3.2 (2계층 루프 아키텍처 Layer 1+2), §4.3 (Foundation v2)

**선행:** F333 ✅ — TaskState enum, TransitionGuard, task_states D1, REST API

## 2. 아키텍처

```
packages/shared/src/task-event.ts          ← TaskEvent 타입 5종 (Layer 1+2 core)
        ↓ (import)
packages/api/src/
  ├── services/event-bus.ts                ← EventBus (emit/subscribe/정규화)
  ├── services/hook-result-processor.ts    ← exit code → TaskEvent 변환
  ├── services/execution-event-service.ts  ← D1 execution_events CRUD
  ├── services/transition-trigger.ts       ← EventBus→TaskState 자동 전이
  ├── schemas/execution-event.ts           ← Zod 스키마
  ├── routes/execution-events.ts           ← GET /execution-events
  └── db/migrations/0096_execution_events.sql
```

### 2.1 데이터 흐름

```
[Shell] Hook Script → exit code + stderr
            │
            ▼
[TS] HookResultProcessor.process({ exitCode, stderr, hookType, filePath })
            │
            ▼
[TS] EventBus.emit(TaskEvent)
            │
            ├─→ [구독자 1] ExecutionEventService.record(event) → D1
            │
            └─→ [구독자 2] TransitionTrigger.handle(event)
                    │
                    ▼
              FEEDBACK_LOOP_TRIGGERS[currentState]에 event.source 존재?
                ├─ Yes → TaskStateService.transition(FEEDBACK_LOOP)
                └─ No  → skip
```

## 3. 상세 설계

### 3.1 TaskEvent 타입 (shared)

```typescript
// packages/shared/src/task-event.ts

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export type TaskEventSource = 'hook' | 'ci' | 'review' | 'discriminator' | 'sync' | 'manual';

/** 통합 이벤트 shape — 모든 이벤트 소스가 이 형식을 따름 */
export interface TaskEvent {
  id: string;
  source: TaskEventSource;
  severity: EventSeverity;
  taskId: string;
  tenantId: string;
  timestamp: string;
  payload: TaskEventPayload;
}

/** 이벤트 소스별 payload */
export type TaskEventPayload =
  | HookEventPayload
  | CIEventPayload
  | ReviewEventPayload
  | DiscriminatorEventPayload
  | SyncEventPayload
  | ManualEventPayload;

export interface HookEventPayload {
  type: 'hook';
  hookType: 'PreToolUse' | 'PostToolUse';
  exitCode: number;
  stderr: string;
  filePath?: string;
  toolName?: string;
}

export interface CIEventPayload {
  type: 'ci';
  provider: string;
  runId: string;
  status: 'success' | 'failure';
  details?: string;
}

export interface ReviewEventPayload {
  type: 'review';
  reviewer: string;
  action: 'approved' | 'changes_requested' | 'commented';
  body?: string;
}

export interface DiscriminatorEventPayload {
  type: 'discriminator';
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  score: number;
  feedback: string[];
}

export interface SyncEventPayload {
  type: 'sync';
  syncType: 'spec-code' | 'code-test' | 'spec-test';
  driftScore: number;
  details?: string;
}

export interface ManualEventPayload {
  type: 'manual';
  action: string;
  reason?: string;
}

/** TaskEvent 생성 헬퍼 */
export function createTaskEvent(
  source: TaskEventSource,
  severity: EventSeverity,
  taskId: string,
  tenantId: string,
  payload: TaskEventPayload,
): TaskEvent {
  return {
    id: crypto.randomUUID(),
    source,
    severity,
    taskId,
    tenantId,
    timestamp: new Date().toISOString(),
    payload,
  };
}
```

### 3.2 EventBus 서비스

```typescript
// packages/api/src/services/event-bus.ts

import type { TaskEvent } from '@foundry-x/shared';

export type EventHandler = (event: TaskEvent) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /** 이벤트 구독 — 소스별 또는 전체('*') */
  subscribe(source: string, handler: EventHandler): () => void {
    if (!this.handlers.has(source)) {
      this.handlers.set(source, new Set());
    }
    this.handlers.get(source)!.add(handler);

    // unsubscribe 함수 반환 (메모리 누수 방지)
    return () => {
      this.handlers.get(source)?.delete(handler);
    };
  }

  /** 이벤트 발행 — 소스별 + 전체('*') 핸들러 모두 호출 */
  async emit(event: TaskEvent): Promise<void> {
    const sourceHandlers = this.handlers.get(event.source) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();

    const allHandlers = [...sourceHandlers, ...wildcardHandlers];
    await Promise.all(allHandlers.map((h) => h(event)));
  }

  /** 전체 구독 해제 (테스트용) */
  clear(): void {
    this.handlers.clear();
  }
}
```

### 3.3 HookResultProcessor

```typescript
// packages/api/src/services/hook-result-processor.ts

import type { TaskEvent, EventSeverity, HookEventPayload } from '@foundry-x/shared';
import { createTaskEvent } from '@foundry-x/shared';

export interface HookResult {
  exitCode: number;
  stderr: string;
  hookType: 'PreToolUse' | 'PostToolUse';
  filePath?: string;
  toolName?: string;
}

export class HookResultProcessor {
  /**
   * Shell exit code를 TaskEvent로 변환
   * - exit 0: info (정상)
   * - exit 1: error (실패)
   * - exit 2: warning (경고, 비차단)
   */
  process(result: HookResult, taskId: string, tenantId: string): TaskEvent {
    const severity = this.mapSeverity(result.exitCode);
    const payload: HookEventPayload = {
      type: 'hook',
      hookType: result.hookType,
      exitCode: result.exitCode,
      stderr: result.stderr,
      filePath: result.filePath,
      toolName: result.toolName,
    };

    return createTaskEvent('hook', severity, taskId, tenantId, payload);
  }

  private mapSeverity(exitCode: number): EventSeverity {
    switch (exitCode) {
      case 0: return 'info';
      case 2: return 'warning';
      default: return 'error';
    }
  }
}
```

### 3.4 TransitionTrigger

```typescript
// packages/api/src/services/transition-trigger.ts

import { TaskState, FEEDBACK_LOOP_TRIGGERS, type TaskEvent } from '@foundry-x/shared';
import type { TaskStateService } from './task-state-service.js';
import type { EventBus } from './event-bus.js';

/**
 * EventBus 구독자 — 이벤트 기반으로 FEEDBACK_LOOP 자동 전이 트리거
 * PRD §3.3: FEEDBACK_LOOP_TRIGGERS 매핑 참조
 */
export class TransitionTrigger {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private taskStateService: TaskStateService,
    private eventBus: EventBus,
  ) {}

  /** EventBus에 등록 — 에러/크리티컬 이벤트만 처리 */
  start(): void {
    this.unsubscribe = this.eventBus.subscribe('*', async (event) => {
      if (event.severity !== 'error' && event.severity !== 'critical') return;
      await this.handleEvent(event);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private async handleEvent(event: TaskEvent): Promise<void> {
    // 현재 태스크 상태 조회
    const current = await this.taskStateService.getState(event.taskId, event.tenantId);
    if (!current) return;

    // FEEDBACK_LOOP_TRIGGERS에서 현재 상태의 트리거 소스 확인
    const triggers = FEEDBACK_LOOP_TRIGGERS[current.currentState];
    if (!triggers || !triggers.includes(event.source)) return;

    // 자동 전이: 현재 상태 → FEEDBACK_LOOP
    await this.taskStateService.transition(
      {
        taskId: event.taskId,
        toState: TaskState.FEEDBACK_LOOP,
        triggerSource: event.source,
        triggerEvent: event.id,
        metadata: { autoTriggered: true, eventSeverity: event.severity },
      },
      event.tenantId,
      'system:transition-trigger',
    );
  }
}
```

### 3.5 ExecutionEventService (D1 CRUD)

```typescript
// packages/api/src/services/execution-event-service.ts

import type { TaskEvent } from '@foundry-x/shared';

export interface ExecutionEventRecord {
  id: string;
  taskId: string;
  tenantId: string;
  source: string;
  severity: string;
  payload: string;
  createdAt: string;
}

export class ExecutionEventService {
  constructor(private db: D1Database) {}

  /** TaskEvent를 D1에 기록 */
  async record(event: TaskEvent): Promise<void> {
    await this.db.prepare(
      `INSERT INTO execution_events (id, task_id, tenant_id, source, severity, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      event.id, event.taskId, event.tenantId,
      event.source, event.severity,
      JSON.stringify(event.payload),
      event.timestamp,
    ).run();
  }

  /** 태스크별 이벤트 이력 조회 */
  async listByTask(
    taskId: string,
    tenantId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: ExecutionEventRecord[]; total: number }> {
    const countRow = await this.db.prepare(
      'SELECT COUNT(*) as total FROM execution_events WHERE task_id = ? AND tenant_id = ?'
    ).bind(taskId, tenantId).first<{ total: number }>();

    const { results } = await this.db.prepare(
      `SELECT * FROM execution_events WHERE task_id = ? AND tenant_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(taskId, tenantId, limit, offset).all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  /** 소스별 이벤트 이력 조회 */
  async listBySource(
    tenantId: string,
    source: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: ExecutionEventRecord[]; total: number }> {
    const countRow = await this.db.prepare(
      'SELECT COUNT(*) as total FROM execution_events WHERE tenant_id = ? AND source = ?'
    ).bind(tenantId, source).first<{ total: number }>();

    const { results } = await this.db.prepare(
      `SELECT * FROM execution_events WHERE tenant_id = ? AND source = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(tenantId, source, limit, offset).all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  private toRecord(row: Record<string, unknown>): ExecutionEventRecord {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      source: row.source as string,
      severity: row.severity as string,
      payload: row.payload as string,
      createdAt: row.created_at as string,
    };
  }
}
```

### 3.6 D1 Migration

```sql
-- 0096_execution_events.sql

CREATE TABLE IF NOT EXISTS execution_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ee_task ON execution_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ee_tenant_source ON execution_events(tenant_id, source, created_at DESC);
```

### 3.7 Zod 스키마

```typescript
// packages/api/src/schemas/execution-event.ts

import { z } from '@hono/zod-openapi';

export const ExecutionEventRecordSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  source: z.string(),
  severity: z.string(),
  payload: z.string().nullable(),
  created_at: z.string(),
});

export const ExecutionEventListSchema = z.object({
  items: z.array(ExecutionEventRecordSchema),
  total: z.number(),
});
```

### 3.8 API Route

```typescript
// packages/api/src/routes/execution-events.ts

// GET /execution-events?taskId=xxx&source=hook&limit=20&offset=0
// - taskId 필수: 태스크별 이벤트 조회
// - source 선택: 소스 필터링
// - limit/offset: 페이지네이션
```

## 4. 테스트 계획

### 4.1 단위 테스트

| # | 테스트 파일 | 대상 | 테스트 케이스 | 건수 |
|---|-----------|------|-------------|------|
| 1 | `event-bus.test.ts` | EventBus | emit/subscribe, 다중 구독자, 소스별 필터, unsubscribe, 와일드카드, 비동기 핸들러, clear | ~10 |
| 2 | `hook-result-processor.test.ts` | HookResultProcessor | exit 0→info, exit 1→error, exit 2→warning, stderr 전달, hookType 구분, filePath/toolName | ~8 |
| 3 | `transition-trigger.test.ts` | TransitionTrigger | FEEDBACK_LOOP 자동 전이, 트리거 없는 상태 skip, info severity skip, 태스크 미존재 skip, 다중 이벤트 순차 처리 | ~10 |
| 4 | `execution-event-service.test.ts` | ExecutionEventService | record, listByTask, listBySource, pagination, empty results | ~8 |
| 5 | `execution-events-route.test.ts` | API route | GET 200, 필터링, 인증 실패 401, 빈 결과 | ~5 |
| 6 | `task-event-shared.test.ts` | createTaskEvent | 5종 payload, id 고유성, timestamp | ~5 |
| | | | **합계** | **~46** |

### 4.2 통합 테스트 시나리오

```
[시나리오 1: Hook 실패 → FEEDBACK_LOOP 자동 진입]

1. TaskStateService.createTask(taskId) → INTAKE
2. transition(INTAKE → SPEC_DRAFTING → CODE_GENERATING)
3. HookResultProcessor.process({ exitCode: 1 }) → TaskEvent { source:'hook', severity:'error' }
4. EventBus.emit(event)
5. 검증: TransitionTrigger가 CODE_GENERATING → FEEDBACK_LOOP 전이 트리거
6. 검증: execution_events에 이벤트 기록됨
```

```
[시나리오 2: Hook 성공 → 전이 없음]

1. 태스크가 CODE_GENERATING 상태
2. HookResultProcessor.process({ exitCode: 0 }) → TaskEvent { source:'hook', severity:'info' }
3. EventBus.emit(event)
4. 검증: TransitionTrigger가 info severity를 무시
5. 검증: execution_events에 이벤트 기록됨 (텔레메트리)
```

```
[시나리오 3: 트리거 매핑 미존재 → skip]

1. 태스크가 INTAKE 상태 (FEEDBACK_LOOP_TRIGGERS에 INTAKE 없음)
2. EventBus.emit({ source:'hook', severity:'error' })
3. 검증: 전이 발생 안 함 (INTAKE에는 hook 트리거 없음)
```

## 5. 파일 목록 및 Worker 매핑

**단일 구현** (Worker 분리 불필요 — 모든 파일이 밀접하게 연관)

| # | 파일 | 패키지 | 동작 | 신규/수정 |
|---|------|--------|------|----------|
| 1 | `packages/shared/src/task-event.ts` | shared | TaskEvent 타입 5종 + 헬퍼 | 신규 |
| 2 | `packages/shared/src/index.ts` | shared | task-event.ts re-export 추가 | 수정 |
| 3 | `packages/api/src/services/event-bus.ts` | api | EventBus 클래스 | 신규 |
| 4 | `packages/api/src/services/hook-result-processor.ts` | api | exit code→TaskEvent | 신규 |
| 5 | `packages/api/src/services/execution-event-service.ts` | api | D1 CRUD | 신규 |
| 6 | `packages/api/src/services/transition-trigger.ts` | api | EventBus→전이 자동화 | 신규 |
| 7 | `packages/api/src/schemas/execution-event.ts` | api | Zod 스키마 | 신규 |
| 8 | `packages/api/src/routes/execution-events.ts` | api | GET API | 신규 |
| 9 | `packages/api/src/app.ts` | api | execution-events route 등록 | 수정 |
| 10 | `packages/api/src/db/migrations/0096_execution_events.sql` | api | D1 테이블 | 신규 |
| 11 | `packages/api/src/__tests__/event-bus.test.ts` | api | 테스트 | 신규 |
| 12 | `packages/api/src/__tests__/hook-result-processor.test.ts` | api | 테스트 | 신규 |
| 13 | `packages/api/src/__tests__/transition-trigger.test.ts` | api | 테스트 | 신규 |
| 14 | `packages/api/src/__tests__/execution-event-service.test.ts` | api | 테스트 | 신규 |
| 15 | `packages/api/src/__tests__/execution-events-route.test.ts` | api | 테스트 | 신규 |
| 16 | `packages/api/src/__tests__/task-event-shared.test.ts` | api | 테스트 | 신규 |

## 6. GAN 잔여이슈 해결

| 이슈 | 내용 | 해결 방법 |
|------|------|----------|
| N2 (Event 소스 정규화) | 이벤트 소스가 문자열로 산발적 사용 | TaskEventSource 타입으로 통일 (shared) |
| N6 (Hook 환경 변수) | Hook script에 taskId 전달 방법 미정 | HookResultProcessor가 context에서 taskId를 주입 (런타임 바인딩) |

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 1.0 | 2026-04-05 | 초안 | Claude Opus 4.6 |
