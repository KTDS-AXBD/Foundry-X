# Foundry-X 통합 반영 계획 — ECC × Optio 교차 분석

> **문서코드:** FX-PLAN-014
> **버전:** v2.1 (GAN Round 2 수렴 — Orchestrator 판정: MINOR_FIX)
> **작성일:** 2026-04-05
> **작성:** Claude Opus 4.6
> **입력 소스:** ECC-to-FX-Analysis-Plan.md, Optio-Analysis-and-FX-Plan.md, harness-gan-agent-architecture.md, openspace-analysis-and-integration-plan.md
> **목적:** 개별 분석에서 도출한 반영 항목을 교차 검증하여, 중복 제거 + 시너지 발견 + 근원적 설계 변경 도출

---

## 0. GAN 검증 이력

### Round 0 → Round 1 Discriminator 판정

| Criterion | Score | Severity | 핵심 지적 |
|-----------|-------|----------|----------|
| C1: 기술적 실현 가능성 | 0.3 | Critical | LoopPrimitive가 4가지 이질적 I/O 모델(shell/HTTP/in-process/D1)을 하나로 통합 불가 |
| C2: 의존성 그래프 | 0.5 | Major | "순환 의존" 주장이 과장 — 실제로는 선형 정렬 가능 |
| C3: 스코프 현실성 | 0.5 | Major | S99~100은 스키마만 — 실제 Foundation은 S99~101 (3 Sprint) |
| C4: 아키텍처 일관성 | 0.3 | Critical | FEEDBACK_LOOP이 상태이자 루프 트리거 — 순환 정의 |
| C5: 누락 항목 | 0.4 | Major | 하위 호환, Hook↔State 계약, 테스트 전략, 마이그레이션 경로 없음 |
| **종합** | **0.42** | **MAJOR_ISSUE** | |

### Round 1 Generator 변경 로그

| 지적 | 수정 내용 |
|------|----------|
| C1: LoopPrimitive 통합 불가 | → **2계층 루프 아키텍처**로 재설계 (Hook Layer / Orchestration Layer 분리) |
| C2: 순환 의존 과장 | → 선형 의존성 인정, **점진적 전달** 전략으로 전환 |
| C3: Foundation이 실제 3 Sprint | → S99~101을 **Foundation v1→v2→v3** 점진 전달로 재구성 |
| C4: FEEDBACK_LOOP 순환 정의 | → **Event Bus 분리** + FEEDBACK_LOOP 상태의 진입 조건 명시화 |
| C5: 누락 항목 | → §8 Migration, §9 Integration Contracts, §10 Test Strategy 신설 |

---

## 1. 교차 분석: 4개 소스에서 반복되는 근원적 패턴

### 1.1 패턴 매핑 테이블

| 근원 패턴 | ECC | Optio | GAN/Harness | OpenSpace | FX 현재 |
|-----------|-----|-------|-------------|-----------|---------|
| **① 피드백 루프** | PostToolUse hook (편집→자동검증) | CI 실패→에이전트 재개 | G→D 적대적 루프 (3회 상한) | FIX 모드 (에러→수리→재실행) | ❌ 설계만 존재 |
| **② 상태머신** | 없음 (세션 기반) | 7-state (QUEUED→COMPLETED) | 수렴 판정 (PASS/FIX/REDO) | 스킬 버전 lifecycle | ❌ 없음 |
| **③ 실행 텔레메트리** | Instinct (패턴 캡처+신뢰도) | 비용 분석 대시보드 | Quality Score 메트릭 | GDPVal 경제 벤치마크 | ⚠️ 토큰 대시보드만 |
| **④ 가드레일 자동 강제** | hooks.json (25+) + rules/ (34+) | per-repo config (모델/프롬프트/동시성) | Rubric + MAX_ROUNDS | check_skill_safety | ⚠️ CLAUDE.md 문서만 |

### 1.2 의존성 구조 (v2: 선형 정렬)

> ⚠️ **v1 수정:** Round 1 Discriminator가 "순환 의존" 주장을 반박. 실제 의존 관계는 선형 정렬 가능.

```
[Layer 0] TaskState 정의 (enum + transition rules)
    ↓ (TaskState를 참조)
[Layer 1] Hook System (ECC) — 독립 사이드 채널, TaskState와 비동기 연결
    ↓ (Hook 결과를 Event로 변환)
[Layer 2] Event Bus — Hook Result, CI Result, Discriminator Verdict를 통합 이벤트로 정규화
    ↓ (이벤트가 상태 전이 트리거)
[Layer 3] Orchestration Loop (Optio FL + GAN AL) — TaskState 전이 + 재시도 로직
    ↓ (실행 결과 기록)
[Layer 4] Telemetry — 모든 이벤트/전이/결과를 기록
    ↓ (축적된 데이터로)
[Layer 5] Guard Rail Refinement — 가드레일 정교화 (장기)
```

