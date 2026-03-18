---
code: FX-PLAN-010
title: Sprint 10 (v0.10.0) — 에이전트 실연동 + NL→Spec 충돌 감지
version: 0.1
status: Draft
category: PLAN
system-version: 0.10.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 10 (v0.10.0) Planning Document

> **Summary**: Sprint 9에서 구축한 오케스트레이션 데이터 모델(4 D1 테이블, 11 제약, 6 엔드포인트) 위에 Claude API를 통한 에이전트 실행 엔진을 구현하고, NL→Spec 변환 시 기존 명세와의 충돌을 감지·해결하는 UI를 제공하여 Foundry-X의 Phase 2 핵심 차별화 기능을 완성한다.
>
> **Project**: Foundry-X
> **Version**: 0.10.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 에이전트 오케스트레이션이 데이터 모델만 존재하고 실 실행이 불가능하며, NL→Spec 변환이 기존 명세와의 충돌을 감지하지 않아 명세 일관성이 깨질 수 있다. 또한 프로덕션 배포(secrets, D1 remote)가 미완료 상태다 |
| **Solution** | F52: 프로덕션 실배포 실행 + F53: AgentRunner 추상화 + ClaudeApiRunner + MCP 인터페이스 설계 + F54: ConflictDetector + 충돌 해결 UI |
| **Function/UX Effect** | 대시보드에서 에이전트에게 실제 코드 분석/리뷰/생성 작업을 위임하고 결과를 실시간(SSE)으로 추적. Spec Generator에서 기존 명세와 충돌 시 diff 뷰로 비교하고 수락/거절/수정 선택 |
| **Core Value** | "에이전트가 실제로 일하는" 플랫폼으로 전환 — Phase 2 핵심 차별화(사람+AI 동등 협업) 구현. NL→Spec 충돌 감지로 "Git이 진실" 원칙의 무결성 보장 |

---

## 1. Overview

### 1.1 Purpose

Sprint 10은 Foundry-X를 **에이전트 데이터 모델**에서 **에이전트 실행 플랫폼**으로 전환하는 스프린트예요:

- **F52 프로덕션 실배포 (P0)**: Sprint 8~9에서 누적된 배포 잔여 작업을 해소하여 프로덕션 환경 완성
- **F53 에이전트 실연동 (P0)**: Claude API 직접 호출로 에이전트가 실제 코드를 분석/생성하고, MCP 전환을 위한 어댑터 인터페이스 설계
- **F54 NL→Spec 충돌 감지 (P1)**: 기존 명세와 신규 Spec 간 시맨틱 충돌을 감지하고, 사용자가 해결하는 UI 제공

### 1.2 Background

- **Sprint 9 성과**: 오케스트레이션 기초(4 D1 테이블, AgentOrchestrator, constraint-guard), E2E 5건, Playwright CI (Match Rate 94%, 241 tests)
- **현재 한계**:
  - **에이전트 실행 불가**: `AgentOrchestrator`는 CRUD만 수행, 실제 Claude/LLM 호출 없음. Mock 데이터 폴백에 의존
  - **NL→Spec 충돌 미감지**: `POST /spec/generate`가 새 spec만 생성하고, 기존 spec과 비교하지 않음 (PRD §7.8 미구현)
  - **프로덕션 미완료**: Workers secrets 미설정, D1 migration remote 미적용 — 배포 파이프라인 코드는 완성됐으나 실행 미완료
- **결정 사항**: Claude API 직접 호출로 시작하되, MCP 어댑터 인터페이스를 미리 설계해 Sprint 11+에서 MCP 전환 가능

