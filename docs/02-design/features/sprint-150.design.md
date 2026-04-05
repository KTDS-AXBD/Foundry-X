---
code: FX-DSGN-S150
title: "Sprint 150 — F335 Orchestration Loop Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 150
feature: F335
phase: 14
---

# Sprint 150 Design — F335 Orchestration Loop

> Phase 14 Foundation v3 — 이벤트 기반 피드백 루프의 전체 사이클 구현

## 1. 개요

F333(TaskState) + F334(Hook+EventBus) 위에 OrchestrationLoop를 구현하여 "이벤트 → 상태 전이 → 에이전트 재시도 → 수렴 판정" 전체 흐름을 완성한다.

### 1.1 아키텍처 위치 (Layer 3)

```
[Layer 0] TaskState (F333 ✅)
    ↓
[Layer 1] Hook System (F334 ✅) — Shell subprocess → HookResultProcessor
    ↓
[Layer 2] Event Bus (F334 ✅) — 이벤트 정규화 + 발행/구독
    ↓
[Layer 3] Orchestration Loop (F335 🎯) — 피드백 루프 + AgentAdapter
    ↓
[Layer 4] Telemetry (F335 🎯) — Event Bus 구독 → D1 기록
```

## 2. 타입 설계

### 2.1 LoopMode + FeedbackLoopContext

```typescript
// packages/shared/src/orchestration.ts

type LoopMode = 'retry' | 'adversarial' | 'fix';

interface FeedbackLoopContext {
  id: string;
  taskId: string;
  tenantId: string;
  entryState: TaskState;        // 어디서 FEEDBACK_LOOP에 진입했나
  triggerEvent: TaskEvent;      // 진입 트리거 이벤트
  loopMode: LoopMode;           // 루프 모드
  currentRound: number;         // 현재 라운드 (1-based)
  maxRounds: number;            // 상한 (기본 3)
  exitTarget: TaskState;        // 성공 시 돌아갈 상태
  convergence: ConvergenceCriteria;
  history: LoopRoundResult[];   // 각 라운드 결과
  status: 'active' | 'resolved' | 'exhausted' | 'escalated';
  createdAt: string;
  updatedAt: string;
}

interface ConvergenceCriteria {
  minQualityScore: number;      // 기본 0.7
  maxRounds: number;            // 기본 3
  requiredConsecutivePass: number; // 기본 1
}

interface LoopRoundResult {
  round: number;
  agentName: string;
  qualityScore: number | null;
  feedback: string[];
  status: 'pass' | 'fail' | 'error';
  durationMs: number;
  timestamp: string;
}
```

### 2.2 LoopOutcome

```typescript
type LoopOutcome =
  | { status: 'resolved'; exitState: TaskState; rounds: number; finalScore: number }
  | { status: 'exhausted'; rounds: number; bestScore: number; residualIssues: string[] }
  | { status: 'escalated'; reason: string; round: number };
```

### 2.3 AgentAdapter 인터페이스

```typescript
interface AgentAdapter {
  name: string;
  role: 'generator' | 'discriminator' | 'orchestrator';
  
  /** 에이전트 실행 — 피드백 컨텍스트 기반 재시도 */
  execute(context: AgentExecutionContext): Promise<AgentResult>;
}

interface AgentExecutionContext {
  taskId: string;
  tenantId: string;
  round: number;
  loopMode: LoopMode;
  previousFeedback: string[];
  metadata?: Record<string, unknown>;
}

interface AgentResult {
  success: boolean;
  qualityScore: number | null;   // 0.0 ~ 1.0
  feedback: string[];
  artifacts?: Record<string, unknown>;
}
```

## 3. 서비스 설계

### 3.1 OrchestrationLoop

