---
code: FX-DSGN-S148
title: "Sprint 148 — F333 TaskState Machine Design"
version: "1.0"
status: Active
category: DSGN
feature: F333
sprint: 148
phase: "Phase 14 — Agent Orchestration Infrastructure"
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
req: FX-REQ-325
plan: "[[FX-PLAN-S148]]"
---

# Sprint 148 Design — F333 TaskState Machine

## 1. 개요

Phase 14 Foundation v1 — 에이전트 태스크 상태머신의 핵심 인프라.
10-state enum, 전이 규칙, D1 이력 테이블, REST API 2건, TransitionGuard.

**근거:** FX-Unified-Integration-Plan.md §3.3 TaskState Machine + §4.2 Sprint 99(→148) Foundation v1

## 2. 아키텍처

```
packages/shared/src/task-state.ts     ← TaskState enum + types (Layer 0 core)
        ↓ (import)
packages/api/src/
  ├── services/task-state-service.ts  ← D1 CRUD + 이력 기록
  ├── services/transition-guard.ts    ← 전이 허용 검증
  ├── schemas/task-state.ts           ← Zod 스키마
  ├── routes/task-state.ts            ← REST API
  └── db/migrations/0095_task_states.sql
```

## 3. 상세 설계

### 3.1 TaskState enum (shared)

```typescript
// packages/shared/src/task-state.ts

export enum TaskState {
  INTAKE          = 'INTAKE',
  SPEC_DRAFTING   = 'SPEC_DRAFTING',
  CODE_GENERATING = 'CODE_GENERATING',
  TEST_RUNNING    = 'TEST_RUNNING',
  SYNC_VERIFYING  = 'SYNC_VERIFYING',
  PR_OPENED       = 'PR_OPENED',
  FEEDBACK_LOOP   = 'FEEDBACK_LOOP',
  REVIEW_PENDING  = 'REVIEW_PENDING',
  COMPLETED       = 'COMPLETED',
  FAILED          = 'FAILED',
}

export const TASK_STATES = Object.values(TaskState);

export const TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.INTAKE]:          [TaskState.SPEC_DRAFTING],
  [TaskState.SPEC_DRAFTING]:   [TaskState.CODE_GENERATING, TaskState.FEEDBACK_LOOP],
  [TaskState.CODE_GENERATING]: [TaskState.TEST_RUNNING, TaskState.FEEDBACK_LOOP],
  [TaskState.TEST_RUNNING]:    [TaskState.SYNC_VERIFYING, TaskState.FEEDBACK_LOOP],
  [TaskState.SYNC_VERIFYING]:  [TaskState.PR_OPENED, TaskState.FEEDBACK_LOOP],
  [TaskState.PR_OPENED]:       [TaskState.FEEDBACK_LOOP, TaskState.REVIEW_PENDING],
  [TaskState.FEEDBACK_LOOP]:   [TaskState.SPEC_DRAFTING, TaskState.CODE_GENERATING, TaskState.TEST_RUNNING, TaskState.FAILED],
  [TaskState.REVIEW_PENDING]:  [TaskState.COMPLETED, TaskState.FEEDBACK_LOOP],
  [TaskState.COMPLETED]:       [],
  [TaskState.FAILED]:          [TaskState.INTAKE],
};

// F334에서 사용할 트리거 매핑 (F333에서는 타입 정의만)
export type EventSource = 'hook' | 'ci' | 'review' | 'discriminator' | 'sync' | 'manual';

export const FEEDBACK_LOOP_TRIGGERS: Partial<Record<TaskState, EventSource[]>> = {
  [TaskState.SPEC_DRAFTING]:   ['discriminator'],
  [TaskState.CODE_GENERATING]: ['hook', 'discriminator'],
  [TaskState.TEST_RUNNING]:    ['ci'],
  [TaskState.SYNC_VERIFYING]:  ['sync'],
  [TaskState.PR_OPENED]:       ['ci', 'review'],
  [TaskState.REVIEW_PENDING]:  ['review'],
};

export function isValidTransition(from: TaskState, to: TaskState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(state: TaskState): TaskState[] {
  return TRANSITIONS[state] ?? [];
}

// 타입: 상태 전이 요청/결과
export interface TransitionRequest {
  taskId: string;
  toState: TaskState;
  triggerSource?: EventSource;
  triggerEvent?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  timestamp: string;
  guardMessage?: string;
}

export interface TaskStateRecord {
  id: string;
  taskId: string;
  tenantId: string;
  currentState: TaskState;
  agentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStateHistoryRecord {
  id: string;
  taskId: string;
  tenantId: string;
  fromState: TaskState;
  toState: TaskState;
  triggerSource: EventSource | null;
  triggerEvent: string | null;
  guardResult: string | null;
  transitionedBy: string | null;
  createdAt: string;
}
```