### 1.3 Prerequisites (Sprint 9 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| AgentOrchestrator 서비스 | ✅ | checkConstraint, listAgents, getCapabilities, createTask, listTasks |
| Constraint Guard 미들웨어 | ✅ | X-Agent-Id/Action 헤더, always/ask/never tier 강제 |
| Agent Route 6 endpoints | ✅ | GET /agents, /capabilities, /stream, /{id}/tasks, POST /constraints/check |
| D1 4테이블 (agents, capabilities, constraints, tasks) | ✅ | 0004_agent_orchestration.sql (로컬만 적용) |
| 11 기본 제약 시드 | ✅ | always 4 + ask 4 + never 3 |
| NL→Spec generate API | ✅ | POST /spec/generate, Workers AI + Claude fallback, Zod 검증 |
| 241 tests passing | ✅ | CLI 106 + API 101 + Web 34 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F52 | 프로덕션 실배포 실행 | P0 | Workers secrets + D1 migration remote + deploy + smoke test 검증 |
| F53 | 에이전트 실연동 — Claude API + MCP 어댑터 인터페이스 | P0 | AgentRunner 추상화 + ClaudeApiRunner + 실행→기록→SSE 전파 + MCP 인터페이스 |
| F54 | NL→Spec 충돌 감지 + 사용자 선택 | P1 | ConflictDetector + 시맨틱 diff + 충돌 표시 UI + 수락/거절/수정 |

---

## 2. Feature Specifications

### 2.1 F52: 프로덕션 실배포 실행 (P0)

**목표**: Sprint 8~9에서 누적된 프로덕션 배포 잔여 작업을 완료하여, Workers API와 Pages가 실제 프로덕션 URL에서 완전 동작한다.

#### 2.1.1 Workers Secrets 설정

| Secret | 용도 | 설정 방법 |
|--------|------|----------|
| `JWT_SECRET` | JWT 토큰 서명 | `wrangler secret put JWT_SECRET` 또는 Dashboard |
| `GITHUB_TOKEN` | GitHub API 호출 (requirements, spec) | Dashboard (wrangler WSL hang 이슈) |
| `WEBHOOK_SECRET` | Webhook HMAC 검증 | Dashboard |
| `ANTHROPIC_API_KEY` | Claude API 호출 (NL→Spec, 에이전트) | Dashboard |