```typescript
// packages/api/src/services/orchestration-loop.ts

class OrchestrationLoop {
  constructor(
    private taskStateService: TaskStateService,
    private eventBus: EventBus,
    private db: D1Database,
  ) {}

  /**
   * 루프 실행 — FEEDBACK_LOOP 상태에서만 호출 가능
   * 
   * 흐름:
   * 1. FeedbackLoopContext 생성
   * 2. 모드별 에이전트 실행 (retry/adversarial/fix)
   * 3. 수렴 판정
   * 4. 수렴 시 exitTarget으로 전이, 미수렴 시 FAILED
   */
  async run(params: LoopStartParams): Promise<LoopOutcome>

  // ─── 모드별 라운드 실행 ───
  
  /** retry: 같은 에이전트에 실패 컨텍스트 전달 → 재실행 */
  private async runRetryRound(ctx: FeedbackLoopContext, agent: AgentAdapter): Promise<LoopRoundResult>
  
  /** adversarial: Generator 실행 → Discriminator 평가 → 피드백 */
  private async runAdversarialRound(ctx: FeedbackLoopContext, generator: AgentAdapter, discriminator: AgentAdapter): Promise<LoopRoundResult>
  
  /** fix: 에러 컨텍스트 → 수정 생성 → 검증 */
  private async runFixRound(ctx: FeedbackLoopContext, fixer: AgentAdapter): Promise<LoopRoundResult>

  /** 수렴 판정 */
  private checkConvergence(ctx: FeedbackLoopContext, result: LoopRoundResult): boolean
}

interface LoopStartParams {
  taskId: string;
  tenantId: string;
  loopMode: LoopMode;
  agents: AgentAdapter[];
  convergence?: Partial<ConvergenceCriteria>;
  metadata?: Record<string, unknown>;
}
```

### 3.2 TelemetryCollector

```typescript
// packages/api/src/services/telemetry-collector.ts

class TelemetryCollector {
  constructor(private db: D1Database) {}

  /** EventBus에 구독하여 모든 이벤트를 D1에 기록 */
  subscribe(eventBus: EventBus): () => void

  /** 특정 태스크의 텔레메트리 이벤트 조회 */
  async getEvents(taskId: string, tenantId: string, limit?: number): Promise<ExecutionEventRecord[]>

  /** 소스별 이벤트 수 집계 */
  async getEventCounts(tenantId: string, since?: string): Promise<Record<string, number>>
}

interface ExecutionEventRecord {
  id: string;
  taskId: string;
  tenantId: string;
  source: string;
  severity: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}
```

## 4. API 라우트 설계

### 4.1 신규 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/task-states/:taskId/loop` | 루프 시작 |
| GET | `/task-states/:taskId/loop-history` | 루프 이력 조회 |
| GET | `/telemetry/events` | 텔레메트리 이벤트 조회 |

### 4.2 POST /task-states/:taskId/loop

```typescript
// Request
{
  loopMode: 'retry' | 'adversarial' | 'fix',
  agentNames: string[],       // AgentAdapter 이름 목록
  convergence?: {
    minQualityScore?: number,  // default 0.7
    maxRounds?: number,        // default 3
  },
  metadata?: Record<string, unknown>,
}

// Response 200
{
  outcome: LoopOutcome,
  context: FeedbackLoopContext,
}
```

### 4.3 GET /task-states/:taskId/loop-history

```typescript
// Response 200
{
  items: FeedbackLoopContext[],  // 최신순
  total: number,
}
```

### 4.4 GET /telemetry/events

```typescript
// Query: ?taskId=xxx&source=hook&limit=50
// Response 200
{
  items: ExecutionEventRecord[],
  total: number,
}
```

## 5. D1 마이그레이션

### 0097_loop_contexts.sql

```sql
CREATE TABLE IF NOT EXISTS loop_contexts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  entry_state TEXT NOT NULL,
  trigger_event_id TEXT,
  loop_mode TEXT NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 3,
  exit_target TEXT NOT NULL,
  convergence TEXT,            -- JSON: ConvergenceCriteria
  history TEXT,                -- JSON: LoopRoundResult[]
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lc_task ON loop_contexts(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_tenant ON loop_contexts(tenant_id, status);
```

## 6. 테스트 설계

### 6.1 orchestration-loop.test.ts (~15 tests)