### 3.2 D1 Migration

```sql
-- 0095_task_states.sql

-- 현재 태스크 상태
CREATE TABLE IF NOT EXISTS task_states (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'INTAKE',
  agent_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_states_task ON task_states(task_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_states_tenant ON task_states(tenant_id, current_state);

-- 전이 이력
CREATE TABLE IF NOT EXISTS task_state_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  trigger_source TEXT,
  trigger_event TEXT,
  guard_result TEXT,
  transitioned_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tsh_task ON task_state_history(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tsh_tenant ON task_state_history(tenant_id, created_at DESC);
```

### 3.3 TransitionGuard

```typescript
// packages/api/src/services/transition-guard.ts

export interface GuardContext {
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  tenantId: string;
  triggerSource?: EventSource;
  metadata?: Record<string, unknown>;
}

export interface GuardResult {
  allowed: boolean;
  message?: string;
}

export type GuardFn = (ctx: GuardContext) => Promise<GuardResult> | GuardResult;

export class TransitionGuard {
  private guards: GuardFn[] = [];

  register(guard: GuardFn): void {
    this.guards.push(guard);
  }

  async check(ctx: GuardContext): Promise<GuardResult> {
    // 1. 기본: TRANSITIONS 맵 검증
    if (!isValidTransition(ctx.fromState, ctx.toState)) {
      return {
        allowed: false,
        message: `Transition ${ctx.fromState} → ${ctx.toState} is not allowed`,
      };
    }

    // 2. 등록된 커스텀 가드 순회
    for (const guard of this.guards) {
      const result = await guard(ctx);
      if (!result.allowed) return result;
    }

    return { allowed: true };
  }
}

// 기본 가드 인스턴스 (F333: 전이 규칙만 검증, F334+에서 가드 추가)
export function createDefaultGuard(): TransitionGuard {
  return new TransitionGuard();
}
```

### 3.4 TaskStateService

```typescript
// packages/api/src/services/task-state-service.ts

export class TaskStateService {
  constructor(
    private db: D1Database,
    private guard: TransitionGuard,
  ) {}

  async getState(taskId: string, tenantId: string): Promise<TaskStateRecord | null>;
  async getHistory(taskId: string, tenantId: string, limit?: number): Promise<TaskStateHistoryRecord[]>;
  async createTask(taskId: string, tenantId: string, agentId?: string, metadata?: Record<string, unknown>): Promise<TaskStateRecord>;
  async transition(req: TransitionRequest, tenantId: string, userId?: string): Promise<TransitionResult>;
  async listByState(tenantId: string, state: TaskState, limit?: number, offset?: number): Promise<{ items: TaskStateRecord[]; total: number }>;
}
```

**주요 메서드:**

- `getState`: task_states 조회 (UNIQUE index 활용)
- `getHistory`: task_state_history 최신순 조회
- `createTask`: 초기 상태(INTAKE) task_states INSERT
- `transition`: 가드 체크 → task_states UPDATE → task_state_history INSERT
- `listByState`: 테넌트별 특정 상태 목록

### 3.5 Zod 스키마