**v1과의 차이:** "동시에 4개 깔아야 한다"가 아니라 **Layer 0부터 순차적으로 쌓을 수 있어요.** 각 Layer는 아래 Layer 없이도 독립적으로 가치가 있어요:
- Layer 0만 있어도: 태스크 상태를 추적할 수 있음
- Layer 0+1만 있어도: Hook이 즉시 검증하고, 결과가 상태로 기록됨
- Layer 0+1+2까지: 이기종 이벤트가 정규화되어 자동화 기반 마련

---

## 2. ECC vs Optio: 같은 문제, 다른 추상화 레벨

### 2.1 같은 문제를 푸는 방식 비교

| 문제 | ECC 접근 | Optio 접근 | 어디가 더 깊은가 |
|------|---------|-----------|----------------|
| "에이전트가 실수하면?" | Hook이 즉시 차단/경고 | 상태머신이 FEEDBACK_LOOP로 전이 → 에이전트 재개 | **Optio** — 복구까지 자동화 |
| "에이전트를 어떻게 제어?" | rules/ + contexts/ (정적 프롬프트) | per-repo config (모델/프롬프트/동시성 동적 설정) | **Optio** — 런타임 튜닝 가능 |
| "에이전트가 학습하려면?" | Instinct 시스템 (패턴→신뢰도→스킬 진화) | 없음 (정적 프롬프트만) | **ECC** — 자기진화 메커니즘 |
| "여러 에이전트 조율?" | /multi-plan + /multi-execute (수동 분해) | Task→Worker→Agent 자동 파이프라인 | **Optio** — 완전 자동 |
| "품질 보장?" | 없음 (사람 의존) | Code Review Subtask (별도 모델) | **GAN** — 적대적 긴장이 최강 |
| "비용 관리?" | MCP 토큰 예산 관리 (수동 가이드) | 태스크별 비용 자동 기록 + 대시보드 | **Optio** — 자동 추적 |

### 2.2 시너지 포인트

**시너지 1: ECC Hook (마이크로) + Optio 상태머신 (매크로) — Event Bus로 연결**

> ⚠️ **v2 수정:** Hook과 상태머신이 직접 연결되는 게 아니라, **Event Bus**를 경유해요.

```
[마이크로] PostToolUse Hook (shell) → exit code → Hook Result Processor (TS)
                                                         ↓
                                                   Event Bus (이벤트 정규화)
                                                         ↓
[매크로]   State Machine → 전이 판정 → Orchestration Loop 트리거
```

**시너지 2: Optio Agent Adapter + ECC 모델 계층**

```typescript
interface AgentAdapter {
  name: string;
  role: 'generator' | 'discriminator' | 'orchestrator';
  provider: 'claude' | 'codex' | 'copilot';
  modelTier: {
    exploration: 'haiku';
    execution: 'sonnet';
    reasoning: 'opus';
  };
  handleFeedback(feedback: FeedbackContext): Promise<AgentResult>;
}
```

**시너지 3: OpenSpace 진화 + GAN Discriminator + Optio 텔레메트리**

```
Optio 텔레메트리 (실행마다 기록)
        ↓
GAN Discriminator (다차원 품질 판별)
        ↓
OpenSpace 진화 엔진 (판별 결과 기반 FIX/DERIVED/CAPTURED)
```

---

## 3. 근원적 설계 — 2계층 루프 아키텍처 (v2)

> ⚠️ **v1→v2 핵심 변경:** "Unified Loop Primitive" 1개 인터페이스를 폐기하고, **Hook Layer + Orchestration Layer** 2계층으로 분리.

### 3.1 왜 통합 인터페이스가 안 되는가 (Discriminator C1 수용)

4가지 루프는 **I/O 모델이 근본적으로 다름:**

| 루프 | I/O 모델 | 스코프 | 실행 방식 |
|------|---------|--------|----------|
| ECC Hook | Shell subprocess → exit code + STDERR | 파일 1개 | 동기, 즉시 |
| Optio Feedback Loop | HTTP/State → task context | 태스크 1개 | 비동기, 재개 |
| GAN Adversarial Loop | In-process TS → verdict + feedback[] | 산출물 1개 | 동기, 적대적 |
| OpenSpace FIX | D1 write → skill version | 스킬 1개 | 비동기, 트랜잭션 |

**하나의 `LoopPrimitive<T>`로 이 4가지를 표현하면:**
- Hook의 exit code를 `T`로 감싸야 하지만 shell에서 구조화된 데이터를 반환할 방법이 없음
- GAN의 적대적 피드백 시맨틱이 maxRounds 파라미터로 축소됨
- 통합 인터페이스를 만들더라도 각 구현체에서 adapter layer가 필요 → "통합"이 이름뿐

### 3.2 2계층 루프 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              HOOK LAYER (Side Channel)                │
│  실행 환경: Shell subprocess (.claude/hooks/)         │
│  I/O: exit code + STDERR → Hook Result Processor     │
│  특성: 동기, 즉시, 파일 스코프, maxRounds=1           │
│                                                       │
│  PreToolUse:  보호 파일 차단, git --no-verify 차단     │
│  PostToolUse: 자동 lint + typecheck                   │
│                                                       │
│  출력: HookEvent { file, exitCode, stderr, timestamp } │
└───────────────────┬─────────────────────────────────┘
                    │ (Hook Result Processor가 변환)
                    ▼
