---
code: FX-PLAN-017
title: Sprint 16 (v1.4.0) — PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포
version: 0.1
status: Draft
category: PLAN
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 16 (v1.4.0) Planning Document

> **Summary**: PlannerAgent의 Mock 분석 로직을 Claude API 실 호출로 전환하여 코드베이스를 LLM이 실제 분석·계획하는 흐름을 완성하고, AgentInboxPanel UI 신규 구현 + AgentPlanCard shared import 정리로 대시보드 에이전트 협업 UI를 보강하며, D1 migration 0009 remote 적용 + Workers/Pages 재배포로 v1.3.0~v1.4.0 코드를 프로덕션에 반영한다.
>
> **Project**: Foundry-X
> **Version**: 1.4.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PlannerAgent가 Mock 로직으로 동작하여 실제 코드베이스 분석 없이 정적 문자열만 반환. AgentInbox 백엔드는 완성됐으나 대시보드 UI 부재. AgentPlanCard가 inline 타입 사용. 프로덕션에 Sprint 15(v1.3.0) 코드가 미반영 상태 |
| **Solution** | F75: PlannerAgent에 Claude API 실 호출 주입 — JSON schema 응답 파싱 + 폴백 / F76: AgentInboxPanel 신규 + AgentPlanCard shared import 전환 / F77: D1 migration 0009 remote + Workers/Pages 재배포 |
| **Function/UX Effect** | 에이전트가 실제 LLM 분석 기반 계획을 제시. 대시보드에서 에이전트 메시지 수신/확인 가능. 프로덕션 최신 코드 반영 |
| **Core Value** | "Mock → Real" 전환으로 PlannerAgent 실용성 확보 + 대시보드 에이전트 협업 UI 완성 + 프로덕션 동기화 |

---

## 1. Overview

### 1.1 Purpose

Sprint 16은 Sprint 15에서 구축한 PlannerAgent/AgentInbox/WorktreeManager의 **실용화**에 집중하는 스프린트예요:

- **F75 PlannerAgent LLM 실 연동 (P1)**: Mock 코드베이스 분석(planner-agent.ts:60-89)을 Claude API 실 호출로 전환. 에이전트가 실제로 파일 구조·의존성·리스크를 분석하여 계획을 수립
- **F76 AgentInboxPanel UI + AgentPlanCard 정리 (P1)**: AgentInbox 백엔드(agent-inbox.ts)에 대응하는 대시보드 UI 신규 구현 + AgentPlanCard inline 타입을 shared import로 전환
- **F77 프로덕션 배포 (P2)**: D1 migration 0009(agent_plans, agent_messages, agent_worktrees) remote 적용 + Workers/Pages 재배포

### 1.2 Background

**F75 배경 — PlannerAgent LLM 전환**:
- Sprint 15에서 PlannerAgent 서비스를 구현했으나, `createPlan()`의 코드베이스 분석은 Mock으로 동작
- Mock 로직: targetFiles를 나열하고 파일당 "modify" step 1개 생성 — 실제 분석 없음
- ClaudeApiRunner가 이미 Anthropic Messages API 호출 패턴을 가지고 있어 동일 패턴 재활용 가능
- `ANTHROPIC_API_KEY`가 Workers secrets에 이미 설정돼 있어 인프라 변경 불필요

**F76 배경 — AgentInboxPanel UI**:
- agent-inbox.ts 서비스 + inbox 라우트 3개 + D1 agent_messages 테이블 + SSE 이벤트 모두 Sprint 15에서 완성
- 그러나 대시보드에 inbox UI가 없어서 메시지를 확인할 수 없는 상태
- AgentPlanCard.tsx는 untracked 파일로 존재하지만 inline 타입 정의 사용 중 → shared에서 import 필요

**F77 배경 — 프로덕션 배포**:
- D1 migration 0009(Sprint 15)가 로컬만 적용, remote 미적용
- Sprint 13~15 코드가 프로덕션에 미반영 (v1.0.0 이후 배포 drift)
- Workers secrets는 이미 설정 완료 (JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY)

### 1.3 현재 상태 (Sprint 15 WIP 자산)

| 파일 | F-item | 상태 | Sprint 16 작업 |
|------|:------:|------|----------------|
| `packages/api/src/services/planner-agent.ts` | F70→F75 | Mock 동작 (208 LOC) | lines 60-89 LLM 호출로 교체 |
| `packages/api/src/services/claude-api-runner.ts` | F53 | 완성 (185 LOC) | 참조 패턴 (변경 없음) |
| `packages/api/src/services/agent-inbox.ts` | F71 | 완성 (124 LOC) | 변경 없음 |
| `packages/api/src/routes/inbox.ts` | F71 | 완성 (42 LOC) | 변경 없음 |
| `packages/web/src/components/feature/AgentPlanCard.tsx` | F70→F76 | UI 완성, untracked | inline 타입 → shared import |
| `packages/web/src/components/feature/AgentInboxPanel.tsx` | F76 | ❌ 미존재 | 신규 구현 |
| `packages/api/src/db/migrations/0009_planner_inbox_worktree.sql` | F70-72 | 로컬 적용 | remote 적용 (F77) |

