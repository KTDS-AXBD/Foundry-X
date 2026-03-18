---
code: FX-PLAN-015
title: Sprint 14 (v1.2.0) — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반
version: 0.1
status: Draft
category: PLAN
system-version: 1.2.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 14 (v1.2.0) Planning Document

> **Summary**: MCP 1.0의 마지막 핵심 기능인 Resources(파일/데이터 리소스 노출 + 구독/알림)를 구현하여 MCP 프로토콜 통합을 완성하고, 멀티 에이전트가 동시에 PR을 생성할 때 발생하는 파일 충돌을 감지·해결하는 병렬 작업 메커니즘을 구축하며, Phase 3(멀티테넌시+외부 도구) 전환을 위한 설계 기반을 마련한다. v1.2.0 릴리스.
>
> **Project**: Foundry-X
> **Version**: 1.2.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | MCP 통합이 Tools+Sampling+Prompts까지 구현되었으나 Resources(파일/데이터 리소스 발견·읽기·구독)가 미구현이어서 MCP 서버의 데이터를 직접 소비할 수 없음. 에이전트 자동 PR이 단일 에이전트 순차 실행만 지원하여 여러 에이전트가 동시에 작업 시 파일 충돌을 감지·해결할 수 없음. Phase 3(멀티테넌시+외부 연동) 전환을 위한 설계 기반이 부재 |
| **Solution** | F67: MCP Resources 발견·읽기 + 구독·알림으로 MCP 4대 기능(Tools, Sampling, Prompts, Resources) 완전 통합 / F68: 멀티 에이전트 Merge Queue + 파일 충돌 감지 + 순차 merge 전략 / F69: v1.2.0 릴리스 + 멀티테넌시 데이터 모델 설계 + Phase 3 로드맵 |
| **Function/UX Effect** | MCP 서버가 노출한 파일·데이터를 브라우저에서 탐색·읽기·구독. 여러 에이전트가 동시에 브랜치에서 작업하고 PR을 생성하면 시스템이 자동으로 충돌을 감지하고 merge 순서를 결정. Phase 3 전환 시 멀티테넌시 DB 스키마 즉시 적용 가능 |
| **Core Value** | MCP 프로토콜 4/4 완전 통합으로 외부 AI 에코시스템 연결 완성 + "멀티 에이전트 병렬 협업"이라는 PRD 핵심 비전 실현 단계 + Phase 3 설계 선행으로 전환 비용 최소화 |

---

## 1. Overview

### 1.1 Purpose

Sprint 14는 **Phase 2의 마지막 스프린트**이자 **Phase 3 전환 준비**를 겸해요. 세 가지 축으로 구성돼요:

- **F67 MCP Resources + Notifications (P1)**: MCP 1.0의 4대 기능 중 마지막인 Resources를 구현하여 MCP 서버의 파일/데이터 리소스를 발견·읽기·구독할 수 있게 함
- **F68 멀티 에이전트 동시 PR + 충돌 해결 (P0)**: Sprint 13의 단일 에이전트 PR 파이프라인을 확장하여 여러 에이전트가 동시에 작업할 때 파일 충돌을 감지하고 merge 순서를 조율
- **F69 v1.2.0 릴리스 + Phase 3 기반 구축 (P2)**: 릴리스 안정화 + 멀티테넌시 데이터 모델 설계 문서 + Phase 3 로드맵

### 1.2 Background

**F67 배경 — MCP Resources**:
- MCP 1.0 스펙의 4대 기능: Tools(✅), Sampling(✅), Prompts(✅), **Resources(미구현)**
- Resources는 MCP 서버가 파일, 데이터베이스 레코드, API 응답 등을 "리소스"로 노출하는 기능
- McpRunner에 `listResources(): Promise<McpResource[]>` 스텁이 이미 존재 (Sprint 12에서 인터페이스만 정의)
- Resources 구독(subscribe)을 통해 리소스 변경 시 실시간 알림 수신 가능

**F68 배경 — 멀티 에이전트 동시 PR**:
- Sprint 13에서 단일 에이전트 PR 파이프라인 완성 (PrPipelineService + ReviewerAgent + 7-gate auto-merge)
- 현재 한계: AgentOrchestrator가 순차 실행만 지원 — 에이전트 A가 PR을 만드는 동안 에이전트 B는 대기
- PRD §7.6 "브랜치 기반 격리" 전략의 핵심: 여러 에이전트가 **독립 브랜치에서 동시 작업** → 충돌 감지 → 자동/수동 해결
- 실제 시나리오: 에이전트 A가 `auth.ts`를 수정하고, 에이전트 B도 `auth.ts`를 수정하면 merge 충돌 발생