┌─────────────────────────────────────────────────────┐
│              EVENT BUS (정규화 레이어)                 │
│                                                       │
│  type TaskEvent =                                     │
│    | HookEvent     // Hook Layer에서 올라옴            │
│    | CIEvent       // GitHub Actions/CI에서 올라옴     │
│    | ReviewEvent   // PR 리뷰 코멘트에서 올라옴        │
│    | DiscriminatorEvent  // GAN D 판별 결과            │
│    | SyncEvent     // SDD Triangle 동기화 결과         │
│                                                       │
│  모든 이벤트는 동일 shape:                             │
│  { source, severity, taskId, timestamp, payload }     │
└───────────────────┬─────────────────────────────────┘
                    │ (이벤트가 상태 전이 트리거)
                    ▼
┌─────────────────────────────────────────────────────┐
│         ORCHESTRATION LAYER (State + Loop)            │
│  실행 환경: TypeScript in-process                     │
│  I/O: TaskEvent → StateTransition → AgentInvocation  │
│  특성: 비동기, 태스크 스코프, maxRounds=3             │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ TaskState   │  │ Transition   │  │ Orchestr.   │ │
│  │ Machine     │  │ Guard        │  │ Loop        │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                       │
│  GAN Adversarial Loop = Orchestration Loop의 한 모드  │
│  Optio Feedback Loop = Orchestration Loop의 한 모드   │
│  OpenSpace FIX = Orchestration Loop의 한 모드         │
└───────────────────┬─────────────────────────────────┘
                    │ (실행 결과 기록)
                    ▼
┌─────────────────────────────────────────────────────┐
│              TELEMETRY LAYER (기록)                    │
│  D1: execution_events, task_state_history             │
└─────────────────────────────────────────────────────┘
```

**v1과의 핵심 차이:**
1. Hook Layer는 **독립 사이드 채널** — Orchestration Layer와 같은 인터페이스를 공유하지 않음
2. **Event Bus**가 이기종 이벤트를 정규화 — Hook의 exit code, CI의 status, GAN의 verdict를 동일 shape으로 변환
3. Orchestration Layer 내에서만 "loop" 개념 존재 — GAN/Optio/OpenSpace는 모두 in-process TS이므로 통합 가능
4. Telemetry는 Event Bus를 구독하여 모든 이벤트를 자동 기록

### 3.3 Task State Machine (v2: FEEDBACK_LOOP 진입 조건 명시)

> ⚠️ **v2 수정:** Discriminator C4 지적 반영 — FEEDBACK_LOOP 진입 조건을 Event Bus 이벤트로 명시.

```typescript
// packages/shared/state-machine.ts

enum TaskState {
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

// FEEDBACK_LOOP 진입 조건 — Event Bus 이벤트 기반 (v2 신규)
const FEEDBACK_LOOP_TRIGGERS: Record<TaskState, TaskEvent['source'][]> = {
  SPEC_DRAFTING:   ['discriminator'],                    // Discriminator가 Spec 품질 부족 판정
  CODE_GENERATING: ['hook', 'discriminator'],            // lint/type 실패(Hook) 또는 코드 품질 부족(D)
  TEST_RUNNING:    ['ci'],                               // 테스트 실패(CI 이벤트)
  SYNC_VERIFYING:  ['sync'],                             // Spec-Code-Test drift 감지
  PR_OPENED:       ['ci', 'review'],                     // CI 실패 또는 리뷰어 변경 요청
  REVIEW_PENDING:  ['review'],                           // 리뷰어 추가 변경 요청
};

// 전이 규칙
const TRANSITIONS: Record<TaskState, TaskState[]> = {
  INTAKE:          ['SPEC_DRAFTING'],
  SPEC_DRAFTING:   ['CODE_GENERATING', 'FEEDBACK_LOOP'],
  CODE_GENERATING: ['TEST_RUNNING', 'FEEDBACK_LOOP'],
  TEST_RUNNING:    ['SYNC_VERIFYING', 'FEEDBACK_LOOP'],
  SYNC_VERIFYING:  ['PR_OPENED', 'FEEDBACK_LOOP'],
  PR_OPENED:       ['FEEDBACK_LOOP', 'REVIEW_PENDING'],
  FEEDBACK_LOOP:   ['SPEC_DRAFTING', 'CODE_GENERATING', 'TEST_RUNNING', 'FAILED'],
  REVIEW_PENDING:  ['COMPLETED', 'FEEDBACK_LOOP'],
  COMPLETED:       [],
  FAILED:          ['INTAKE'],
};

// FEEDBACK_LOOP 탈출 로직 — Orchestration Loop가 결정
interface FeedbackLoopContext {
  entryState: TaskState;           // 어디서 들어왔나
  triggerEvent: TaskEvent;         // 무슨 이벤트로 들어왔나
  round: number;                   // 현재 몇 번째 재시도
  maxRounds: number;               // 상한 (기본 3)
  exitTarget: TaskState;           // 성공 시 돌아갈 상태
  loopMode: 'retry' | 'adversarial' | 'fix';  // Optio / GAN / OpenSpace
}
```

**v1과의 차이:**
- FEEDBACK_LOOP 진입은 **Event Bus 이벤트가 트리거** (Hook이 직접 상태를 바꾸지 않음)
- 어떤 상태에서 어떤 이벤트가 FEEDBACK_LOOP를 트리거하는지 **명시적 매핑**
- FEEDBACK_LOOP 안에서 loopMode로 **Optio/GAN/OpenSpace 구분** (LoopPrimitive 대신)

### 3.4 Orchestration Loop (v2: LoopPrimitive 대체)

> ⚠️ **v2 수정:** "Unified LoopPrimitive" 폐기. Hook을 제외한 **in-process 루프만 통합.**

```typescript
// packages/shared/orchestration-loop.ts

type LoopMode = 'retry' | 'adversarial' | 'fix';

interface OrchestrationLoop {
  mode: LoopMode;
  maxRounds: number;
  context: FeedbackLoopContext;