### 1.4 현재 한계

| # | 한계 | 영향 |
|---|------|------|
| L1 | PlannerAgent Mock 분석 — 실제 코드 이해 없음 | 계획 품질 낮음, 사람이 계획을 신뢰하기 어려움 |
| L2 | AgentInbox UI 부재 | 에이전트 메시지를 대시보드에서 확인 불가 |
| L3 | AgentPlanCard inline 타입 | shared와 타입 불일치 리스크, 중복 관리 |
| L4 | 프로덕션 코드 drift | v1.0.0 이후 Sprint 13~15 기능 미반영 |

---

## 2. F-items

### F75: PlannerAgent LLM 실 연동 — Mock→Claude API 전환 (P1)

**목표**: `createPlan()`에서 Claude API를 호출하여 코드베이스를 실제 분석하고, 구조화된 JSON(codebaseAnalysis, proposedSteps, risks, estimatedTokens)을 응답받아 AgentPlan으로 변환

**구현 범위**:

1. **PlannerAgent에 LLM 호출 추가** (`planner-agent.ts`)
   - PlannerAgentDeps에 `apiKey: string`, `model?: string` 필드 추가
   - `createPlan()` 내 Mock 로직(lines 60-89)을 `analyzeCo debase()` private 메서드로 교체
   - `analyzeCodebase()`: Claude API 직접 호출 (ClaudeApiRunner 패턴 활용, 별도 인스턴스 불필요)
   - System prompt: PlannerAgent 전용 — "코드베이스 분석 + 실행 계획 수립" 지시
   - Response JSON schema: `{ codebaseAnalysis: string, proposedSteps: ProposedStep[], risks: string[], estimatedTokens: number }`
   - 파싱 실패 시 폴백: 기존 Mock 로직으로 degradation

2. **PlannerAgent 전용 시스템 프롬프트** 설계
   - Input: repoUrl, branch, targetFiles, instructions, taskType
   - Output 지시: JSON으로 구조화된 분석 + 단계별 계획 + 리스크 + 토큰 예측
   - 제약: max_tokens 4096, model `claude-haiku-4-5-20250714` (비용 효율)

3. **Orchestrator 통합 강화**
   - `AgentOrchestrator.createPlanAndWait()`에서 LLM 실 분석 결과를 인간에게 제시
   - approved → `executePlan()` 흐름 유지 (변경 없음)

4. **테스트**
   - `planner-agent.test.ts` 확장: Claude API mock + JSON 파싱 성공/실패 케이스
   - 폴백 로직 테스트: API 에러 시 Mock degradation 검증

**수정 파일**: `planner-agent.ts`, `planner-agent.test.ts`
**예상 LOC**: ~60 추가/수정
**예상 테스트**: +6건

---

### F76: AgentInboxPanel UI + AgentPlanCard shared import 정리 (P1)

**목표**: 대시보드에서 에이전트 메시지를 확인·응답할 수 있는 AgentInboxPanel 컴포넌트를 신규 구현하고, AgentPlanCard의 inline 타입을 shared import로 전환

**구현 범위**:

1. **AgentInboxPanel.tsx 신규 구현** (`packages/web/src/components/feature/`)
   - 에이전트별 inbox 메시지 목록 표시 (GET /agents/inbox/:agentId)
   - 메시지 타입별 렌더링: task_assign(작업 지시), task_result(결과), task_question(질문), task_feedback(피드백), status_update(상태)
   - 읽음/미읽음 구분 (unreadOnly 필터)
   - 메시지 확인(acknowledge) 버튼 (POST /agents/inbox/:id/ack)
   - 스레드 뷰 (parentMessageId 기반 대화 맥락)
   - SSE agent.message.received 이벤트 수신 → 실시간 메시지 추가

2. **AgentPlanCard.tsx shared import 전환**
   - inline `AgentPlan`, `ProposedStep`, `AgentPlanStatus` 타입 삭제
   - `import { AgentPlan, ProposedStep, AgentPlanStatus } from '@foundry-x/shared'` 사용
   - 기능 변경 없음, 타입 정합성만 확보