```typescript
// packages/api/src/schemas/task-state.ts

export const TaskStateEnum = z.enum([...TASK_STATES]);

export const TaskStateRecordSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  current_state: TaskStateEnum,
  agent_id: z.string().nullable(),
  metadata: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("TaskStateRecord");

export const TaskStateHistorySchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  from_state: TaskStateEnum,
  to_state: TaskStateEnum,
  trigger_source: z.string().nullable(),
  trigger_event: z.string().nullable(),
  guard_result: z.string().nullable(),
  transitioned_by: z.string().nullable(),
  created_at: z.string(),
}).openapi("TaskStateHistory");

export const TransitionRequestSchema = z.object({
  toState: TaskStateEnum,
  triggerSource: z.enum(['hook', 'ci', 'review', 'discriminator', 'sync', 'manual']).optional(),
  triggerEvent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("TransitionRequest");

export const TransitionResultSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  fromState: TaskStateEnum,
  toState: TaskStateEnum,
  timestamp: z.string(),
  guardMessage: z.string().optional(),
}).openapi("TransitionResult");

export const TaskStateDetailSchema = z.object({
  state: TaskStateRecordSchema,
  history: z.array(TaskStateHistorySchema),
  availableTransitions: z.array(TaskStateEnum),
}).openapi("TaskStateDetail");

export const CreateTaskStateRequestSchema = z.object({
  taskId: z.string().min(1),
  agentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("CreateTaskStateRequest");

export const TaskStateListSchema = z.object({
  items: z.array(TaskStateRecordSchema),
  total: z.number(),
}).openapi("TaskStateList");
```

### 3.6 REST API Routes

```typescript
// packages/api/src/routes/task-state.ts

// GET  /api/task-states/:taskId          → 현재 상태 + 최근 이력 10건 + 가용 전이
// POST /api/task-states                  → 태스크 생성 (초기 INTAKE)
// POST /api/task-states/:taskId/transition → 상태 전이
// GET  /api/task-states                  → 테넌트별 목록 (state 필터, 페이징)
```

**인증:** 기존 `authMiddleware` + `tenantGuard` 적용 (app.ts에서 `/api/*`에 이미 적용됨)

### 3.7 app.ts 등록

```typescript
// app.ts에 추가
import { taskStateRoute } from "./routes/task-state.js";
// ...
app.route("/api", taskStateRoute);
```

## 4. 테스트 설계

### 4.1 shared 단위 테스트 (task-state.test.ts, ~12건)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | `isValidTransition(INTAKE, SPEC_DRAFTING)` → true | 정상 전이 |
| 2 | `isValidTransition(INTAKE, COMPLETED)` → false | 불가 전이 |
| 3 | `isValidTransition(COMPLETED, X)` → false (모든 X) | 종료 상태 |
| 4 | `isValidTransition(FAILED, INTAKE)` → true | 재시작 |
| 5 | `getAvailableTransitions(INTAKE)` → [SPEC_DRAFTING] | 가용 목록 |
| 6 | `getAvailableTransitions(COMPLETED)` → [] | 빈 목록 |
| 7 | FEEDBACK_LOOP → 4 targets | 루프 탈출 |
| 8 | 모든 상태 → TRANSITIONS 키에 존재 | 완전성 |
| 9 | TASK_STATES.length === 10 | enum 크기 |
| 10 | FEEDBACK_LOOP_TRIGGERS 키가 유효한 TaskState | 타입 안전 |
| 11 | 순방향 경로: INTAKE→...→COMPLETED 도달 가능 | 도달성 |
| 12 | FAILED에서 INTAKE 거쳐 재시작 가능 | 복구 경로 |

### 4.2 TransitionGuard 단위 테스트 (~8건)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 유효 전이 + 가드 없음 → allowed | 기본 허용 |
| 2 | 무효 전이 → not allowed + 메시지 | 기본 거부 |
| 3 | 커스텀 가드 등록 → 호출됨 | 확장점 |
| 4 | 커스텀 가드 거부 → not allowed | 가드 우선 |
| 5 | 여러 가드 → 첫 거부에서 중단 | 단락 평가 |
| 6 | 비동기 가드 → 정상 동작 | async 지원 |
| 7 | 빈 가드 목록 → 전이 규칙만 | 최소 동작 |
| 8 | COMPLETED→X → 모두 거부 | 종료 상태 보호 |