> ⚠️ wrangler CLI WSL hang 이슈(세션 #27) — Dashboard 또는 GitHub Actions 경유 설정 권장

#### 2.1.2 D1 Migration Remote 적용

```bash
# 프로덕션 D1에 0001~0004 마이그레이션 적용
wrangler d1 migrations apply foundry-x-db --remote

# 적용 확인
wrangler d1 migrations list foundry-x-db --remote
```

마이그레이션 내역:
- `0001_initial.sql` — agents, users, specs, wiki_pages, agent_sessions, requirements
- `0002_wiki_slug_unique.sql` — wiki_page slug UNIQUE 제약
- `0003_agent_session_progress.sql` — agent_sessions 확장
- `0004_agent_orchestration.sql` — agents/capabilities/constraints/tasks 4테이블 + 11 시드

#### 2.1.3 배포 + 검증

| 단계 | 명령 | 검증 |
|------|------|------|
| Workers 배포 | `wrangler deploy` 또는 GitHub Actions | `/health` 200 OK |
| Smoke test | `scripts/smoke-test.sh` | API + Web + Auth + SSE 전체 통과 |
| Pages 확인 | fx.minu.best 접속 | 랜딩 + 대시보드 렌더링 |

#### 2.1.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/wrangler.toml` | ENVIRONMENT=production var 확인 |
| `.github/workflows/deploy.yml` | secrets 참조 확인 |

**주의**: F52는 운영 작업 중심이므로 코드 변경은 최소화. 배포 검증에 초점.

---

### 2.2 F53: 에이전트 실연동 — Claude API + MCP 어댑터 인터페이스 (P0)

**목표**: 에이전트가 Claude API를 통해 실제 코드 분석/리뷰/생성을 수행하고, 결과를 agent_sessions/tasks에 기록하여 대시보드에서 실시간 추적한다. MCP 전환을 위한 어댑터 인터페이스를 설계한다.

#### 2.2.1 AgentRunner 추상화 계층

```typescript
// packages/api/src/services/agent-runner.ts

/** 에이전트 실행의 추상화 — Claude API, MCP 등 다양한 실행 백엔드 지원 */
interface AgentRunner {
  readonly type: 'claude-api' | 'mcp' | 'mock';

  /** 에이전트 작업 실행 */
  execute(task: AgentExecutionRequest): Promise<AgentExecutionResult>;

  /** 실행 가능 여부 확인 (API key 존재, MCP 서버 연결 등) */
  isAvailable(): Promise<boolean>;

  /** 에이전트 지원 가능 여부 */
  supportsCapability(capability: string): boolean;
}

interface AgentExecutionRequest {
  taskId: string;
  agentId: string;
  taskType: 'code-review' | 'code-generation' | 'spec-analysis' | 'test-generation';
  context: {
    repoUrl: string;
    branch: string;
    targetFiles?: string[];
    spec?: GeneratedSpec;
    instructions?: string;
  };
  constraints: AgentConstraintRule[];
}

interface AgentExecutionResult {
  status: 'success' | 'partial' | 'failed';
  output: {
    analysis?: string;
    generatedCode?: Array<{ path: string; content: string; action: 'create' | 'modify' }>;
    reviewComments?: Array<{ file: string; line: number; comment: string; severity: 'error' | 'warning' | 'info' }>;
  };
  tokensUsed: number;
  model: string;
  duration: number;
}
```

#### 2.2.2 ClaudeApiRunner 구현

Claude API(Anthropic)를 직접 호출하는 AgentRunner 구현체:

| 기능 | 상세 |
|------|------|
| **코드 리뷰** | 파일 내용 + spec → Claude에게 리뷰 요청 → 코멘트 배열 반환 |
| **코드 생성** | spec + 기존 코드 → Claude에게 구현 요청 → 파일별 코드 반환 |
| **Spec 분석** | 자연어 → 기존 spec과 비교 분석 → 갭/충돌 보고 |
| **테스트 생성** | 코드 + spec → 테스트 코드 생성 |

```typescript
// packages/api/src/services/claude-api-runner.ts

class ClaudeApiRunner implements AgentRunner {
  readonly type = 'claude-api';

  constructor(private apiKey: string, private model: string = 'claude-haiku-4-5-20250714') {}

  async execute(task: AgentExecutionRequest): Promise<AgentExecutionResult> {
    // 1. taskType별 시스템 프롬프트 선택
    // 2. context → 구조화된 프롬프트 변환
    // 3. Anthropic API 호출 (tool_use 포함 가능)
    // 4. 결과 파싱 → AgentExecutionResult 구조화
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  supportsCapability(capability: string): boolean {
    return ['code-review', 'code-generation', 'spec-analysis', 'test-generation'].includes(capability);
  }
}
```

#### 2.2.3 MCP 어댑터 인터페이스 (Sprint 10: 설계만)

Sprint 10에서는 인터페이스만 정의하고, 구현은 Sprint 11+:

```typescript
// packages/api/src/services/mcp-adapter.ts (인터페이스만)

interface McpTransport {
  type: 'stdio' | 'sse' | 'http';
  connect(config: McpConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  send(message: McpMessage): Promise<McpResponse>;
}

interface McpAgentRunner extends AgentRunner {
  readonly type: 'mcp';
  transport: McpTransport;

  /** MCP 서버에서 사용 가능한 도구 목록 조회 */
  listTools(): Promise<McpTool[]>;

  /** MCP 서버의 리소스 조회 */
  listResources(): Promise<McpResource[]>;
}

// Sprint 11+에서 구현할 구체 클래스
// class McpRunner implements McpAgentRunner { ... }
```

#### 2.2.4 에이전트 실행 흐름 (E2E)

```
사용자 요청 (대시보드)
  │
  ▼
POST /agents/{id}/execute  ─────── 신규 엔드포인트
  │
  ├─ 1. Constraint Guard: 작업 허용 여부 검증
  ├─ 2. agent_tasks 생성 (branch, status: pending)
  ├─ 3. agent_sessions 업데이트 (status: active)
  ├─ 4. SSE 이벤트 전파 (agent.task.started)
  │
  ▼
AgentRunner.execute(task)  ─────── ClaudeApiRunner
  │
  ├─ 5. Claude API 호출 (Anthropic SDK)
  ├─ 6. 결과 파싱 → AgentExecutionResult
  │
  ▼
결과 기록 + 알림
  │
  ├─ 7. agent_tasks 업데이트 (result, status: completed/failed)
  ├─ 8. agent_sessions 업데이트 (status: completed, tokensUsed)
  ├─ 9. SSE 이벤트 전파 (agent.task.completed)
  └─ 10. 대시보드에서 결과 표시
```

#### 2.2.5 API 엔드포인트 추가

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agents/{id}/execute` | POST | 에이전트 작업 실행 요청 |
| `/agents/runners` | GET | 사용 가능한 AgentRunner 목록 |
| `/agents/tasks/{taskId}/result` | GET | 작업 실행 결과 조회 |

#### 2.2.6 대시보드 UI 변경

| 컴포넌트 | 변경 |
|----------|------|
| `AgentCard` | "작업 요청" 버튼 추가 — 클릭 시 실행 모달 |
| `AgentExecuteModal` | 신규 — taskType 선택 + context 입력 + 실행 |
| `AgentTaskResult` | 신규 — 코드 리뷰 코멘트 / 생성된 코드 표시 |
| `agents/page.tsx` | SSE 이벤트에 task.started/completed 핸들링 추가 |

#### 2.2.7 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/agent-runner.ts` | 신규 — AgentRunner interface + types |
| `packages/api/src/services/claude-api-runner.ts` | 신규 — ClaudeApiRunner 구현 |
| `packages/api/src/services/mcp-adapter.ts` | 신규 — MCP 인터페이스 (stub) |
| `packages/api/src/services/agent-orchestrator.ts` | executeTask() 메서드 추가 |
| `packages/api/src/routes/agent.ts` | 3 endpoints 추가 |
| `packages/api/src/schemas/agent.ts` | execution 관련 Zod 스키마 추가 |
| `packages/shared/src/agent.ts` | AgentExecutionRequest/Result 타입 추가 |
| `packages/web/src/app/(app)/agents/page.tsx` | 실행 버튼 + 결과 표시 |
| `packages/web/src/components/feature/AgentExecuteModal.tsx` | 신규 — 작업 실행 모달 |
| `packages/web/src/components/feature/AgentTaskResult.tsx` | 신규 — 결과 뷰어 |

---

### 2.3 F54: NL→Spec 충돌 감지 + 사용자 선택 (P1)

**목표**: NL→Spec 변환 시 기존 명세와 시맨틱 충돌을 자동 감지하고, 사용자가 충돌을 해결하는 인터페이스를 제공한다 (PRD §7.8).

#### 2.3.1 충돌 감지 엔진

```typescript
// packages/api/src/services/conflict-detector.ts

interface SpecConflict {
  type: 'direct' | 'dependency' | 'priority' | 'scope';
  severity: 'critical' | 'warning' | 'info';
  existingSpec: { id: string; title: string; field: string; value: string };
  newSpec: { field: string; value: string };
  description: string;
  suggestion?: string;
}

class ConflictDetector {
  /**
   * 새 spec과 기존 spec 목록을 비교하여 충돌을 감지
   * 비교 필드: title, description, acceptanceCriteria, dependencies, priority
   */
  async detect(
    newSpec: GeneratedSpec,
    existingSpecs: ExistingSpec[],
  ): Promise<SpecConflict[]>;
}
```

충돌 유형:

| 유형 | 감지 기준 | 예시 |
|------|----------|------|
| **직접 충돌** (direct) | 동일/유사 제목 또는 기능 범위 중복 | "사용자 인증 기능" spec이 이미 존재 |
| **의존성 충돌** (dependency) | 새 spec의 의존성이 기존 spec과 충돌 | 새 spec이 삭제 예정 모듈에 의존 |
| **우선순위 충돌** (priority) | 동일 리소스에 대해 상반된 우선순위 | P0 신규 spec vs 기존 P0 진행 중 |
| **범위 충돌** (scope) | 기존 spec의 acceptance criteria와 모순 | 기존: "SSR만" vs 신규: "CSR 전환" |

#### 2.3.2 충돌 감지 전략

유사도 판단에 LLM을 활용하되, 경량 규칙 기반 1차 필터링 후 LLM 2차 확인:

```
Phase 1: 규칙 기반 (빠름, 무비용)
  - 제목 유사도: Levenshtein distance < 0.3 또는 키워드 70% 이상 겹침
  - 의존성 교차: 새 spec.dependencies ∩ 기존 spec.dependencies
  - 동일 카테고리 + 동일 범위 감지

Phase 2: LLM 기반 (정확, 토큰 소비)
  - Phase 1에서 후보가 발견되면 LLM에게 시맨틱 비교 요청
  - "이 두 spec이 충돌하는가? 충돌 유형과 심각도를 판단하라"
  - confidence < 0.7이면 'info'로 분류 (사용자 판단에 위임)
```

#### 2.3.3 API 엔드포인트 변경

기존 `POST /spec/generate` 확장:

```typescript
// 요청: 기존과 동일
// 응답: 기존 필드 + conflicts 추가
{
  spec: GeneratedSpec,
  markdown: string,
  confidence: number,
  model: string,
  conflicts: SpecConflict[]  // ← 신규 필드
}
```

새 엔드포인트:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/spec/conflicts/resolve` | POST | 충돌 해결 결정 기록 (accept/reject/modify) |
| `/spec/existing` | GET | 기존 spec 목록 조회 (D1 기반) |

#### 2.3.4 충돌 해결 UI

Spec Generator 페이지 확장:

```
┌─────────────────────────────────────────────────────┐
│  Spec Generator                                     │
├─────────────────────────────────────────────────────┤
│  [자연어 입력 영역]                                   │
│  [Generate] 버튼                                     │
├─────────────────────────────────────────────────────┤
│  ⚠️ 2건의 충돌이 감지되었습니다                         │
│                                                     │
│  ┌─ Conflict #1 (critical) ──────────────────────┐  │
│  │ 유형: 직접 충돌                                 │  │
│  │ 기존: F45 "NL→Spec 변환" — 동일 기능 범위       │  │
│  │ 신규: "NL→Spec 충돌 감지" — 기존 기능 확장       │  │
│  │ 제안: 기존 F45를 확장하거나, 별도 F-item 등록     │  │
│  │                                                │  │
│  │ [수락] [거절] [수정]                             │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Conflict #2 (warning) ───────────────────────┐  │
│  │ ...                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  [최종 확정] — 충돌 해결 후 활성화                      │
└─────────────────────────────────────────────────────┘
```

#### 2.3.5 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/conflict-detector.ts` | 신규 — ConflictDetector |
| `packages/api/src/routes/spec.ts` | generate 응답에 conflicts 추가, 2 endpoints 추가 |
| `packages/api/src/schemas/spec.ts` | SpecConflict Zod 스키마 추가 |
| `packages/shared/src/web.ts` | SpecConflict 타입 추가 |
| `packages/web/src/app/(app)/spec-generator/page.tsx` | 충돌 표시 UI 추가 |
| `packages/web/src/components/feature/ConflictCard.tsx` | 신규 — 충돌 카드 컴포넌트 |
| `packages/web/src/components/feature/ConflictResolver.tsx` | 신규 — 충돌 해결 인터페이스 |

---

## 3. Technical Architecture

### 3.1 새로운 컴포넌트

```
┌────────────────────────────────────────────────────────┐
│                    Sprint 10 추가                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ AgentRunner   │    │ Conflict     │                  │
│  │ Interface     │    │ Detector     │                  │
│  │  ┌──────────┐│    │              │                  │
│  │  │ Claude   ││    │ Phase1: Rule │                  │
│  │  │ ApiRunner││    │ Phase2: LLM  │                  │
│  │  └──────────┘│    └──────┬───────┘                  │
│  │  ┌──────────┐│           │                          │
│  │  │ MCP      ││           │                          │
│  │  │ (stub)   ││           │                          │
│  │  └──────────┘│           │                          │
│  └──────┬───────┘           │                          │
│         │                   │                          │
│  ┌──────▼───────────────────▼──────────────────────┐   │
│  │              API Server (Hono)                   │   │
│  │  ┌─────────────┐  ┌──────────────┐              │   │
│  │  │ Agent       │  │ Spec Route   │              │   │
│  │  │ Orchestrator│  │ + Conflicts  │              │   │
│  │  │ + execute() │  │              │              │   │
│  │  └─────────────┘  └──────────────┘              │   │
│  └─────────────────────┬───────────────────────────┘   │
│                        │                               │
│  ┌──────────┐  ┌───────▼───────┐  ┌──────────────┐    │
│  │ D1       │  │ Anthropic API │  │ GitHub API   │    │
│  │ (9 tbls) │  │ (Claude)      │  │ (PR/Branch)  │    │
│  └──────────┘  └───────────────┘  └──────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Web Dashboard (Next.js)                 │  │
│  │  ┌────────────────┐  ┌────────────────────────┐  │  │
│  │  │ AgentExecute   │  │ ConflictResolver       │  │  │
│  │  │ Modal          │  │ (Spec Generator 확장)  │  │  │
│  │  └────────────────┘  └────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 |
|--------|------|------|
| `@anthropic-ai/sdk` | Claude API SDK (Workers 호환) | packages/api |

> 현재 LLMService는 fetch 직접 호출 방식이에요. AgentRunner에서도 동일 패턴을 유지할지, SDK를 도입할지는 구현 시 결정. Workers 환경 호환성이 핵심.

### 3.3 D1 스키마 변경

Sprint 10에서 추가 마이그레이션은 최소화:

```sql
-- 0005_agent_execution.sql

-- agent_tasks에 실행 결과 컬럼 추가
ALTER TABLE agent_tasks ADD COLUMN task_type TEXT;
ALTER TABLE agent_tasks ADD COLUMN result TEXT;  -- JSON: AgentExecutionResult
ALTER TABLE agent_tasks ADD COLUMN tokens_used INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN duration_ms INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN runner_type TEXT DEFAULT 'claude-api';

-- spec_conflicts 테이블 (충돌 이력)
CREATE TABLE spec_conflicts (
  id TEXT PRIMARY KEY,
  new_spec_title TEXT NOT NULL,
  existing_spec_id TEXT,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  resolution TEXT,  -- 'accept' | 'reject' | 'modify'
  resolved_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);
```

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: 프로덕션 실배포 (F52) — P0, 선결과제
  A1. Cloudflare Dashboard에서 Workers secrets 4개 설정
  A2. D1 migration remote 적용 (0001~0004)
  A3. Workers deploy + smoke test 검증
  A4. 프로덕션 동작 확인 (health + auth + spec-generate)

Phase B: 에이전트 실연동 (F53) — P0, 핵심
  B1. AgentRunner 인터페이스 + types (shared/agent.ts)
  B2. ClaudeApiRunner 구현 (Anthropic API 호출)
  B3. AgentOrchestrator.executeTask() 추가
  B4. Agent Route 3 endpoints 추가 (/execute, /runners, /tasks/{id}/result)
  B5. 0005 D1 migration (agent_tasks 확장 + spec_conflicts)
  B6. 대시보드 AgentExecuteModal + AgentTaskResult UI
  B7. MCP 어댑터 인터페이스 설계 (stub)
  B8. 테스트: ClaudeApiRunner + executeTask + 라우트

Phase C: NL→Spec 충돌 감지 (F54) — P1
  C1. ConflictDetector 서비스 (규칙 기반 + LLM 2차 검증)
  C2. spec.ts 라우트 확장 (generate 응답에 conflicts, resolve endpoint)
  C3. Spec Generator 충돌 표시 UI (ConflictCard + ConflictResolver)
  C4. 테스트: ConflictDetector + spec route + UI

Phase A는 즉시 실행, Phase B→C는 순차.
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F52 배포 | 0 | ~2 | smoke test |
| F53 에이전트 | ~5 | ~5 | ~18 |
| F54 충돌 감지 | ~3 | ~4 | ~10 |
| **합계** | ~8 | ~11 | ~28 |

**Sprint 10 완료 후 예상 테스트**: 241 (기존) + ~28 = ~269 tests

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (Agent Runner) | `packages/api/src/services/agent-runner.ts`, `claude-api-runner.ts`, `mcp-adapter.ts`, 관련 테스트 | `packages/web/`, `packages/cli/`, `SPEC.md`, `CLAUDE.md`, `conflict-detector.ts` |
| W2 (Conflict Detector) | `packages/api/src/services/conflict-detector.ts`, `spec.ts` 라우트 확장, 관련 테스트 | `packages/web/`, `packages/cli/`, `SPEC.md`, `agent-runner.ts` |
| Leader | F52 배포, 대시보드 UI (AgentExecuteModal, ConflictResolver), agent.ts 라우트, SPEC 관리, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | Anthropic API Workers 호환성 | Medium | High | fetch 직접 호출 우선, SDK 실패 시 fetch 유지. Workers AI fallback 활용 |
| R2 | Claude API 토큰 비용 초과 | Medium | Medium | 에이전트 실행 시 토큰 상한(maxTokens) 설정 + 일일 한도. 초기에는 haiku만 사용 |
| R3 | 충돌 감지 정확도 낮음 | Medium | Medium | Phase 1 규칙 기반으로 시작, LLM은 후보 필터링 후만 호출. confidence 표시로 사용자 판단 지원 |
| R4 | wrangler WSL hang 재발 | High | Low | Dashboard 또는 GitHub Actions 경유. wrangler는 typecheck/build에만 사용 |
| R5 | MCP 인터페이스 설계가 실 구현 시 변경 필요 | Medium | Low | Sprint 10은 인터페이스만 — 구체 구현은 Sprint 11에서 MCP 스펙 확인 후 |
| R6 | 에이전트 실행 흐름이 복잡해져 테스트 어려움 | Medium | Medium | AgentRunner mock으로 API 레이어 테스트 분리. E2E는 Sprint 11 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F52 배포** | Workers API 프로덕션 URL에서 health OK + auth flow 동작 + D1 데이터 조회 정상 |
| **F53 에이전트** | ClaudeApiRunner로 코드 리뷰 요청 → 결과 반환 → agent_tasks 기록 → SSE 이벤트 → 대시보드 표시. MCP 인터페이스 파일 존재 |
| **F54 충돌 감지** | Spec Generator에서 중복 spec 입력 시 충돌 감지 → 충돌 카드 표시 → 수락/거절/수정 → 해결 기록 |
| **전체** | typecheck ✅, build ✅, ~269 tests ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

Sprint 10에서 명시적으로 제외하는 항목:

| 항목 | 사유 | 이관 |
|------|------|------|
| MCP Runner 구체 구현 | Sprint 10은 인터페이스만, 실 MCP 서버 연동은 별도 | Sprint 11+ |
| 에이전트 자동 PR 생성 | GitHub API 통한 실 PR 생성은 보안 검토 후 | Sprint 11+ |
| E2E 테스트 고도화 | Sprint 10은 핵심 기능 집중 | Sprint 11 |
| v1.0.0 릴리스 | Phase 2 마무리 릴리스 | Sprint 11 |
| 멀티테넌시 | Phase 3 범위 (PRD §8) | Phase 3 |
| 외부 도구 연동 (Jira, Slack) | Phase 3 범위 | Phase 3 |
| npm publish foundry-x@0.10.0 | CLI 변경 없음 | 변경 시 추가 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F52~F54 계획 | Sinclair Seo |
