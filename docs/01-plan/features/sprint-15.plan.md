---
code: FX-PLAN-016
title: Sprint 15 (v1.3.0) — 제품 포지셔닝 재점검 + PlannerAgent + 에이전트 inbox + git worktree
version: 0.2
status: Draft
category: PLAN
system-version: 1.3.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 15 (v1.3.0) Planning Document

> **Summary**: 에이전트가 코드를 작성하기 전에 코드베이스를 리서치하고 실행 계획을 수립하는 PlannerAgent를 도입하여 "사람 승인 → 실행" 흐름을 확립하고, 에이전트 간 비동기 inbox 메시지 큐를 구축하여 Leader/Worker 협업을 가능하게 하며, 에이전트별 독립 git worktree를 자동 할당하여 병렬 작업 시 파일 충돌을 물리적으로 격리한다. v1.3.0 릴리스.
>
> **Project**: Foundry-X
> **Version**: 1.3.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 에이전트가 즉시 코드 생성에 돌입하여 사전 검토 없이 실행하는 비효율. 에이전트 간 통신 부재로 Leader/Worker 패턴 구현 불가. 병렬 작업 시 워킹 트리 공유로 충돌 빈번. Foundry-X가 기존 AX BD팀 서비스(Discovery-X, AXIS DS, AI Foundry)와의 관계가 불명확하여 제품 정체성 혼란 |
| **Solution** | F73(P0): 제품 포지셔닝 재점검 — 기존 서비스 연동 범위 확정 + 정체성 재정립 / F70: PlannerAgent — 코드베이스 분석 + 계획 수립 + 인간 승인 / F71: Agent inbox — D1 비동기 메시지 큐 + SSE / F72: WorktreeManager — 에이전트별 독립 git worktree |
| **Function/UX Effect** | 제품 포지셔닝 명확화로 Sprint 15+ 방향 확정. 에이전트가 계획을 먼저 제시하고 인간 승인 후 실행. Leader/Worker 비동기 협업. 에이전트별 독립 디렉토리 격리 |
| **Core Value** | 제품 전략 선행(F73)으로 기술 구현의 방향성 확보 + "사람이 통제하는 AI 협업" 비전 실현 — Plan→Approve→Execute 흐름 + Leader/Worker 생태계 기반 + 물리적 격리 안정성 |

---

## 1. Overview

### 1.1 Purpose

Sprint 15는 **에이전트 자율성과 인간 통제의 균형**을 잡는 스프린트예요. 세 가지 축으로 구성돼요:

- **F70 PlannerAgent 도입 (P1)**: open-swe의 Planner 패턴을 차용하여, 에이전트가 코드를 작성하기 전에 코드베이스를 분석하고 실행 계획을 수립하며, 사람이 이를 승인/수정/거절하는 흐름을 구축
- **F71 에이전트 간 inbox 통신 (P1)**: ClawTeam의 agent-to-agent 메시징 패턴을 차용하여, Leader/Worker 간 비동기 메시지 큐를 D1 기반으로 구현하고 SSE 실시간 알림을 연동
- **F72 git worktree 격리 (P2)**: 에이전트별 독립 git worktree를 자동 할당하여 병렬 작업 시 파일 충돌을 물리적으로 차단. WIP WorktreeManager를 `simple-git` 통합으로 확장
- **F73 제품 포지셔닝 재점검 (P0)**: 기존 서비스(Discovery-X, AXIS DS, AI Foundry) 연동 계획 + Foundry-X 정체성 재정립. 리서치 + 스코프 재정의 (코드 구현 없음, 문서 산출물)

### 1.2 Background

**F70 배경 — PlannerAgent**:
- 출처: FX-RESEARCH-014 GAP-1 (open-swe Planner Agent 패턴)
- 현재 한계: AgentOrchestrator가 ClaudeApiRunner에 바로 실행을 위임 → 사전 계획 없이 코드 생성
- WIP: `AgentPlanCard.tsx` — 승인/수정/거절 3-action UI 완성 상태
- 목표: `Manager → Planner → (인간 승인) → Programmer → Reviewer → PR` 흐름