### 4.3 TaskStateService 통합 테스트 (~15건)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | createTask → INTAKE 상태 생성 | 초기화 |
| 2 | getState → 생성된 상태 조회 | 조회 |
| 3 | getState(없는 ID) → null | 부재 |
| 4 | transition INTAKE→SPEC_DRAFTING → success | 정상 전이 |
| 5 | transition 후 getState → 새 상태 | 상태 갱신 |
| 6 | transition 후 getHistory → 이력 기록됨 | 이력 |
| 7 | 무효 전이 → success=false, guardMessage | 거부 |
| 8 | 중복 createTask(같은 taskId) → 에러 | 유니크 |
| 9 | listByState → 필터된 목록 | 목록 |
| 10 | listByState 페이징 → offset/limit 동작 | 페이징 |
| 11 | 연속 전이: INTAKE→SPEC→CODE→TEST | 워크플로우 |
| 12 | FEEDBACK_LOOP 진입→탈출 | 루프 사이클 |
| 13 | FAILED→INTAKE 재시작 | 복구 |
| 14 | metadata 저장/조회 | JSON 필드 |
| 15 | triggerSource 이력 기록 | 감사 추적 |

### 4.4 API Route 통합 테스트 (~15건)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | POST /task-states → 201 + INTAKE | 생성 |
| 2 | GET /task-states/:taskId → 200 + detail | 조회 |
| 3 | GET /task-states/:taskId (없는 ID) → 404 | 부재 |
| 4 | POST /task-states/:taskId/transition → 200 | 전이 |
| 5 | POST transition 무효 → 400 + guardMessage | 거부 |
| 6 | POST transition 잘못된 toState → 400 | 스키마 검증 |
| 7 | GET /task-states → 목록 + total | 목록 |
| 8 | GET /task-states?state=INTAKE → 필터 | 필터 |
| 9 | GET /task-states?limit=5&offset=0 → 페이징 | 페이징 |
| 10 | POST /task-states 중복 taskId → 409 | 충돌 |
| 11 | availableTransitions 포함 확인 | UX |
| 12 | history 최신순 정렬 확인 | 정렬 |
| 13 | metadata JSON 왕복 | JSON 직렬화 |
| 14 | triggerSource 기록 확인 | 감사 |
| 15 | 잘못된 body → 400 Zod 에러 | 입력 검증 |

## 5. 파일 매핑 (구현 순서)

| 순서 | 파일 | 신규/수정 | 의존 |
|------|------|----------|------|
| 1 | `packages/shared/src/task-state.ts` | 신규 | 없음 |
| 2 | `packages/shared/src/index.ts` | 수정 | #1 |
| 3 | `packages/api/src/db/migrations/0095_task_states.sql` | 신규 | 없음 |
| 4 | `packages/api/src/services/transition-guard.ts` | 신규 | #1 |
| 5 | `packages/api/src/services/task-state-service.ts` | 신규 | #1, #4 |
| 6 | `packages/api/src/schemas/task-state.ts` | 신규 | #1 |
| 7 | `packages/api/src/routes/task-state.ts` | 신규 | #5, #6 |
| 8 | `packages/api/src/app.ts` | 수정 | #7 |
| 9 | `packages/shared/src/__tests__/task-state.test.ts` | 신규 | #1 |
| 10 | `packages/api/src/__tests__/transition-guard.test.ts` | 신규 | #4 |
| 11 | `packages/api/src/__tests__/task-state-service.test.ts` | 신규 | #5 |
| 12 | `packages/api/src/__tests__/task-state-route.test.ts` | 신규 | #7 |

## 6. 하위 호환 및 마이그레이션

- **기존 API 변경 없음** — 새 route 추가만
- **shared 패키지** — 새 파일 + index.ts re-export 추가만
- **D1** — 새 테이블 2개, 기존 테이블 변경 없음
- **F334 확장점** — TransitionGuard.register()로 커스텀 가드 추가 가능
- **F334 확장점** — FEEDBACK_LOOP_TRIGGERS 매핑은 정의만 (Event Bus가 실제 활용)