**현재 한계**:

| 영역 | 현재 상태 | 한계 |
|------|----------|------|
| MCP Resources | McpRunner.listResources() 스텁 ✅ | 실제 리소스 읽기/구독 미구현 |
| MCP UI | Prompts 브라우저 ✅ | Resources 브라우저 없음 |
| 에이전트 PR | 단일 에이전트 PR 전체 자동화 ✅ | 동시 PR 충돌 감지/해결 메커니즘 없음 |
| 병렬 실행 | AgentOrchestrator.executeTask() 순차 ✅ | 복수 에이전트 동시 실행 관리 없음 |
| 멀티테넌시 | users 테이블 단일 조직 ✅ | 조직 격리 없음 — Phase 3 전제 조건 |

### 1.3 Prerequisites (Sprint 13 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| McpRunner (tools/call + prompts + sampling) | ✅ | MCP 3/4 기능 구현 완료 |
| McpRunner.listResources() 스텁 | ✅ | 인터페이스 정의, 구현 대기 |
| PrPipelineService (단일 에이전트 PR) | ✅ | branch→commit→PR→review→merge 전체 자동화 |
| ReviewerAgent (cross-agent 리뷰) | ✅ | LLM 기반 코드 리뷰 + SDD/Quality/Security 점수 |
| GitHubService (PR 관련 8 메서드) | ✅ | createBranch/createPR/mergePR/getPrDiff 등 |
| Auto-merge 7-gate | ✅ | SDD+Quality+Security+CI+Daily limit+Human |
| SSE agent.pr.* 이벤트 4종 | ✅ | created/reviewed/merged/review_needed |
| 388 tests + 20 E2E | ✅ | CLI 106 + API 237 + Web 45 |
| D1 13 테이블 | ✅ | agent_prs + mcp_sampling_log 포함 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F67 | MCP Resources + Notifications | P1 | MCP 리소스 발견·읽기·구독·알림 + UI 브라우저 |
| F68 | 멀티 에이전트 동시 PR + 충돌 해결 | P0 | Merge Queue + 파일 충돌 감지 + 순차 merge 전략 |
| F69 | v1.2.0 릴리스 + Phase 3 기반 구축 | P2 | 릴리스 + 멀티테넌시 설계 + Phase 3 로드맵 |

---

## 2. Feature Specifications

### 2.1 F67: MCP Resources + Notifications (P1)

**목표**: MCP 1.0 프로토콜의 Resources 기능을 구현하여, MCP 서버가 노출하는 파일·데이터 리소스를 발견·읽기·구독할 수 있게 한다.

#### 2.1.1 MCP Resources 개요

MCP Resources는 서버가 클라이언트에 파일, 데이터, API 응답 등을 "리소스"로 노출하는 기능이에요:

```
MCP Resources flow:
  Client(Foundry-X) → MCP Server: "어떤 리소스가 있어?" (resources/list)
  MCP Server → Client: [{uri: "file:///config.json", name: "Config", mimeType: "application/json"}, ...]
  Client → MCP Server: "이 리소스를 읽어줘" (resources/read, uri)
  MCP Server → Client: {contents: [{uri, mimeType, text/blob}]}

Resource Subscription:
  Client → MCP Server: "이 리소스 변경 시 알려줘" (resources/subscribe, uri)
  MCP Server → Client: (변경 발생 시) notification: resources/updated {uri}
  Client → MCP Server: "다시 읽어줘" (resources/read)
```

#### 2.1.2 McpResourcesClient 구현

```typescript
interface McpResource {
  uri: string;           // e.g., "file:///config.json", "db://users/123"
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;         // 텍스트 리소스
  blob?: string;         // base64 바이너리 리소스
}

interface McpResourceTemplate {
  uriTemplate: string;   // e.g., "db://users/{id}"
  name: string;
  description?: string;
  mimeType?: string;
}

class McpResourcesClient {
  constructor(private runner: McpRunner) {}

  // 리소스 목록 조회
  async listResources(serverId: string): Promise<McpResource[]>;

  // 리소스 템플릿 목록 조회 (동적 리소스)
  async listResourceTemplates(serverId: string): Promise<McpResourceTemplate[]>;

  // 리소스 읽기
  async readResource(serverId: string, uri: string): Promise<McpResourceContent[]>;

  // 리소스 구독
  async subscribeResource(serverId: string, uri: string): Promise<void>;

  // 구독 해제
  async unsubscribeResource(serverId: string, uri: string): Promise<void>;
}
```

#### 2.1.3 리소스 변경 알림 (Notifications)