**F71 배경 — Agent inbox**:
- 출처: FX-RESEARCH-014 GAP-2 (ClawTeam agent-to-agent inbox)
- 현재 한계: 에이전트 간 직접 통신 수단 없음 — SSE는 대시보드→사람 단방향
- 목표: Leader가 Worker에게 작업 지시 + Worker가 결과/질문을 Leader에게 전송

**F72 배경 — git worktree 격리**:
- 출처: FX-RESEARCH-014 GAP-3 (ClawTeam worker isolation)
- 현재 한계: 멀티 에이전트가 같은 워킹 트리를 공유 → MergeQueue로 사후 충돌 해결 (Sprint 14)
- WIP: `WorktreeManager` — in-memory CRUD + 6 테스트, `simple-git` 미연동
- 목표: 에이전트마다 `git worktree add` 자동 실행 → 독립 디렉토리에서 작업 → 완료 후 cleanup

### 1.3 WIP 자산 현황

| 파일 | F-item | 상태 | 확장 필요 |
|------|:------:|------|-----------|
| `packages/web/src/components/feature/AgentPlanCard.tsx` | F70 | UI 완성 (193 LOC) | `AgentPlan` 타입을 shared로 이동 |
| `packages/api/src/services/worktree-manager.ts` | F72 | 기본 CRUD (63 LOC) | `simple-git` CLI 연동 + D1 기록 |
| `packages/api/src/__tests__/worktree-manager.test.ts` | F72 | 6 테스트 | `simple-git` mock 테스트 추가 |

### 1.4 현재 한계

| # | 한계 | 영향 |
|---|------|------|
| L1 | 에이전트가 계획 없이 즉시 코드 생성 | 잘못된 접근 → 사후 수정 비용 증가 |
| L2 | 에이전트 간 통신 수단 부재 | Leader/Worker 패턴 구현 불가 |
| L3 | 동일 워킹 트리 공유 | 병렬 작업 시 파일 충돌 빈번 |
| L4 | 인간 승인 없이 자동 실행 | 투명성 부족, 위험한 변경 통제 불가 |

---

## 2. F70: PlannerAgent 도입 — 코드베이스 리서치 + 계획 수립 + 인간 승인

### 2.1 아키텍처

```
AgentOrchestrator.executeTask()
  ↓
PlannerAgent.createPlan(request)
  ├─ 1. 코드베이스 분석 (targetFiles 읽기 + 의존성 파악)
  ├─ 2. 실행 단계 계획 (create/modify/delete/test)
  ├─ 3. 리스크 평가 (영향 범위 + 토큰 추정)
  └─ 4. AgentPlan 생성 → D1 저장 → SSE 이벤트
  ↓
[인간 대시보드: AgentPlanCard]
  ├─ 승인 → AgentOrchestrator.executePlan(planId)
  ├─ 수정 → PlannerAgent.revisePlan(planId, feedback)
  └─ 거절 → 취소
  ↓
ClaudeApiRunner.execute(plan.proposedSteps)
  ↓
PrPipelineService.createPr()
```

### 2.2 신규 파일

| # | 파일 | 용도 |
|---|------|------|
| 1 | `packages/api/src/services/planner-agent.ts` | PlannerAgent 서비스 (코드 분석 + 계획 수립) |
| 2 | `packages/api/src/schemas/plan.ts` | Zod 스키마 (createPlan, approvePlan, rejectPlan) |
| 3 | `packages/api/src/__tests__/planner-agent.test.ts` | PlannerAgent 단위 테스트 (~12건) |

### 2.3 수정 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/shared/src/agent.ts` | `AgentPlan`, `ProposedStep`, `AgentPlanStatus` 타입 추가 |
| 2 | `packages/api/src/services/agent-orchestrator.ts` | `createPlanAndWait()`, `executePlan()` 메서드 추가 |
| 3 | `packages/api/src/routes/agent.ts` | 3 endpoints 추가: `POST /agents/plan`, `POST /agents/plan/:id/approve`, `POST /agents/plan/:id/reject` |
| 4 | `packages/api/src/schemas/agent.ts` | plan 관련 Zod 스키마 통합 |
| 5 | `packages/web/src/app/(app)/agents/page.tsx` | AgentPlanCard 통합 + Plan 목록 UI |
| 6 | `packages/web/src/lib/api-client.ts` | `createPlan()`, `approvePlan()`, `rejectPlan()` API 함수 |