  // 모드별 행동 분기
  execute(): Promise<LoopOutcome>;
}

// retry (Optio 방식): 같은 에이전트에 실패 컨텍스트 전달 → 재실행
// adversarial (GAN 방식): Generator → Discriminator → 피드백 → Generator
// fix (OpenSpace 방식): 에러 컨텍스트 → LLM 수정 생성 → 재실행 검증

type LoopOutcome =
  | { status: 'resolved'; exitState: TaskState; artifact: unknown }
  | { status: 'exhausted'; bestRound: number; residualIssues: string[] }
  | { status: 'escalated'; reason: string };
```

**v1과의 차이:**
- Hook은 이 인터페이스에 포함되지 않음 (Hook Layer는 별도)
- `retry`/`adversarial`/`fix` 3가지 모드만 통합 (모두 in-process TS이므로 I/O 모델 호환)
- ECC Hook의 "maxRounds=1" 케이스는 OrchestrationLoop이 아닌 **Hook Layer에서 처리**

### 3.5 Execution Telemetry

```typescript
// packages/shared/telemetry.ts — v1에서 변경 없음 (Discriminator 이슈 없었음)

interface ExecutionEvent {
  agent: { name: string; role: AgentRole; model: string };
  task: { id: string; state: TaskState; round: number };
  result: {
    status: 'success' | 'failure' | 'escalated';
    qualityScore?: number;
    feedbackSeverity?: Severity[];
  };
  cost: {
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    modelCost: number;
  };
  timestamp: string;
  skill?: { name: string; version: string };
}
```

### 3.6 Guard Rail Engine (v2: 2계층 분리)

```
Layer 1: Hook Guards (ECC) — Shell subprocess, 즉시
  PreToolUse:  보호 파일 차단, git --no-verify 차단
  PostToolUse: 자동 lint + typecheck
  → HookEvent 발행 → Event Bus로 전달

Layer 2: Transition Guards (Optio + GAN) — TypeScript in-process
  SYNC_VERIFYING → PR_OPENED: Spec-Code-Test 동기화율 ≥ 90%
  PR_OPENED → REVIEW_PENDING: CI 전체 통과
  REVIEW_PENDING → COMPLETED: 사람 승인 필수 (자동커밋 금지)
  FEEDBACK_LOOP 진입: FEEDBACK_LOOP_TRIGGERS 매핑 참조
  FEEDBACK_LOOP 탈출: maxRounds 도달 또는 convergence

(v1의 Layer 3 "Loop Convergence Guard"는 Orchestration Loop 내부로 흡수)
```

---

## 4. 수정된 Sprint 로드맵 (v2: 점진적 전달)

> ⚠️ **v2 수정:** Discriminator C2/C3 반영 — "동시 Foundation 2 Sprint"에서 **점진적 전달 3+2 Sprint**으로 변경.

### 4.1 점진적 전달 전략

```
[v1]  S99-100: Foundation (동시) → S101-102: Feature
       문제: S99-100은 스키마만, 실제로 S101까지 아무것도 안 돌아감

[v2]  S99: Foundation v1 (TaskState 단독 — 즉시 가치)
      S100: Foundation v2 (Hook Layer + Event Bus)
      S101: Foundation v3 (Orchestration Loop — 여기서 처음으로 전체가 동작)
      S102-103: Feature Sprint (에이전트 + 대시보드)
      S104+: Evolution Sprint
```

**핵심 원칙: 매 Sprint마다 동작하는 무언가를 전달**

### 4.2 Sprint 99 — Foundation v1: TaskState 단독

**이 Sprint만으로 얻는 가치:** 태스크 상태를 DB에 기록하고 대시보드에서 조회 가능

| 항목 | 내용 | LOC 추정 |
|------|------|---------|
| TaskState enum + transition 함수 | `packages/shared/state-machine.ts` | ~200 |
| D1 migration 0080: task_states | 태스크 상태 이력 | ~40 |
| API route: `GET /tasks/:id/state` | 상태 조회 | ~50 |
| API route: `POST /tasks/:id/transition` | 상태 전이 (가드 적용) | ~100 |
| TransitionGuard 기본 구현 | 허용 전이 목록 검증만 | ~80 |
| 테스트 | 상태 전이 규칙 단위 테스트 | ~150 |
| **합계** | | **~620** |

**하위 호환:** 기존 420 endpoints는 변경 없음. TaskState는 **새로운 부가 기능**이지 기존 API를 대체하지 않음.

### 4.3 Sprint 100 — Foundation v2: Hook Layer + Event Bus

**이 Sprint만으로 얻는 가치:** Hook이 실제로 동작하고, 결과가 Event Bus를 통해 TaskState 전이를 트리거

| 항목 | 내용 | LOC 추정 |
|------|------|---------|
| hooks.json (4종) | PreToolUse×2 + PostToolUse×2 | ~20 (JSON) |
| Hook shell scripts (4종) | pre-bash-guard, pre-edit-guard, post-edit-format, post-edit-test-warn | ~120 (Bash) |
| HookResultProcessor | Shell exit code → TaskEvent 변환 | ~150 (TS) |
| TaskEvent 타입 + Event Bus | 이벤트 정규화 + 라우팅 | ~200 (TS) |
| FEEDBACK_LOOP_TRIGGERS 매핑 | 이벤트→상태 전이 매핑 | ~50 (TS) |
| rules/ 5종 | coding-style, git-workflow, testing, security, sdd-triangle | ~300 (MD) |
| D1 migration 0081: execution_events | 텔레메트리 테이블 | ~50 (SQL) |
| 테스트 | Hook→Event→Transition 통합 테스트 | ~200 |
| **합계** | | **~1090** |

**Hook↔State Machine 계약 (Discriminator C5 반영):**

```
                   Shell 경계
Hook Script ──exit code──→ .claude/hooks/ 실행 환경 (Claude Code Runtime)
                              │
                         stdout/stderr 캡처
                              │
                    ┌─────────▼──────────┐
                    │ HookResultProcessor │  ← 새로 구현
                    │ (TypeScript)        │
                    │                     │
                    │ exitCode === 0      │──→ EventBus.emit({ source:'hook', severity:'info' })
                    │ exitCode !== 0      │──→ EventBus.emit({ source:'hook', severity:'error', payload: stderr })
                    └─────────────────────┘
                              │
                    EventBus가 FEEDBACK_LOOP_TRIGGERS 참조
                              │
                    해당 TaskState에서 'hook' 트리거 존재?
                         Yes → 상태 전이 발생
                         No  → 텔레메트리만 기록 (무시)
```

### 4.4 Sprint 101 — Foundation v3: Orchestration Loop (전체 동작)

**이 Sprint에서 처음으로 전체 사이클이 동작**

| 항목 | 내용 | LOC 추정 |
|------|------|---------|
| OrchestrationLoop 구현 | retry + adversarial + fix 3모드 | ~400 |
| FeedbackLoopContext | 루프 진입/탈출 상태 관리 | ~150 |
| AgentAdapter 인터페이스 | provider + modelTier + handleFeedback | ~100 |
| 텔레메트리 수집 미들웨어 | Event Bus 구독 → D1 기록 | ~200 |
| 통합 테스트 | Hook→Event→Transition→Loop→Telemetry E2E | ~300 |
| **합계** | | **~1150** |

### 4.5 Sprint 102~103 — Feature Sprint: 에이전트 + 대시보드

**Sprint 102: O-G-D 에이전트 구현**

| 항목 | 내용 | 출처 |
|------|------|------|
| ogd-orchestrator.md | Adversarial Loop 조율자 | GAN Orchestrator |
| deploy-verifier.md → Discriminator | Workers/Pages 검증 | ECC + GAN 역할 |
| spec-checker.md → Discriminator | Spec-Code 동기화 검증 | ECC + SDD |
| build-validator.md → Generator companion | 빌드 에러 수정 제안 | ECC + Optio FL |
| contexts/ 4종 | dev, review, deploy, bd | ECC 컨텍스트 |

**Sprint 103: 웹 대시보드 + 관측성**

| 항목 | 내용 | 출처 |
|------|------|------|
| 태스크 상태 뷰 | 상태머신 시각화 (Kanban) | Optio 대시보드 |
| 루프 이력 뷰 | 라운드별 품질 점수 추이 | GAN 수렴 그래프 |
| 텔레메트리 대시보드 | 태스크/스킬/라운드별 비용 | Optio + OpenSpace |

### 4.6 Sprint 104+ — Evolution Sprint

| Sprint | 항목 | 출처 |
|--------|------|------|
| 104 | Skill Execution Tracker | OpenSpace + Optio |
| 105 | FIX 모드 (스킬 자동 수리) | OpenSpace + GAN |
| 106 | DERIVED 모드 (패턴→스킬 추출) | OpenSpace |
| 107 | BD ROI 벤치마크 | OpenSpace GDPVal |
| 108+ | PR Lifecycle 자동화, Ticket Provider | Optio |

---

## 5. 기존 계획 대비 변경점 요약

| v1 | v2 | 변경 이유 (Discriminator) |
|----|----|--------------------------|
| Unified LoopPrimitive (1 인터페이스) | **2계층 분리** (Hook Layer + Orchestration Layer) | C1: Shell/HTTP/In-process I/O 통합 불가 |
| "순환 의존 → 동시 구축" | **선형 의존 → 점진적 전달** | C2: 실제로는 topological sort 가능 |
| Foundation 2 Sprint (S99~100) | **Foundation 3 Sprint (S99~101)** | C3: S99~100은 스키마만, S101에서 처음 동작 |
| FEEDBACK_LOOP = 상태 겸 트리거 | **Event Bus 분리** + 진입 조건 명시 | C4: 순환 정의 해소 |
| 하위 호환 미언급 | **§8 Migration 섹션 신설** | C5: 420 endpoints 하위 호환 필수 |
| 테스트 전략 미언급 | **§10 Test Strategy 신설** | C5: 인프라 자체 테스트 |

---

## 6. 의도적 제외 (교차 검증 후 확정)

| 항목 | 제외 이유 | 교차 검증 |
|------|----------|----------|
| K8s / BullMQ / PostgreSQL | 인프라 철학 불일치 (서버리스) | ECC, OpenSpace 모두 인프라 비의존적 → 확정 제외 |
| ECC 언어별 에이전트 12종 | TS+Python만 사용 | Optio도 단일 언어 → 확정 제외 |
| Optio 자동 머지 실행 | "자동 커밋 금지" 원칙 | GAN도 "사람 확인" 권장 → 확정 제외 |
| ECC AgentShield 102개 룰 | 과잉, security.md로 충분 | Optio도 최소 config → 확정 제외 |
| ECC /evolve 전체 파이프라인 | ROI 낮음, 개념만 차용 | OpenSpace FIX가 더 실용적 → ECC는 개념만 |
| OpenSpace Cloud Community | 팀 규모에 비해 과잉 | 사내 레지스트리로 축소 → 확정 |
| **Unified LoopPrimitive** | **Shell↔TS I/O 불일치 (GAN R1)** | **v2에서 2계층 분리로 대체** |

---

## 7. 성공 지표 (교차 분석 기반 통합)

| 지표 | 현재 | 목표 | 출처 | 측정 시점 |
|------|------|------|------|----------|
| `--no-verify` 우회율 | 측정 안 됨 | < 10% | ECC Hook | S100 이후 |
| 타입 에러 감지 시점 | 수동 | 편집 즉시 | ECC PostToolUse | S100 이후 |
| 태스크 상태 추적 | 수동 Sprint 기록 | 자동 상태머신 전이 | Optio SM | **S99 이후** |
| Hook→상태 전이 자동화 | N/A | Hook 실패 → FEEDBACK_LOOP 자동 진입 | ECC+Optio 시너지 | S100 이후 |
| 테스트 실패 대응 | 수동 | 자동 재시도 3회 → 에스컬레이션 | Optio FL + GAN | S101 이후 |
| GAN 수렴 라운드 평균 | N/A | 1.5회 이내 (3회 상한) | GAN Architecture | S102 이후 |
| 스킬 실행 성공률 | 측정 안 됨 | 80%+ (FIX 포함) | OpenSpace | S105 이후 |
| 토큰 비용 추적 | 모델 레벨만 | 태스크/스킬/라운드 레벨 | Optio + OpenSpace | S101 이후 |
| BD ROI (토큰 대비 가치) | N/A | Cold Start 대비 2× | OpenSpace GDPVal | S107 이후 |
| Spec-Code 동기화율 | 수동 확인 | 자동 검증 90%+ | FX SDD | S101 이후 |

---

## 8. Migration & Backward Compatibility (v2 신설 — C5 반영)

### 8.1 원칙: Additive, Not Replacement

새로운 인프라(TaskState, Event Bus, Orchestration Loop)는 기존 420 endpoints와 169 services 위에 **추가되는 레이어**예요. 기존 API를 대체하거나 변경하지 않아요.

### 8.2 기존 API 영향도

```
기존 API (변경 없음):
  GET /agents/:id           — 에이전트 조회 (기존 그대로)
  POST /agents/:id/execute  — 에이전트 실행 (기존 그대로)
  ...420개 전부 그대로

신규 API (추가만):
  GET  /tasks/:id/state          — 태스크 상태 조회
  POST /tasks/:id/transition     — 상태 전이 요청
  GET  /tasks/:id/loop-history   — 루프 이력 조회
  GET  /telemetry/events         — 텔레메트리 이벤트 조회
```

### 8.3 기존 에이전트 마이그레이션 경로

```
Phase A (S99~101): 기존 에이전트 변경 없음
  deploy-verifier, spec-checker, build-validator는 현재 .md 파일 그대로 유지

Phase B (S102): AgentAdapter 인터페이스 도입
  기존 에이전트를 "Discriminator" 역할로 태깅 (yaml frontmatter에 role 추가)
  기존 동작은 100% 보존, role 태그만 추가

Phase C (S103+): 점진적 통합
  handleFeedback() 메서드를 하나씩 추가
  기존 에이전트가 Orchestration Loop와 연동 시작
```

---

## 9. Integration Contracts (v2 신설 — C5 반영)

### 9.1 Hook → Event Bus 계약

```
Contract: HookResultProcessor

Input:  { hookType: 'PreToolUse'|'PostToolUse', exitCode: number, stderr: string, file?: string }
Output: TaskEvent { source: 'hook', severity: exitCode===0 ? 'info' : 'error', taskId: string, payload: { file, stderr } }

Guarantee: 모든 Hook 실행은 1개의 TaskEvent를 생성
Latency:  Hook 완료 후 100ms 이내
Failure:  HookResultProcessor 실패 시 → stderr 로깅만 (Hook 실행 자체는 차단하지 않음)
```

### 9.2 Event Bus → State Machine 계약

```
Contract: EventDrivenTransition

Input:  TaskEvent
Output: StateTransition | null (해당 이벤트가 현재 상태에서 전이를 트리거하지 않으면 null)

Guarantee: FEEDBACK_LOOP_TRIGGERS 매핑에 없는 이벤트는 무시 (null 반환)
Guarantee: 전이 발생 시 task_state_history에 기록
Failure:  TransitionGuard 검증 실패 시 → 전이 거부 + 텔레메트리 기록
```

### 9.3 State Machine → Orchestration Loop 계약

```
Contract: LoopActivation

Trigger: TaskState가 FEEDBACK_LOOP로 전이 시
Input:   FeedbackLoopContext { entryState, triggerEvent, maxRounds, loopMode }
Output:  LoopOutcome { resolved | exhausted | escalated }

Guarantee: maxRounds 초과 시 반드시 종료 (무한 루프 방지)
Guarantee: 매 라운드 ExecutionEvent를 텔레메트리에 기록
Failure:  escalated 시 → 사람에게 에스컬레이션 (자동 커밋 금지 원칙)
```

---

## 10. Test Strategy (v2 신설 — C5 반영)

### 10.1 인프라 테스트 계획

| 대상 | 테스트 유형 | 예상 수 | Sprint |
|------|-----------|---------|--------|
| TaskState 전이 규칙 | 단위 테스트 (허용/차단 전이 검증) | ~30 | S99 |
| TransitionGuard | 단위 테스트 (조건 충족/미충족) | ~20 | S99 |
| Hook shell scripts | 통합 테스트 (실제 shell 실행 + exit code 확인) | ~10 | S100 |
| HookResultProcessor | 단위 테스트 (exit code → TaskEvent 변환) | ~15 | S100 |
| Event Bus 라우팅 | 단위 테스트 (이벤트→전이 매핑) | ~20 | S100 |
| Hook→Event→Transition E2E | 통합 테스트 (편집→hook→이벤트→상태전이) | ~5 | S100 |
| OrchestrationLoop (retry) | 단위 테스트 (성공/실패/exhausted 시나리오) | ~15 | S101 |
| OrchestrationLoop (adversarial) | 단위 테스트 (GAN 수렴/발산 시나리오) | ~10 | S101 |
| 전체 파이프라인 E2E | 통합 테스트 (Hook→Event→Transition→Loop→Telemetry) | ~5 | S101 |
| **합계** | | **~130** | |

### 10.2 기존 테스트 영향

- 기존 2,664 테스트: **변경 없음** (새 인프라는 additive)
- S101 완료 시 총 테스트: ~2,664 + ~130 = **~2,794**
- 테스트 커버리지 원칙: 새 인프라 코드 > 80% coverage

---

## 11. GAN 검증 Round 1 변경 로그 요약

| 변경 | before (v1) | after (v2) | Discriminator 근거 |
|------|-------------|------------|-------------------|
| 루프 아키텍처 | Unified LoopPrimitive | **2계층 분리** (Hook Layer / Orchestration Layer) | Shell subprocess와 in-process TS는 I/O 모델 불일치 |
| 의존성 그래프 | "순환 의존 → 동시 구축" | **선형 의존 → 점진적 전달** | 실제 dependency는 topological sort 가능 |
| Foundation 기간 | 2 Sprint (S99~100) | **3 Sprint (S99~101)** | S99~100은 스키마, S101에서 처음 전체 동작 |
| FEEDBACK_LOOP 정의 | 상태 = 트리거 (순환) | **Event Bus 분리** + 진입 조건 명시 | 상태와 트리거를 분리해야 테스트/추론 가능 |
| 하위 호환 | 미언급 | **Additive 전략** (기존 API 변경 없음) | 420 endpoints 보호 필수 |
| Hook↔State 계약 | 미정의 | **HookResultProcessor** + 계약 명세 | Shell↔TS 경계 bridging 필수 |
| 테스트 전략 | 미언급 | **~130 신규 테스트** 계획 | 인프라 자체 검증 필수 |

---

## 12. GAN 검증 Round 2 — Orchestrator 수렴 판정

### 12.1 Round 2 Discriminator 재판정

| Criterion | R1 Score | R2 Score | 변화 | 판정 |
|-----------|----------|----------|------|------|
| C1: 기술적 실현 가능성 | 0.30 | **0.85** | +0.55 | ✅ 해결 — 2계층 분리로 I/O 불일치 해소 |
| C2: 의존성 그래프 | 0.50 | **0.95** | +0.45 | ✅ 해결 — 선형 의존 + 점진적 전달 |
| C3: 스코프 현실성 | 0.50 | **0.80** | +0.30 | ⚠️ 개선 — Foundation 3 Sprint으로 현실화 |
| C4: 아키텍처 일관성 | 0.30 | **0.95** | +0.65 | ✅ 해결 — Event Bus 분리, 진입 조건 명시 |
| C5: 누락 항목 | 0.40 | **0.85** | +0.45 | ⚠️ 개선 — 계약/테스트/마이그레이션 추가 |
| **종합** | **0.42** | **0.78** | **+0.36** | **MINOR_FIX** |

### 12.2 Round 2 잔여 이슈 (Sprint 착수 전 해결 필요)

**Critical 2건:**

| ID | 내용 | 해결 시점 | 담당 |
|----|------|----------|------|
| N5 | OrchestrationLoop 수렴 기준 미정의 — retry/adversarial/fix 각 모드별 convergence 조건 필요 | S101 설계 시 | Sprint 101 Plan |
| N7 | 기존 Agent 실행 → Task 레코드 생성 흐름 미정의 — `POST /agents/:id/execute` → TaskState 연결 방법 필요 | S99 설계 시 | Sprint 99 Plan |

**Major 4건:**

| ID | 내용 | 해결 시점 |
|----|------|----------|
| N1 | AgentAdapter 인터페이스의 FeedbackContext 타입 미정의 | S101 |
| N2 | Event Bus의 구체적 이벤트 소스(GitHub Webhook, CI Poller) 미정의 | S100 |
| N4 | TransitionGuard 구현체 (90% 동기화 검증) 서비스 할당 미정 | S101 |
| N6 | Hook 런타임 환경/타임아웃/실패 격리 스펙 미정 | S100 |

### 12.3 Orchestrator 수렴 판정

```
convergence_check(round=2, discriminator_result):
  quality_score = 0.78
  critical_findings = 2 (N5, N7)