MCP 서버가 리소스 변경을 알릴 때의 처리 흐름:

```typescript
// McpRunner 확장 — notification 핸들러 등록
class McpRunner {
  // 기존 메서드...

  // 신규: notification 핸들러
  onNotification(
    method: string,
    handler: (params: unknown) => void
  ): void;

  // 신규: resources/updated 처리
  private handleResourceUpdated(params: { uri: string }): void;
}

// SSE로 대시보드에 전파
// event: mcp.resource.updated
// data: { serverId, uri, timestamp }
```

#### 2.1.4 MCP API 확장

| Endpoint | Method | 설명 |
|----------|:------:|------|
| `/mcp/servers/:id/resources` | GET | 서버의 리소스 목록 조회 |
| `/mcp/servers/:id/resources/templates` | GET | 리소스 템플릿 목록 |
| `/mcp/servers/:id/resources/read` | POST | 리소스 읽기 (body: { uri }) |
| `/mcp/servers/:id/resources/subscribe` | POST | 리소스 구독 (body: { uri }) |

#### 2.1.5 MCP UI 확장

**workspace/page.tsx MCP Servers 탭 확장**:
- **Resources 브라우저**: 서버별 리소스 목록 (아이콘: 파일/DB/API 구분) + 클릭하여 내용 표시
- **리소스 상세 뷰어**: 텍스트 리소스는 코드 하이라이팅, 바이너리는 다운로드 링크
- **구독 토글**: 리소스별 구독 on/off 스위치 + 변경 알림 배지
- **리소스 템플릿**: 동적 리소스 URI 입력 폼 (e.g., `db://users/{id}` → id 입력 필드)

#### 2.1.6 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/mcp-resources.ts` | 신규 — McpResourcesClient |
| `packages/api/src/services/mcp-runner.ts` | 확장 — readResource, subscribeResource, onNotification |
| `packages/api/src/services/mcp-transport.ts` | 확장 — notification 수신 핸들러 |
| `packages/api/src/routes/mcp.ts` | 확장 — 4 endpoints 추가 |
| `packages/api/src/schemas/mcp.ts` | 확장 — resource Zod 스키마 |
| `packages/shared/src/agent.ts` | McpResource, McpResourceContent, McpResourceTemplate 타입 |
| `packages/web/src/components/feature/McpResourcesPanel.tsx` | 신규 — Resources 브라우저 |
| `packages/web/src/components/feature/ResourceViewer.tsx` | 신규 — 리소스 내용 표시 |
| `packages/web/src/app/(app)/workspace/page.tsx` | Resources 탭 추가 |
| `packages/web/src/lib/api-client.ts` | MCP resources API 함수 추가 |

**테스트 예상**: ~20건 (ResourcesClient 8 + Runner notification 4 + API routes 4 + UI 4)

---

### 2.2 F68: 멀티 에이전트 동시 PR + 충돌 해결 (P0)

**목표**: 여러 에이전트가 동시에 독립 브랜치에서 작업하고 PR을 생성할 때, 파일 충돌을 감지하고 merge 순서를 자동으로 조율하는 메커니즘을 구축한다.