### 2.4 Shared Types (agent.ts에 추가)

```typescript
// ─── Sprint 15: PlannerAgent Types (F70) ───

export type AgentPlanStatus = 'analyzing' | 'pending_approval' | 'approved' | 'rejected' | 'modified' | 'executing' | 'completed';

export interface ProposedStep {
  description: string;
  type: 'create' | 'modify' | 'delete' | 'test';
  targetFile?: string;
  estimatedLines?: number;
}

export interface AgentPlan {
  id: string;
  taskId: string;
  agentId: string;
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  estimatedFiles: number;
  risks: string[];
  estimatedTokens: number;
  status: AgentPlanStatus;
  humanFeedback?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}
```

### 2.5 D1 마이그레이션 (0009)

```sql
-- 0009_planner_agent.sql
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  codebase_analysis TEXT NOT NULL,
  proposed_steps TEXT NOT NULL,  -- JSON array
  estimated_files INTEGER DEFAULT 0,
  risks TEXT,                    -- JSON array
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  human_feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### 2.6 API Endpoints

| Method | Path | 설명 | Auth |
|--------|------|------|:----:|
| POST | `/agents/plan` | 코드 분석 + 계획 수립 요청 | ✅ |
| POST | `/agents/plan/:id/approve` | 계획 승인 → 실행 시작 | ✅ |
| POST | `/agents/plan/:id/reject` | 계획 거절 + 사유 기록 | ✅ |

### 2.7 SSE 이벤트

| 이벤트 | 트리거 | 데이터 |
|--------|--------|--------|
| `agent.plan.created` | PlannerAgent 계획 완료 | `{ planId, taskId, agentId, stepsCount }` |
| `agent.plan.approved` | 인간 승인 | `{ planId, approvedBy }` |
| `agent.plan.rejected` | 인간 거절 | `{ planId, reason }` |

### 2.8 테스트 계획 (~12건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1-3 | PlannerAgent.createPlan — 정상, 빈 targetFiles, 에러 | planner-agent.test.ts |
| 4-5 | PlannerAgent.revisePlan — 피드백 반영, 상태 전환 | planner-agent.test.ts |
| 6-7 | AgentOrchestrator.createPlanAndWait + executePlan | agent-orchestrator.test.ts |
| 8-10 | POST /agents/plan — 생성, 승인, 거절 | agent.test.ts |
| 11-12 | AgentPlanCard render + 승인/거절 interaction | AgentPlanCard.test.tsx |

---

## 3. F71: 에이전트 간 inbox 통신 — Leader/Worker 비동기 메시지 큐

### 3.1 아키텍처

```
Leader Agent                    Worker Agent
    │                               │
    ├─ POST /agents/inbox/send ─────►  agent_messages (D1)
    │   { to: "worker-1",           │
    │     type: "task_assign",       │
    │     payload: { ... } }         │
    │                               │
    │   ◄── SSE agent.message.received ──┤
    │                               │
    │   ◄── POST /agents/inbox/send ─┤
    │       { to: "leader",          │
    │         type: "task_result",   │
    │         payload: { ... } }     │
    │                               │
    ├─ GET /agents/inbox/:agentId ──► 미읽음 메시지 목록
    │                               │
    └─ POST /agents/inbox/:id/ack ──► 읽음 처리
```

### 3.2 신규 파일

| # | 파일 | 용도 |
|---|------|------|
| 1 | `packages/api/src/services/agent-inbox.ts` | AgentInbox 서비스 (send, receive, ack, list) |
| 2 | `packages/api/src/routes/inbox.ts` | inbox API 라우트 3 endpoints |
| 3 | `packages/api/src/schemas/inbox.ts` | Zod 스키마 (sendMessage, listMessages) |
| 4 | `packages/api/src/__tests__/agent-inbox.test.ts` | AgentInbox 단위 테스트 (~10건) |
| 5 | `packages/web/src/components/feature/AgentInboxPanel.tsx` | 에이전트 inbox UI (메시지 목록 + 전송) |

### 3.3 수정 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/shared/src/agent.ts` | `AgentMessage`, `MessageType` 타입 추가 |
| 2 | `packages/api/src/index.ts` | inbox 라우트 등록 |
| 3 | `packages/api/src/services/sse-manager.ts` | `agent.message.received` 이벤트 추가 |
| 4 | `packages/web/src/app/(app)/agents/page.tsx` | AgentInboxPanel 탭 추가 |
| 5 | `packages/web/src/lib/api-client.ts` | `sendAgentMessage()`, `getInbox()`, `ackMessage()` |