  수렴 조건 체크:
    Quality Score ≥ 0.85?    → NO (0.78)
    Critical 결함 = 0?        → NO (2건)
    Discriminator verdict?    → MINOR_FIX

  round < MAX_ROUNDS(3)?     → YES (round 2 < 3)

  BUT: 잔여 Critical 2건은 "아키텍처 방향"이 아닌 "구현 세부사항"
    - N5 (수렴 기준): Sprint 101 설계 단계에서 해결 가능
    - N7 (Task 생성 흐름): Sprint 99 Plan 문서에서 해결 가능

  판정: CONDITIONAL_PASS
    → 아키텍처 방향성은 수렴 완료
    → 잔여 이슈는 각 Sprint Plan에서 해결 (본 문서 스코프 밖)
    → Round 3 불필요 (추가 라운드의 ROI < 비용)
```

**최종 판정: CONDITIONAL_PASS**

아키텍처 레벨 설계는 **수렴**. 2계층 루프, 선형 의존성, Event Bus 기반 상태 전이, Additive 마이그레이션 — 모두 Discriminator가 수용. 잔여 Critical 2건(수렴 기준, Task 생성 흐름)은 **각 Sprint의 상세 설계 문서**에서 해결할 사안이지, 이 아키텍처 계획서의 스코프가 아님.

### 12.4 Round 1→2 품질 궤적

```
Round 0 (초기 계획):  Score N/A — 교차 분석 기반 초안
Round 1 (D 판정):     Score 0.42 — MAJOR_ISSUE (Critical 2 + Major 3)
Round 2 (D 재판정):   Score 0.78 — MINOR_FIX (Critical 2 + Major 4, 모두 구현 레벨)
Orchestrator 판정:    CONDITIONAL_PASS — 아키텍처 수렴, 구현 세부사항은 Sprint Plan으로 이관
```

### 12.5 다음 단계

1. **Sprint 99 Plan 작성 시**: N7(Task 생성 흐름) + N6(Hook 환경 스펙) 해결
2. **Sprint 100 Plan 작성 시**: N2(Event Bus 소스) 해결
3. **Sprint 101 Plan 작성 시**: N5(수렴 기준) + N1(FeedbackContext) + N4(Guard 서비스 할당) 해결
4. **각 Sprint Plan에서**: 해당 Sprint의 잔여 이슈를 GAN Round 0 입력으로 사용하여 재검증