#### 2.2.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│              멀티 에이전트 동시 PR 충돌 해결                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 동시 작업 시작                                               │
│     AgentOrchestrator.executeParallel([taskA, taskB, taskC])    │
│     └─ 각 에이전트가 독립 브랜치에서 작업                          │
│                                                                 │
│  2. PR 생성 (병렬)                                               │
│     ├─ Agent A: agent/a/code-review-001 → PR #101              │
│     ├─ Agent B: agent/b/spec-gen-002    → PR #102              │
│     └─ Agent C: agent/c/test-fix-003    → PR #103              │
│                                                                 │
│  3. 충돌 감지 — MergeQueueService                                │
│     ├─ PR #101: auth.ts, middleware.ts 수정                      │
│     ├─ PR #102: auth.ts, spec.ts 수정                            │
│     └─ 충돌 감지: auth.ts (PR #101 ∩ PR #102)                   │
│                                                                 │
│  4. Merge Queue 순서 결정                                        │
│     ├─ Priority: P0 에이전트 > P1 > P2                           │
│     ├─ 시간순: 먼저 완료된 PR 우선                                │
│     ├─ 충돌 회피: 충돌 없는 PR 먼저 merge                         │
│     └─ 결과: [PR #103(충돌 없음)] → [PR #101(P0)] → [PR #102]   │
│                                                                 │
│  5. 순차 Merge + Rebase                                         │
│     ├─ PR #103: auto-merge ✅ (충돌 없음)                        │
│     ├─ PR #101: auto-merge ✅ (auth.ts 첫 번째 반영)             │
│     └─ PR #102: 충돌 발생 → rebase 시도                          │
│         ├─ rebase 성공 → auto-merge ✅                           │
│         └─ rebase 실패 → needs_human_review 표시                 │
│                                                                 │
│  6. 결과 기록 + SSE 이벤트                                       │
│     ├─ merge_queue 테이블 업데이트                                │
│     ├─ SSE: agent.queue.updated / agent.queue.conflict           │
│     └─ 대시보드: Merge Queue 시각화                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 MergeQueueService

멀티 에이전트 PR의 merge 순서를 관리하는 핵심 서비스:

```typescript
interface MergeQueueEntry {
  prRecordId: string;
  prNumber: number;
  agentId: string;
  priority: number;        // 0=highest
  modifiedFiles: string[]; // 이 PR이 수정하는 파일 목록
  status: 'queued' | 'merging' | 'merged' | 'conflict' | 'failed';
  position: number;        // queue 내 순서
  conflictsWith?: string[]; // 충돌하는 다른 PR ID 목록
  createdAt: string;
}

interface ConflictReport {
  conflicting: Array<{
    prA: string;
    prB: string;
    files: string[];       // 충돌 파일 목록
  }>;
  suggested_order: string[]; // 권장 merge 순서 (PR ID 배열)
  auto_resolvable: boolean;  // rebase로 자동 해결 가능 여부
}

class MergeQueueService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private sse?: SSEManager
  ) {}

  // PR을 merge queue에 추가
  async enqueue(
    prRecordId: string,
    prNumber: number,
    agentId: string,
    priority: number
  ): Promise<MergeQueueEntry>;

  // 충돌 감지 — 현재 queue 내 모든 PR 간 파일 충돌 분석
  async detectConflicts(): Promise<ConflictReport>;

  // Merge 순서 결정 (priority → timestamp → 충돌 회피)
  async calculateMergeOrder(): Promise<string[]>;

  // Queue 내 다음 PR merge 실행
  async processNext(): Promise<{
    merged: boolean;
    prId: string;
    rebaseAttempted?: boolean;
    conflictResolved?: boolean;
  }>;

  // 충돌 발생 시 rebase 시도
  private async attemptRebase(
    prNumber: number,
    baseBranch: string
  ): Promise<boolean>;

  // Queue 상태 조회
  async getQueueStatus(): Promise<MergeQueueEntry[]>;
}
```

#### 2.2.3 AgentOrchestrator 병렬 실행 확장

```typescript
class AgentOrchestrator {
  // 기존: 순차 실행
  async executeTask(...): Promise<AgentExecutionResult>;

  // 신규: 병렬 실행
  async executeParallel(
    tasks: Array<{
      agentId: string;
      taskType: string;
      context: string;
      runner?: AgentRunner;
    }>
  ): Promise<ParallelExecutionResult>;

  // 신규: 병렬 실행 + 자동 PR 생성
  async executeParallelWithPr(
    tasks: Array<{...}>
  ): Promise<ParallelPrResult>;
}

interface ParallelExecutionResult {
  results: Array<{
    agentId: string;
    taskId: string;
    result: AgentExecutionResult;
    status: 'success' | 'failed';
  }>;
  duration_ms: number;
}

interface ParallelPrResult extends ParallelExecutionResult {
  prs: Array<{
    agentId: string;
    prNumber: number;
    prUrl: string;
    queuePosition: number;
  }>;
  conflicts: ConflictReport;
}
```

#### 2.2.4 GitHubService 확장

```typescript
class GitHubService {
  // 기존 메서드...

  // 신규: PR 간 파일 충돌 감지
  async getModifiedFiles(prNumber: number): Promise<string[]>;

  // 신규: rebase 시도
  async updateBranch(
    prNumber: number,
    expectedHeadSha?: string
  ): Promise<{ updated: boolean; sha?: string }>;

  // 신규: merge queue용 PR 상태 일괄 조회
  async getPrStatuses(
    prNumbers: number[]
  ): Promise<Array<{ number: number; mergeable: boolean; state: string }>>;
}
```

#### 2.2.5 SSE 이벤트 확장

| 이벤트 | 트리거 | 데이터 |
|--------|--------|--------|
| `agent.queue.updated` | Queue 순서 변경 | `{ queue: MergeQueueEntry[], totalPrs }` |
| `agent.queue.conflict` | 파일 충돌 감지 | `{ conflicts: ConflictReport }` |
| `agent.queue.merged` | Queue에서 PR merge 완료 | `{ prId, prNumber, position }` |
| `agent.queue.rebase` | Rebase 시도/결과 | `{ prNumber, success, files }` |

#### 2.2.6 대시보드 UI

**agents/page.tsx 확장**:
- **Merge Queue 뷰**: 큐에 있는 PR 목록 + 순서 + 충돌 표시
- **충돌 시각화**: Venn diagram 스타일로 어떤 PR 간 어떤 파일이 충돌하는지 표시
- **병렬 실행 패널**: 여러 에이전트에 동시 작업 요청하는 UI
- **Queue 제어**: merge 순서 수동 조정 + 특정 PR 우선 처리 버튼

**신규 컴포넌트**:
- `MergeQueuePanel.tsx`: Merge Queue 시각화 (순서, 상태, 충돌 표시)
- `ConflictDiagram.tsx`: PR 간 파일 충돌 시각화
- `ParallelExecutionForm.tsx`: 멀티 에이전트 동시 실행 요청 폼

#### 2.2.7 D1 스키마 변경

```sql
-- 0008_merge_queue.sql
CREATE TABLE merge_queue (
  id TEXT PRIMARY KEY,
  pr_record_id TEXT NOT NULL REFERENCES agent_prs(id),
  pr_number INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL,
  modified_files TEXT NOT NULL DEFAULT '[]',   -- JSON array of file paths
  status TEXT NOT NULL DEFAULT 'queued',
  -- status: queued → merging → merged / conflict / failed
  conflicts_with TEXT DEFAULT '[]',            -- JSON array of conflicting PR IDs
  rebase_attempted INTEGER DEFAULT 0,
  rebase_succeeded INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  merged_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_merge_queue_status ON merge_queue(status);
CREATE INDEX idx_merge_queue_position ON merge_queue(position);

-- 병렬 실행 추적
CREATE TABLE parallel_executions (
  id TEXT PRIMARY KEY,
  task_ids TEXT NOT NULL DEFAULT '[]',         -- JSON array of task IDs
  agent_ids TEXT NOT NULL DEFAULT '[]',        -- JSON array of agent IDs
  status TEXT NOT NULL DEFAULT 'running',
  -- status: running → completed → partially_failed
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
```

#### 2.2.8 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/api/src/services/merge-queue.ts` | 신규 — MergeQueueService |
| `packages/api/src/services/agent-orchestrator.ts` | 확장 — executeParallel, executeParallelWithPr |
| `packages/api/src/services/github.ts` | 확장 — getModifiedFiles, updateBranch, getPrStatuses |
| `packages/api/src/services/pr-pipeline.ts` | 확장 — merge queue 연동 |
| `packages/api/src/routes/agent.ts` | 확장 — merge queue + 병렬 실행 endpoints |
| `packages/api/src/schemas/agent.ts` | 확장 — MergeQueue, ParallelExecution Zod 스키마 |
| `packages/api/src/services/sse-manager.ts` | 확장 — agent.queue.* 이벤트 4종 |
| `packages/shared/src/agent.ts` | MergeQueueEntry, ConflictReport, ParallelExecutionResult 타입 |
| `packages/shared/src/web.ts` | MergeQueue UI 표시용 타입 |
| `packages/web/src/app/(app)/agents/page.tsx` | Merge Queue + 병렬 실행 + 충돌 뷰 |
| `packages/web/src/components/feature/MergeQueuePanel.tsx` | 신규 — Queue 시각화 |
| `packages/web/src/components/feature/ConflictDiagram.tsx` | 신규 — 충돌 다이어그램 |
| `packages/web/src/components/feature/ParallelExecutionForm.tsx` | 신규 — 병렬 실행 폼 |
| `packages/web/src/lib/api-client.ts` | merge queue + parallel 관련 API 함수 추가 |

**API endpoints 추가 (5건)**:

| Endpoint | Method | 설명 |
|----------|:------:|------|
| `/agents/parallel` | POST | 멀티 에이전트 병렬 실행 요청 |
| `/agents/parallel/:id` | GET | 병렬 실행 상태 조회 |
| `/agents/queue` | GET | Merge Queue 상태 조회 |
| `/agents/queue/:id/priority` | PATCH | Queue 내 PR 우선순위 변경 |
| `/agents/queue/process` | POST | Queue에서 다음 PR merge 실행 |

**테스트 예상**: ~28건 (MergeQueue 10 + Orchestrator parallel 6 + GitHub 확장 4 + Routes 5 + UI 3)

---

### 2.3 F69: v1.2.0 릴리스 + Phase 3 기반 구축 (P2)

**목표**: Sprint 14 구현을 안정화하고 v1.2.0을 릴리스하며, Phase 3 전환을 위한 멀티테넌시 설계와 로드맵을 준비한다.

#### 2.3.1 릴리스 체크리스트

- [ ] Sprint 13 미완료: D1 migration 0007 remote 적용
- [ ] D1 migration 0008 remote 적용 (merge_queue + parallel_executions)
- [ ] CHANGELOG.md v1.2.0 항목 작성
- [ ] package.json version bump (packages/api, packages/web, root)
- [ ] Workers 프로덕션 배포
- [ ] Pages 프로덕션 배포
- [ ] Smoke test 통과
- [ ] git tag v1.2.0

#### 2.3.2 Phase 3 기반 — 멀티테넌시 설계 문서

Phase 3의 핵심 전제인 멀티테넌시 데이터 모델을 설계 문서로 작성:

**설계 범위**:
- 조직(Organization) → 프로젝트(Project) 계층 구조
- 테넌트 격리 전략: Row-Level Security vs 별도 D1 Database
- 기존 테이블 마이그레이션 계획 (users, projects, agents, wiki_pages 등)
- 초대/가입 흐름 설계
- RBAC 확장: 조직 관리자 / 프로젝트 멤버 / 뷰어

**산출물**: `docs/02-design/features/multitenancy.design.md`

#### 2.3.3 Phase 3 로드맵

Phase 3 세부 스프린트 계획을 docs/specs에 작성:

| Sprint | 예상 범위 |
|--------|----------|
| Sprint 15 | 멀티테넌시 DB 마이그레이션 + 조직 CRUD + 초대 흐름 |
| Sprint 16 | 외부 도구 연동 (Jira webhook, Slack bot) |
| Sprint 17 | 팀 온보딩 + 사용자 피드백 루프 + KPI 측정 시작 |
| Sprint 18 | 모노리포 분리 검토 + 성능 최적화 |

#### 2.3.4 테스트 보강

| 영역 | 내용 | 예상 |
|------|------|:----:|
| Merge Queue E2E | Playwright — agents 페이지 queue 생성→충돌→merge 흐름 | 3건 |
| MCP Resources E2E | workspace MCP Resources 브라우저 사용 흐름 | 2건 |
| API 통합 | MergeQueue + ParallelExecution + GitHub 서비스 간 통합 | 5건 |

**테스트 예상**: ~10건 (E2E 5 + API 통합 5)

#### 2.3.5 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `docs/CHANGELOG.md` | v1.2.0 항목 추가 |
| `package.json` (루트, api, web) | version bump |
| `SPEC.md` | Sprint 14 F-items + §6 Execution Plan 갱신 |
| `CLAUDE.md` | 현재 상태 갱신 |
| `docs/02-design/features/multitenancy.design.md` | 신규 — 멀티테넌시 설계 문서 |
| `docs/specs/phase-3-roadmap.md` | 신규 — Phase 3 로드맵 |
| `packages/web/e2e/merge-queue.spec.ts` | 신규 — Merge Queue E2E |
| `packages/web/e2e/mcp-resources.spec.ts` | 신규 — MCP Resources E2E |

---

## 3. Technical Architecture

### 3.1 Sprint 14 변경 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sprint 14 변경                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Web Dashboard (Next.js)                        │  │
│  │                                                            │  │
│  │  agents/page.tsx                                           │  │
│  │    ├─ MergeQueuePanel (F68 신규) ← Queue 시각화             │  │
│  │    ├─ ConflictDiagram (F68 신규) ← PR 간 충돌 시각화         │  │
│  │    └─ ParallelExecutionForm (F68 신규) ← 병렬 실행 폼       │  │
│  │                                                            │  │
│  │  workspace/page.tsx                                        │  │
│  │    ├─ McpResourcesPanel (F67 신규) ← Resources 브라우저     │  │
│  │    └─ ResourceViewer (F67 신규) ← 리소스 내용 표시           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │ SSE (agent.queue.* + mcp.resource.*)    │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              API Server (Hono)                              │  │
│  │                                                            │  │
│  │  MergeQueueService (F68 핵심)                               │  │
│  │    ├─ enqueue → detectConflicts → calculateMergeOrder      │  │
│  │    ├─ processNext → attemptRebase                          │  │
│  │    └─ PrPipelineService 연동                                │  │
│  │                                                            │  │
│  │  AgentOrchestrator (F68 확장)                               │  │
│  │    ├─ executeParallel — 다중 에이전트 동시 실행              │  │
│  │    └─ executeParallelWithPr — 병렬 실행 + 자동 PR + Queue   │  │
│  │                                                            │  │
│  │  McpResourcesClient (F67)                                  │  │
│  │    ├─ listResources / listResourceTemplates                │  │
│  │    ├─ readResource                                         │  │
│  │    └─ subscribeResource / unsubscribeResource              │  │
│  │                                                            │  │
│  │  McpRunner (F67 확장)                                      │  │
│  │    └─ onNotification — resources/updated 핸들링             │  │
│  │                                                            │  │
│  │  GitHubService (F68 확장)                                  │  │
│  │    └─ getModifiedFiles / updateBranch / getPrStatuses      │  │
│  │                                                            │  │
│  │  SSEManager (F67+F68 확장)                                 │  │
│  │    ├─ agent.queue.* 이벤트 4종                              │  │
│  │    └─ mcp.resource.updated 이벤트                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │                                         │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  D1 (F68: 0008 migration)                                  │  │
│  │    ├─ merge_queue (신규) — PR merge 순서 관리                │  │
│  │    └─ parallel_executions (신규) — 병렬 실행 추적            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  GitHub API (octokit) — F68 확장                            │  │
│  │    ├─ GET /repos/.../pulls/{pr}/files — 수정 파일 목록       │  │
│  │    ├─ PUT /repos/.../pulls/{pr}/update-branch — rebase     │  │
│  │    └─ 기존 PR 관련 메서드 재활용                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 위치 |
|--------|------|------|
| (없음) | 기존 octokit + LLMService 재활용. MCP protocol은 기존 transport 활용 | — |

### 3.3 D1 스키마 변경

**0008_merge_queue.sql**: `merge_queue` + `parallel_executions` 2개 테이블 추가.

총 테이블: 13 (기존) + 2 = **15개**

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: MCP Resources + Notifications (F67) — P1
  A1. McpResourcesClient — listResources, readResource
  A2. McpRunner 확장 — listResourceTemplates, onNotification
  A3. McpTransport 확장 — notification 수신 핸들러
  A4. MCP routes 확장 — 4 endpoints (resources/list, templates, read, subscribe)
  A5. MCP schemas 확장 — resource Zod 스키마
  A6. shared/agent.ts — McpResource, McpResourceContent, McpResourceTemplate 타입
  A7. McpResourcesPanel.tsx + ResourceViewer.tsx — Resources UI
  A8. workspace/page.tsx — Resources 탭 추가
  A9. SSEManager — mcp.resource.updated 이벤트
  A10. 테스트: ResourcesClient + Runner + routes + UI

Phase B: 멀티 에이전트 동시 PR (F68) — P0 (핵심, A와 병렬 가능)
  B1. MergeQueueService — enqueue, detectConflicts, calculateMergeOrder, processNext
  B2. GitHubService 확장 — getModifiedFiles, updateBranch, getPrStatuses
  B3. AgentOrchestrator 확장 — executeParallel, executeParallelWithPr
  B4. PrPipelineService 확장 — merge queue 연동
  B5. Agent routes 확장 — 5 endpoints (parallel, queue)
  B6. Agent schemas 확장 — MergeQueue, ParallelExecution Zod 스키마
  B7. SSEManager 확장 — agent.queue.* 이벤트 4종
  B8. shared/agent.ts — MergeQueueEntry, ConflictReport, ParallelExecutionResult 타입
  B9. D1 migration 0008 — merge_queue + parallel_executions
  B10. MergeQueuePanel.tsx + ConflictDiagram.tsx + ParallelExecutionForm.tsx
  B11. agents/page.tsx — Queue + 충돌 + 병렬 실행 UI 통합
  B12. 테스트: MergeQueue + Orchestrator + GitHub + Routes + UI

Phase C: 릴리스 + Phase 3 기반 (F69) — A+B 완료 후
  C1. Sprint 13 미완료 D1 migration 0007 remote 적용
  C2. D1 migration 0008 remote 적용
  C3. CHANGELOG v1.2.0
  C4. version bump
  C5. Workers + Pages 배포 + Smoke test
  C6. multitenancy.design.md — 멀티테넌시 설계 문서 작성
  C7. phase-3-roadmap.md — Phase 3 로드맵
  C8. SPEC.md + CLAUDE.md 갱신
  C9. E2E 테스트 — Merge Queue + MCP Resources
  C10. git tag v1.2.0

Phase A와 B는 파일 충돌 없으므로 Agent Teams 병렬 실행 가능.
Phase C는 A+B 완료 후 순차.
```

### 4.2 예상 산출물

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 수 |
|---------|:--------:|:--------:|:--------:|
| F67 MCP Resources | ~3 | ~7 | ~20 |
| F68 Merge Queue | ~4 | ~10 | ~28 |
| F69 릴리스+Phase 3 | ~4 | ~5 | ~10 |
| **합계** | ~11 | ~22 | ~58 |

**Sprint 14 완료 후 예상 테스트**: 388 (기존) + ~58 = **~446 tests**
**E2E**: 20 (기존) + 5 = **25 E2E specs**
**API endpoints**: 41 (기존) + 9 = **50개**
**D1 테이블**: 13 (기존) + 2 = **15개**

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (MCP Resources) | `mcp-resources.ts`, `mcp-runner.ts` Resources 확장, `mcp-transport.ts` notification, `routes/mcp.ts` Resources endpoints, `McpResourcesPanel.tsx`, `ResourceViewer.tsx`, 관련 테스트 | `merge-queue.ts`, `routes/agent.ts` parallel/queue, `MergeQueuePanel.tsx` |
| W2 (Merge Queue) | `merge-queue.ts`, `agent-orchestrator.ts` parallel 확장, `github.ts` 확장, `routes/agent.ts` queue/parallel endpoints, `MergeQueuePanel.tsx`, `ConflictDiagram.tsx`, `ParallelExecutionForm.tsx`, 관련 테스트 | `mcp-*.ts`, `routes/mcp.ts`, `workspace/page.tsx` |
| Leader | D1 migration, shared 타입, SSE 확장, agents/page.tsx 통합, workspace/page.tsx Resources 탭, SPEC/CLAUDE.md, multitenancy.design.md, phase-3-roadmap.md, 릴리스, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | Merge Queue 순서 결정 로직 복잡도 — 충돌 그래프 탐색 필요 | Medium | Medium | 초기에는 greedy 알고리즘 (충돌 없는 PR 우선, 나머지 priority 순). 그래프 기반 최적화는 Sprint 15+ |
| R2 | GitHub API rate limit — 다수 PR 동시 merge 시 | Medium | High | octokit throttle + merge queue 처리 간격 조절 (최소 5초). burst 방지 |
| R3 | Rebase 자동화 실패율 — 복잡한 충돌은 자동 해결 불가 | High | Medium | rebase 실패 시 즉시 `needs_human_review` 표시. 사람이 수동 해결 후 queue 재진입 |
| R4 | MCP Resources notification — 장시간 연결 유지 필요 | Medium | Medium | SSE 기반 notification은 이미 구현된 패턴 활용. 연결 끊김 시 재연결 + 마지막 읽기 시점 이후 변경 조회 |
| R5 | 병렬 실행 시 D1 write 경합 | Low | Medium | D1은 SQLite 기반으로 write lock 발생 가능. 각 에이전트 task는 독립 레코드이므로 실제 경합 낮음 |
| R6 | Agent Teams W1/W2 파일 충돌 | Low | Medium | MCP(W1)과 Queue(W2)는 파일 경로 완전 분리. 금지 파일 명시로 방지 |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F67 MCP Resources** | MCP 서버의 리소스 목록 조회 + 리소스 읽기 + 구독/알림 동작 + Resources 브라우저 UI + ~20건 테스트 통과 |
| **F68 Merge Queue** | 3개 이상 에이전트 동시 실행 → PR 생성 → 충돌 감지 → 순차 merge 전체 흐름 동작 + ~28건 테스트 통과 |
| **F69 릴리스+Phase 3** | v1.2.0 태그 + 프로덕션 배포 + smoke test + multitenancy.design.md + ~10건 테스트 |
| **전체** | typecheck ✅, build ✅, ~446 tests ✅, E2E 25 specs ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

Sprint 14에서 명시적으로 제외하는 항목:

| 항목 | 사유 | 이관 |
|------|------|------|
| 멀티테넌시 DB 마이그레이션 | 설계만 선행, 구현은 Phase 3 Sprint 15 | Sprint 15 |
| 외부 도구 연동 (Jira, Slack) | Phase 3 Sprint 16 범위 | Sprint 16 |
| MCP Roots (root 디렉토리 노출) | MCP 1.0 optional 기능 — 낮은 우선순위 | 필요 시 Sprint 15+ |
| 에이전트 브라우저 연동 (Playwright) | Phase 3 고급 기능 | Phase 3 |
| 그래프 기반 충돌 해결 최적화 | 초기에는 greedy 알고리즘으로 충분 | Sprint 15+ 필요 시 |
| npm publish | CLI 변경 없음 | 변경 시 추가 |
| 모노리포 분리 | Phase 3+ 범위 | Phase 3+ |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F67~F69 계획 (MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반) | Sinclair Seo |