### 3.4 Shared Types (agent.ts에 추가)

```typescript
// ─── Sprint 15: Agent Inbox Types (F71) ───

export type MessageType =
  | 'task_assign'      // Leader → Worker: 작업 할당
  | 'task_result'      // Worker → Leader: 작업 결과
  | 'task_question'    // Worker → Leader: 질문/확인 요청
  | 'task_feedback'    // Leader → Worker: 피드백/수정 지시
  | 'status_update';   // 양방향: 상태 업데이트

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  subject: string;
  payload: Record<string, unknown>;
  acknowledged: boolean;
  parentMessageId?: string;  // 스레드 지원
  createdAt: string;
  acknowledgedAt?: string;
}
```

### 3.5 D1 마이그레이션 (0009에 포함)

```sql
-- agent_messages 테이블
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  acknowledged INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_messages_to_agent ON agent_messages(to_agent_id, acknowledged);
CREATE INDEX idx_messages_thread ON agent_messages(parent_message_id);
```

### 3.6 API Endpoints

| Method | Path | 설명 | Auth |
|--------|------|------|:----:|
| POST | `/agents/inbox/send` | 메시지 전송 (from → to) | ✅ |
| GET | `/agents/inbox/:agentId` | 에이전트 수신함 조회 (미읽음 우선) | ✅ |
| POST | `/agents/inbox/:id/ack` | 메시지 읽음 처리 | ✅ |

### 3.7 SSE 이벤트

| 이벤트 | 트리거 | 데이터 |
|--------|--------|--------|
| `agent.message.received` | 새 메시지 전송 시 | `{ messageId, fromAgentId, toAgentId, type, subject }` |

### 3.8 테스트 계획 (~10건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1-3 | AgentInbox.send — 정상, 미존재 agent, 스레드 | agent-inbox.test.ts |
| 4-5 | AgentInbox.list — 미읽음 필터, 전체 조회 | agent-inbox.test.ts |
| 6-7 | AgentInbox.ack — 정상, 이미 읽음 | agent-inbox.test.ts |
| 8-10 | API endpoints (send, list, ack) | inbox.test.ts |

---

## 4. F72: git worktree 격리 — 에이전트별 독립 worktree 자동 할당

### 4.1 아키텍처

```
AgentOrchestrator.executeTaskIsolated(request)
  ↓
WorktreeManager.create(agentId, branchName)
  ├─ git worktree add /tmp/foundry-x-worktrees/{agentId} -b {branchName}
  ├─ D1 worktrees 테이블에 기록
  └─ return { worktreePath, branchName }
  ↓
ClaudeApiRunner.execute({ cwd: worktreePath })
  ↓
PrPipelineService.createPr({ branch: branchName })
  ↓
WorktreeManager.cleanup(agentId)
  ├─ git worktree remove /tmp/foundry-x-worktrees/{agentId}
  └─ D1 status → 'cleaned'
```

### 4.2 WIP 확장 계획

기존 `WorktreeManager`(in-memory Map)를 확장:

| 기존 (WIP) | 추가 |
|-------------|------|
| in-memory Map CRUD | D1 영속 저장 |
| 상태: active/completed/failed/cleaned | `simple-git` 실제 CLI 연동 |
| basePath 설정 | `git worktree add/remove/list` 실행 |
| 6 테스트 | `simple-git` mock 테스트 추가 |

### 4.3 수정 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `packages/api/src/services/worktree-manager.ts` | `simple-git` 통합 + D1 저장 + create/cleanup 실제 구현 |
| 2 | `packages/api/src/__tests__/worktree-manager.test.ts` | `simple-git` mock 추가 (~6건 추가) |
| 3 | `packages/shared/src/agent.ts` | `WorktreeConfig` 타입 추가 (shared로 이동) |
| 4 | `packages/api/src/services/agent-orchestrator.ts` | `executeTaskIsolated()` — worktree 모드 실행 |
| 5 | `packages/api/src/routes/agent.ts` | `GET /agents/worktrees` — worktree 목록 |