| 테스트 | 검증 내용 |
|--------|----------|
| retry 모드: 1회 성공 | 1라운드에서 qualityScore >= threshold → resolved |
| retry 모드: 3회 실패 | maxRounds 도달 → exhausted |
| adversarial 모드: Generator-Discriminator 대화 | G 생성 → D 평가 → 피드백 → G 재생성 |
| adversarial 모드: 수렴 | 2라운드에서 PASS → resolved |
| fix 모드: 에러 수정 | 에러 컨텍스트 기반 수정 → 검증 통과 |
| 수렴 판정: qualityScore 임계값 | 0.7 이상이면 pass |
| 수렴 판정: consecutivePass | 연속 pass 카운트 |
| FEEDBACK_LOOP 진입 검증 | 잘못된 상태에서 루프 시작 → 에러 |
| 상태 전이: 루프 완료 → exitTarget | resolved 시 exitTarget 상태로 전이 |
| 상태 전이: 루프 실패 → FAILED | exhausted 시 FAILED 상태로 전이 |

### 6.2 telemetry-collector.test.ts (~8 tests)

| 테스트 | 검증 내용 |
|--------|----------|
| 이벤트 기록 | EventBus emit → D1 execution_events INSERT |
| 이벤트 조회: taskId 필터 | 특정 태스크의 이벤트만 반환 |
| 이벤트 조회: source 필터 | hook, discriminator 등 소스별 필터 |
| 이벤트 수 집계 | 소스별 카운트 |
| limit/offset 페이징 | 대량 이벤트 페이징 |
| 빈 결과 | 존재하지 않는 태스크 → 빈 배열 |

### 6.3 orchestration-e2e.test.ts (~12 tests)

| 테스트 | 검증 내용 |
|--------|----------|
| POST /task-states/:id/loop — retry 성공 | 루프 시작 → resolved 반환 |
| POST /task-states/:id/loop — adversarial 수렴 | G-D 루프 → resolved |
| POST /task-states/:id/loop — exhausted | maxRounds 초과 → exhausted |
| POST /task-states/:id/loop — 잘못된 상태 | FEEDBACK_LOOP 아닌 상태 → 400 |
| GET /task-states/:id/loop-history | 루프 이력 반환 |
| GET /telemetry/events | 텔레메트리 이벤트 조회 |
| GET /telemetry/events?source=hook | 소스 필터 |
| 전체 흐름: 생성→전이→FEEDBACK_LOOP→루프→resolved | 엔드투엔드 |
| 전체 흐름: 생성→전이→FEEDBACK_LOOP→루프→FAILED | exhausted→FAILED 전이 |
| 텔레메트리 자동 기록 | 루프 중 이벤트가 execution_events에 기록됨 |
| 상태 이력 | loop 후 task_state_history에 전이 기록 |
| MockAdapter 동작 | MockAgentAdapter가 정상 작동 |

## 7. 변경 영향도

### 7.1 기존 코드 영향 없음 (Additive Only)

- 기존 90개 라우트: 변경 없음
- 기존 208개 서비스: 변경 없음
- 기존 105개 스키마: 변경 없음

### 7.2 수정 파일 (3개)

| 파일 | 변경 내용 |
|------|----------|
| `packages/shared/src/index.ts` | orchestration 타입 export 추가 (4줄) |
| `packages/api/src/app.ts` | orchestration 라우트 등록 (2줄) |
| `packages/api/src/services/transition-guard.ts` | convergence guard 등록 메서드는 이미 있음 (변경 불필요) |

## 8. 의도적 제외

| 항목 | 사유 | F-item |
|------|------|--------|
| 실제 에이전트 연동 | F336 범위 (AgentAdapter 래핑) | F336 |
| 대시보드 UI | F337 범위 | F337 |
| OpenSpace FIX 실제 스킬 수정 | Phase 14 이후 | Evolution Sprint |

## 9. Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F335 Orchestration Loop |
| Sprint | 150 |
| Phase | 14 (Foundation v3) |
| 예상 LOC | ~1150 |
| 신규 파일 | 10개 (shared 1 + services 3 + routes 1 + schemas 1 + migration 1 + tests 3) |
| 수정 파일 | 2개 (shared/index.ts, api/app.ts) |
| 테스트 | ~35건 (단위 15 + 텔레메트리 8 + E2E 12) |
| GAN 잔여 해결 | N1(FeedbackContext) + N4(Guard) + N5(수렴기준) |