3. **agents/page.tsx 통합**
   - activeTab에 `inbox` 탭 추가 (agents | prs | queue | parallel | inbox)
   - AgentInboxPanel import + 렌더링
   - AgentPlanCard import (현재 미사용 → plans 탭 또는 plan 생성 시 표시)

4. **api-client.ts 확장**
   - `sendMessage(fromAgentId, toAgentId, type, subject, payload)`
   - `listInboxMessages(agentId, unreadOnly?, limit?)`
   - `acknowledgeMessage(messageId)`
   - `createPlan(agentId, taskType, context)`
   - `approvePlan(planId)` / `rejectPlan(planId, reason)`

5. **테스트**
   - `AgentInboxPanel` 렌더링 테스트 (vitest + React Testing Library)
   - `AgentPlanCard` shared import 정상 동작 테스트

**신규 파일**: `AgentInboxPanel.tsx`
**수정 파일**: `AgentPlanCard.tsx`, `agents/page.tsx`, `api-client.ts`
**예상 LOC**: ~200 신규 + ~40 수정
**예상 테스트**: +4건

---

### F77: v1.4.0 프로덕션 배포 + D1 migration 0009 remote (P2)

**목표**: Sprint 15~16 코드를 프로덕션에 반영 — D1 migration 0009(agent_plans, agent_messages, agent_worktrees) remote 적용 + Workers/Pages 재배포

**구현 범위**:

1. **D1 migration remote 적용**
   - `wrangler d1 migrations list --remote`로 현재 상태 확인
   - `wrangler d1 migrations apply foundry-x-db --remote`로 0009 적용
   - 적용 결과 검증: `SELECT name FROM sqlite_master WHERE type='table'`

2. **Workers 재배포**
   - `wrangler deploy`로 최신 API 코드 배포
   - health check: `curl https://foundry-x-api.ktds-axbd.workers.dev/health`
   - smoke test: auth, plan, inbox endpoint 확인

3. **Pages 재배포**
   - `wrangler pages deploy` 또는 GitHub Actions 트리거
   - `https://fx.minu.best` 대시보드 접근 확인

4. **버전 + 릴리스**
   - package.json version bump → 1.4.0
   - CHANGELOG.md v1.4.0 항목 추가
   - SPEC.md system-version 갱신
   - git tag v1.4.0

**수정 파일**: `package.json` (루트 + packages), `CHANGELOG.md`, `SPEC.md`
**예상 LOC**: ~20 수정 (버전 관련)

---

## 3. 의존성

```
F75 (PlannerAgent LLM) ─┐
                         ├──→ F77 (프로덕션 배포)
F76 (InboxPanel UI)   ───┘
```

- F75와 F76은 독립적으로 병렬 진행 가능
- F77은 F75+F76 완료 후 마지막에 실행

---

## 4. 구현 순서

| 순서 | 항목 | 선행 조건 |
|:----:|------|-----------|
| 1 | F75 PlannerAgent LLM 전환 | 없음 |
| 2 | F76 AgentPlanCard shared import 정리 | 없음 (F75과 병렬 가능) |
| 3 | F76 AgentInboxPanel 신규 구현 | 없음 |
| 4 | F76 agents/page.tsx + api-client.ts 통합 | F76-2, F76-3 완료 |
| 5 | 전체 typecheck + test | F75, F76 완료 |
| 6 | F77 D1 migration + 배포 | 전체 테스트 통과 |
| 7 | F77 버전 범프 + 릴리스 | 배포 검증 |

---

## 5. 리스크

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | Claude API 응답이 JSON schema와 불일치 | 중 | 중 | 폴백 로직으로 Mock degradation + 프롬프트 반복 개선 |
| R2 | PlannerAgent API 비용 증가 | 저 | 저 | Haiku 모델 사용 (비용 효율), max_tokens 4096 제한 |
| R3 | D1 migration 0009 remote 충돌 | 저 | 고 | migrations list로 사전 확인 + 롤백 SQL 준비 |
| R4 | AgentInboxPanel SSE 연동 복잡도 | 저 | 중 | 기존 SSEClient 패턴 재활용 (agents/page.tsx 참조) |

---

## 6. 성공 기준

| 항목 | 기준 |
|------|------|
| F75 PlannerAgent LLM | `createPlan()` 호출 시 Claude API 실 응답 기반 AgentPlan 생성, JSON 파싱 성공률 > 90% |
| F76 AgentInboxPanel | 메시지 목록 표시 + 읽음 처리 + 실시간 SSE 수신 동작 |
| F76 AgentPlanCard | shared import 전환, inline 타입 0건 |
| F77 프로덕션 배포 | health check 200 + D1 3테이블 존재 확인 + 대시보드 접근 정상 |
| 전체 | typecheck ✅, tests 통과, PDCA Match Rate ≥ 90% |