### 4.4 D1 마이그레이션 (0009에 포함)

```sql
-- agent_worktrees 테이블
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'master',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cleaned_at TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### 4.5 테스트 계획 (~8건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1-2 | WorktreeManager.create — simple-git 호출 검증 | worktree-manager.test.ts |
| 3-4 | WorktreeManager.cleanup — remove 호출 + D1 상태 갱신 | worktree-manager.test.ts |
| 5-6 | WorktreeManager.list + getPath — D1 조회 | worktree-manager.test.ts |
| 7-8 | AgentOrchestrator.executeTaskIsolated — worktree 생성→실행→정리 | agent-orchestrator.test.ts |

---

## 5. F73: 제품 포지셔닝 재점검 — 기존 서비스 연동 계획 + 정체성 재정립

> **성격**: 코드 구현이 아닌 **전략 리서치 + 문서 산출물**. Sprint 15 기술 구현(F70~F72)의 방향을 확정하는 선행 작업.

### 5.1 기존 서비스 프로파일

| 항목 | Discovery-X | AXIS Design System | AI Foundry |
|------|-------------|-------------------|------------|
| **리포** | KTDS-AXBD/Discovery-X | IDEA-on-Action/AXIS-Design-System | AX-BD-Team/AI-Foundry |
| **목적** | AX 신사업 내부 실험 중심 사고 시스템 — 관찰→행동→근거→자산 축적 | Enterprise-grade React 컴포넌트 라이브러리 + 디자인 토큰 | SI 산출물에서 도메인 지식 추출 → AI Skill 자산 패키징 |
| **스택** | Remix v2 + CF Pages + D1 + Drizzle + React 19 + Tailwind 4 | React 19 + Next.js 15 + Turborepo + pnpm + Tailwind | Bun + Turborepo + CF Workers 12개 (MSA) + D1 + Neo4j + R2 |
| **규모** | TypeScript 5.6MB, 활발 (오늘 push) | TypeScript 966KB, npm v1.1.1, 비활성 (2/1 이후) | TypeScript 3.3MB, 1,737 tests, 활발 (오늘 push) |
| **프로덕션** | https://dx.minu.best (운영 실험 중) | npm @axis-ds/* 6개 패키지 | Production: policies 3,675, skills 3,924 |
| **특이사항** | AXIS DS 이미 사용 중, F51 GitHub Transfer + CF 계정 통합 진행 | `@axis-ds/agentic-ui` AI Agent 전용 UI, MCP 서버 보유 | MCP Server (Streamable HTTP), 5-stage 파이프라인, 멀티 프로바이더 LLM |

### 5.2 관계 모델 — Foundry-X × 기존 서비스

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AX BD팀 제품 생태계                           │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐            │
│  │ Discovery-X  │    │ AI Foundry   │    │ AXIS DS     │            │
│  │ (실험 관리)  │    │ (지식 추출)  │    │ (공유 UI)   │            │
│  │ dx.minu.best │    │ 12 Workers   │    │ npm v1.1.1  │            │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘            │
│         │                   │                   │                    │
│         │  실험 컨텍스트    │  MCP Skill tools  │ @axis-ds/*         │
│         │  HANDOFF→코드     │  ┌────────────────┘ (UI 컴포넌트)     │
│         ▼                   ▼  ▼                                     │
│  ┌──────────────────────────────────┐                                │
│  │          Foundry-X               │                                │
│  │  (AI 에이전트 협업 플랫폼)       │                                │
│  │  "Git이 진실, Foundry-X는 렌즈"  │                                │
│  │  fx.minu.best                    │                                │
│  └──────────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

#### 연동 경로 3가지:

| # | 경로 | 방향 | 구현 방법 | 우선순위 |
|---|------|:----:|-----------|:--------:|
| C1 | **AI Foundry → Foundry-X** | → | AI Foundry의 MCP Server가 Skill tools를 노출 → Foundry-X의 MCP Client(기존 McpRunner)가 소비. 에이전트가 도메인 Skill을 활용하여 하네스 생성 | P1 (Sprint 15+) |
| C2 | **AXIS DS → Foundry-X** | → | Foundry-X의 web 대시보드 UI를 shadcn/ui → @axis-ds/ui-react + agentic-ui로 전환. 팀 내 UI 일관성 확보 | P2 (Phase 3) |
| C3 | **Discovery-X → Foundry-X** | → | Discovery-X의 실험이 HANDOFF 단계에서 코드 프로젝트로 전환 시, Foundry-X가 하네스 자동 부트스트랩. 실험 메타데이터 API 연동 | P3 (Phase 4) |

### 5.3 제품 정체성 재정립

**"Foundry-X는 무엇을 위한 어떤 것인가?"**

| 관점 | 기존 정의 | 재정립 |
|------|----------|--------|
| **What** | "사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼" | **"소프트웨어 팀의 AI 에이전트 통제 레이어"** — 에이전트가 코드를 쓰고, 사람이 검증하고, Git이 기록하는 구조 |
| **Why** | "Git이 진실, Foundry-X는 렌즈" | **유지** — 여전히 핵심 철학. 다만 "렌즈"의 범위를 확장: Git뿐 아니라 외부 서비스(AI Foundry, Discovery-X)의 지식도 렌즈로 통합 |
| **For Whom** | KTDS AX BD팀 내부 | **확장**: AI 에이전트를 사용하는 모든 개발 팀 (AX BD팀이 파일럿) |
| **다른 서비스와의 차별점** | SDD Triangle, 하네스, NL→Spec | **에이전트 통제(PlannerAgent) + 조직 지식 연결(AI Foundry Skill 소비) + 실험-코드 연결(Discovery-X HANDOFF)** |

### 5.4 Sprint 15 스코프 재정의

F73 결과를 반영한 Sprint 15 최종 스코프:

| F# | 제목 | Priority | 산출물 유형 | FX-RESEARCH-014 반영 |
|:--:|-------|:--------:|:-----------:|:--------------------:|
| F73 | 제품 포지셔닝 재점검 | P0 | 문서 (이 섹션) | — (자체 리서치) |
| F70 | PlannerAgent 도입 | P1 | 코드 | ✅ open-swe Planner |
| F71 | 에이전트 inbox 통신 | P1 | 코드 | ✅ ClawTeam inbox |
| F72 | git worktree 격리 | P2 | 코드 | ✅ ClawTeam worktree |

**F73이 영향을 주는 변경**:
- C1(AI Foundry MCP 연동)은 Sprint 15에서는 **설계 문서만** 작성. 구현은 Sprint 16+
- C2(AXIS DS 전환)는 Phase 3 멀티테넌시 작업과 함께 진행 (UI 리뉴얼과 병행)
- C3(Discovery-X 연동)은 Phase 4 이후 (Discovery-X F51 인프라 이전 완료 후)

### 5.5 산출물 체크리스트

- [ ] Sprint 15 Plan 문서에 F73 섹션 포함 (이 섹션) ✅
- [ ] 세 서비스 프로파일 분석 완료 ✅
- [ ] 관계 모델 + 연동 경로 정의 완료 ✅
- [ ] 제품 정체성 재정립 완료 ✅
- [ ] Sprint 15 스코프 재정의 완료 ✅
- [ ] SPEC.md F73 → ✅ DONE 상태 전환 (이 섹션 완성 시)

---

## 6. D1 마이그레이션 통합 (0009) — F70+F71+F72

하나의 마이그레이션 파일에 3개 테이블을 포함:

```sql
-- 0009_sprint_15_planner_inbox_worktree.sql

-- F70: 에이전트 계획
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  codebase_analysis TEXT NOT NULL,
  proposed_steps TEXT NOT NULL,
  estimated_files INTEGER DEFAULT 0,
  risks TEXT,
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  human_feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT
);

-- F71: 에이전트 메시지
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT
);

CREATE INDEX idx_messages_to_agent ON agent_messages(to_agent_id, acknowledged);
CREATE INDEX idx_messages_thread ON agent_messages(parent_message_id);

-- F72: 에이전트 worktree
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'master',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cleaned_at TEXT
);
```

---

## 7. Agent Teams 구성

### 7.1 Worker 배분

| Worker | 범위 | 금지 파일 | 테스트 목표 |
|--------|------|----------|:-----------:|
| W1 (PlannerAgent) | planner-agent.ts, plan.ts 스키마, agent.ts 라우트 plan 부분 + 테스트 | inbox.ts, worktree-manager.ts, web/ | ~12건 |
| W2 (Inbox + Worktree) | agent-inbox.ts, inbox.ts 라우트, worktree-manager.ts 확장 + 테스트 | planner-agent.ts, web/ | ~18건 |
| Leader | shared 타입, 대시보드 UI, agent-orchestrator 통합, D1 migration, SSE, 검증 | — | 통합 |

### 7.2 병렬 실행 전략

1. **Leader 선행**: shared/agent.ts 타입 추가 + D1 migration 0009 작성
2. **W1+W2 병렬**: 각 서비스 + 테스트 독립 구현
3. **Leader 후행**: UI 통합 + agent-orchestrator 연결 + SSE + 최종 검증

---

## 8. 전체 파일 목록

### 8.1 신규 파일 (8개)

| # | 파일 | F-item |
|---|------|:------:|
| 1 | `packages/api/src/services/planner-agent.ts` | F70 |
| 2 | `packages/api/src/schemas/plan.ts` | F70 |
| 3 | `packages/api/src/__tests__/planner-agent.test.ts` | F70 |
| 4 | `packages/api/src/services/agent-inbox.ts` | F71 |
| 5 | `packages/api/src/routes/inbox.ts` | F71 |
| 6 | `packages/api/src/schemas/inbox.ts` | F71 |
| 7 | `packages/api/src/__tests__/agent-inbox.test.ts` | F71 |
| 8 | `packages/web/src/components/feature/AgentInboxPanel.tsx` | F71 |

### 8.2 수정 파일 (10개)

| # | 파일 | F-item |
|---|------|:------:|
| 1 | `packages/shared/src/agent.ts` | F70+F71+F72 |
| 2 | `packages/api/src/services/agent-orchestrator.ts` | F70+F72 |
| 3 | `packages/api/src/routes/agent.ts` | F70+F72 |
| 4 | `packages/api/src/schemas/agent.ts` | F70 |
| 5 | `packages/api/src/services/worktree-manager.ts` | F72 (WIP 확장) |
| 6 | `packages/api/src/__tests__/worktree-manager.test.ts` | F72 (WIP 확장) |
| 7 | `packages/api/src/services/sse-manager.ts` | F70+F71 |
| 8 | `packages/api/src/index.ts` | F71 |
| 9 | `packages/web/src/app/(app)/agents/page.tsx` | F70+F71 |
| 10 | `packages/web/src/lib/api-client.ts` | F70+F71 |

### 8.3 WIP 파일 (활용)

| # | 파일 | F-item |
|---|------|:------:|
| 1 | `packages/web/src/components/feature/AgentPlanCard.tsx` | F70 (그대로 활용) |

---

## 9. 테스트 계획 종합

| F-item | 신규 테스트 | 파일 |
|:------:|:-----------:|------|
| F70 | ~12건 | planner-agent.test.ts, agent-orchestrator.test.ts, agent.test.ts |
| F71 | ~10건 | agent-inbox.test.ts, inbox.test.ts |
| F72 | ~8건 (기존 6 + 추가) | worktree-manager.test.ts, agent-orchestrator.test.ts |
| **합계** | **~30건** | 429 → ~459 tests |

---

## 10. 리스크

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | PlannerAgent LLM 호출 비용 증가 (계획 수립 시 추가 토큰) | 중 | 중 | `estimatedTokens` 상한 설정 + MockRunner 테스트 |
| R2 | git worktree CLI가 Workers 환경에서 실행 불가 | 높 | 중 | Workers에서는 in-memory 모드, 로컬/self-hosted에서만 실제 worktree |
| R3 | inbox 메시지 폭주 시 D1 쿼리 성능 | 낮 | 낮 | acknowledged 인덱스 + TTL 정리 배치 |

---

## 11. 성공 기준

| 항목 | 기준 |
|------|------|
| PDCA Match Rate | ≥ 90% |
| 전체 테스트 | 429 + ~30 = ~459건 통과 |
| typecheck + build + lint | 0 errors |
| API endpoints | 50 + 7 = 57개 |
| D1 migration 0009 | 로컬 적용 + remote 적용 |
| SSE 이벤트 | agent.plan.*, agent.message.received 정상 동작 |
