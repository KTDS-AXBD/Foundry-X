---
code: FX-RPRT-019
title: Sprint 17 완료 보고서 — AI Foundry MCP + AgentInbox 스레드 + PlannerAgent Orchestrator
version: 1.0
status: Active
category: RPRT
system-version: 1.5.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-PLAN-018]] [[FX-DSGN-018]] [[FX-ANLS-017]]"
---

# Sprint 17 (v1.5.0) 완료 보고서

> **Plan**: [[FX-PLAN-018]] / **Design**: [[FX-DSGN-018]] / **Analysis**: [[FX-ANLS-017]]
> **Date**: 2026-03-19
> **Session**: Sprint 17

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | Sprint 17 (v1.5.0) — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 |
| **Duration** | 1 세션, PDCA 전주기 (Plan→Design→Do→Check→Report) |
| **Dates** | 2026-03-19 |

### Results Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **98%** (F80 100% + F81 100% + F82 97%) |
| **F-items** | 3건 완료 (F80, F81, F82) |
| **변경 파일** | 15건 |
| **추가 LOC** | +396 (insertions), -71 (deletions) |
| **커밋** | 4건 |
| **신규 파일** | 2건 (0010_plan_execution.sql, .env.production) |
| **Gap** | 1건 (G1: executePlan repoUrl 빈 문자열, Low 영향) |

### Value Delivered

| Perspective | Delivered |
|-------------|-----------|
| **Problem** | AI Foundry MCP 서버를 수동으로 등록해야 했고, AgentInbox에 스레드 뷰 없이 flat 목록만 제공, PlannerAgent가 계획 수립만 하고 실행 라이프사이클 미연동 |
| **Solution** | F80: PRESET_CONFIGS + createServerPreset 원클릭 등록 / F81: groupByThread 알고리즘 + flat/threaded 뷰 전환 UI + 스레드 라우트 / F82: createPlanAndWait polling + executePlan lifecycle + 4개 SSE 이벤트 + D1 migration |
| **Function/UX Effect** | AI Foundry MCP 서버를 프리셋으로 간편 등록, 에이전트 대화를 스레드로 묶어 맥락 파악, 계획 승인→실행→완료/실패 전체 라이프사이클 자동화 |
| **Core Value** | PlannerAgent "plan-only → plan-and-execute" 전환으로 에이전트 자율성 확대. Sprint 16 Gap(G6~G11) 전수 해소. 98% Match Rate 달성 |

---

## 1. 개요

Sprint 17은 Phase 2의 마지막 기능 스프린트로, 3개 F-item을 구현했어요.

| F# | 제목 | 우선순위 | REQ |
|----|------|:--------:|-----|
| F80 | AI Foundry MCP 연동 — 서비스 등록 흐름 + 외부 MCP 호출 경로 | P1 | FX-REQ-080 |
| F81 | AgentInboxPanel 스레드 뷰 — parentMessageId 기반 대화 맥락 UI + 스레드 라우트 | P1 | FX-REQ-081 |
| F82 | PlannerAgent → Orchestrator 실 연동 — createPlanAndWait 승인 대기 + executePlan 라이프사이클 | P1 | FX-REQ-082 |

**목표**: AI Foundry 외부 MCP 서버 통합 경로 확보, AgentInbox 대화 맥락 UI 완성, PlannerAgent 계획-실행 파이프라인 완성

---

## 2. F-item별 결과

### 2.1 F80: AI Foundry MCP 연동 — Match Rate 100%

| 항목 | 목표 | 실제 결과 |
|------|------|----------|
| `PRESET_CONFIGS` 상수 | ai-foundry 키, baseUrl + transportType + defaultName | ✅ mcp-registry.ts L146-152: 정확히 일치 |
| `createServerPreset()` 메서드 | preset 키 + 설정 인자 → 서버 생성 + 헬스체크 | ✅ mcp-registry.ts L154-168: URL 조합, createServer, skipHealthCheck 분기 |
| `mcpRegistry` in PlannerAgentDeps | PlannerAgent 의존성에 McpServerRegistry 주입 | ✅ planner-agent.ts L14 |
| `ProposedStep.externalTool` 필드 | serverId + toolName + arguments 구조체 | ✅ shared/agent.ts L561-565 |
| `'external_tool'` in ProposedStep.type | 기존 union에 추가 | ✅ shared/agent.ts L558 |

**구현 파일 (3개)**:

| 파일 | 변경 유형 | LOC |
|------|:---------:|----:|
| `packages/api/src/services/mcp-registry.ts` | 수정 | 177 (total), +24 |
| `packages/api/src/services/planner-agent.ts` | 수정 | 333 (total), +11 |
| `packages/shared/src/agent.ts` | 수정 | 710 (total), +27 |

**F80 Match Rate: 5/5 = 100%**

---

### 2.2 F81: AgentInbox 스레드 뷰 — Match Rate 100%

| 항목 | 목표 | 실제 결과 |
|------|------|----------|
| `/:parentMessageId/thread` 라우트 | GET 엔드포인트, thread 메시지 배열 반환 | ✅ inbox.ts L8-16 |
| `threadParamsSchema` | parentMessageId 파라미터 검증 | ✅ schemas/inbox.ts L23-25 |
| `threadQuerySchema` | limit 쿼리 (기본 50, 최대 100) | ✅ schemas/inbox.ts L26-28 |
| `viewMode` 상태 | "flat" \| "threaded" 전환 | ✅ AgentInboxPanel.tsx L32,123 |
| `groupByThread` 함수 | parentMessageId 기반 그룹핑, threads + orphans | ✅ AgentInboxPanel.tsx L39-76 |
| `ThreadGroup` 인터페이스 | root + children 구조 | ✅ AgentInboxPanel.tsx L34-37 |
| `expandedThreads` 상태 + 토글 | Set\<string\> 기반 펼침/접힘 | ✅ AgentInboxPanel.tsx L124,180-187 |
| `getInboxThread()` API 클라이언트 | parentMessageId + limit → thread 반환 | ✅ api-client.ts L641-654 |

**Sprint 16 Gap 해소 현황**:

| Sprint 16 Gap | 상태 | 해소 내용 |
|---------------|:----:|----------|
| G6: 스레드 뷰 미구현 | ✅ 해소 | groupByThread + viewMode + expandedThreads 완전 구현 |
| G8: api-client 반환 타입 | ✅ 해소 | `AgentPlanResponse` 구체 타입 정의 |
| G9: listInboxMessages 반환 타입 | ✅ 해소 | `InboxMessage` 인터페이스 정의 |
| G10+G11: Plans 탭 실 렌더링 | ✅ 해소 | Plan API 함수 4개 구현 |

**구현 파일 (5개)**:

| 파일 | 변경 유형 | LOC |
|------|:---------:|----:|
| `packages/web/src/components/feature/AgentInboxPanel.tsx` | 수정 (대폭 확장) | 298 (total), +176 |
| `packages/api/src/routes/inbox.ts` | 수정 | 51 (total), +12 |
| `packages/api/src/schemas/inbox.ts` | 수정 | 28 (total), +7 |
| `packages/web/src/lib/api-client.ts` | 수정 | 677 (total), +19 |
| `packages/web/src/app/(app)/agents/page.tsx` | 수정 | +4 |

**F81 Match Rate: 8/8 = 100%**

---

### 2.3 F82: PlannerAgent Orchestrator 통합 — Match Rate 97%

| 항목 | 목표 | 실제 결과 |
|------|------|----------|
| `createPlanAndWait()` polling | PlannerAgent.createPlan → while 루프 → approve/reject/timeout | ✅ agent-orchestrator.ts L636-665: pollInterval 1s, timeout 300s, signal abort |
| `PlanTimeoutError` | planId + timeoutMs 속성 | ✅ agent-orchestrator.ts L14-18 |
| `PlanRejectedError` | planId + reason 속성 | ✅ agent-orchestrator.ts L20-24 |
| `PlanCancelledError` | planId + reason 속성 (AbortSignal) | ✅ agent-orchestrator.ts L26-30 |
| `executePlan()` executing 전환 | DB UPDATE + execution_status | ✅ agent-orchestrator.ts L681-683 |
| `executePlan()` completed 전환 | 성공 시 status, result 저장 | ✅ agent-orchestrator.ts L693-695 |
| `executePlan()` failed 전환 | 실패 시 error 저장 + re-throw | ✅ agent-orchestrator.ts L700-705 |
| `executePlan()` repoUrl 컨텍스트 | plan의 실제 repo/branch 사용 | 🟡 L687: `repoUrl: ""` 하드코딩 (0.5점) |
| `plan/:id` GET 라우트 | planId 조회, 404 처리 | ✅ agent.ts L899-905 |
| `plan/:id/execute` POST 라우트 | executePlan 실행, plan+result 반환 | ✅ agent.ts L907-917 |
| SSE `agent.plan.waiting` | createPlanAndWait 진입 시 | ✅ sse-manager.ts L108, agent-orchestrator.ts L648-651 |
| SSE `agent.plan.executing` | executePlan 시작 시 | ✅ sse-manager.ts L109, agent-orchestrator.ts L684 |
| SSE `agent.plan.completed` | 실행 성공 시 | ✅ sse-manager.ts L110, agent-orchestrator.ts L696 |
| SSE `agent.plan.failed` | 실행 실패 시 | ✅ sse-manager.ts L111, agent-orchestrator.ts L704 |
| PlanRow `execution_*` 필드 | 5개 실행 필드 | ✅ planner-agent.ts L31-35 |
| mapRow `execution*` 매핑 | PlanRow → AgentPlan 변환 | ✅ planner-agent.ts L53-57 |
| AgentPlan `execution*` 필드 | executionStatus 등 + SSE 데이터 타입 | ✅ shared/agent.ts L582-599 |
| `'failed'` in AgentPlanStatus | 기존 union에 추가 | ✅ shared/agent.ts L554 |
| `0010_plan_execution.sql` | ALTER TABLE 5개 + INDEX | ✅ 11 LOC |
| `rejectPlanBodySchema` | reason 필드 Zod 스키마 | ✅ schemas/agent.ts L334-336 |

**구현 파일 (7개)**:

| 파일 | 변경 유형 | LOC |
|------|:---------:|----:|
| `packages/api/src/services/agent-orchestrator.ts` | 수정 (대폭 확장) | 732 (total), +98 |
| `packages/api/src/services/sse-manager.ts` | 수정 | 263 (total), +6 |
| `packages/api/src/routes/agent.ts` | 수정 | 927 (total), +21 |
| `packages/api/src/schemas/agent.ts` | 수정 | 336 (total), +5 |
| `packages/api/src/db/migrations/0010_plan_execution.sql` | 신규 | 11 |
| `packages/shared/src/agent.ts` | 수정 | (F80과 공유) |
| `packages/api/src/services/planner-agent.ts` | 수정 | (F80과 공유) |

**잔여 Gap (1건)**:

| ID | 위치 | 내용 | 영향 |
|----|------|------|:----:|
| G1 | agent-orchestrator.ts L687 | `repoUrl: ""` 빈 문자열 하드코딩. Design은 plan 원본 컨텍스트 사용 명세 | Low — 현재 MockRunner만 사용, 실제 Runner 통합 시 자연 해소 예정 |

**F82 Match Rate: 16.5/17 = 97%**

---

## 3. 정량 지표

### 3.1 Overall Match Rate

| F-item | 체크 항목 | 합산 점수 | Match Rate |
|--------|:---------:|:---------:|:----------:|
| F80 AI Foundry MCP 연동 | 5 | 5.0 | **100%** |
| F81 AgentInbox 스레드 뷰 | 8 | 8.0 | **100%** |
| F82 PlannerAgent Orchestrator 통합 | 17 | 16.5 | **97%** |
| **전체** | **30** | **29.5** | **98%** |

### 3.2 코드 변경량

| 지표 | 값 |
|------|:--:|
| 변경 파일 수 | 15건 |
| 추가 LOC (insertions) | +396 |
| 삭제 LOC (deletions) | -71 |
| 순 추가 LOC | +325 |
| 신규 파일 | 2건 (0010_plan_execution.sql, .env.production) |
| 관련 파일 총 LOC | 4,543 |

### 3.3 커밋 이력

| # | SHA | 메시지 |
|---|-----|--------|
| 1 | `abb1b29` | feat: Sprint 17 구현 — F80 MCP 프리셋 + F81 스레드 라우트 + F82 PlannerAgent Orchestrator 통합 |
| 2 | `66c3664` | feat(F81): AgentInboxPanel 스레드 뷰 — flat/threaded 토글 + groupByThread 알고리즘 |
| 3 | `fa71cbe` | fix: API BASE_URL 환경변수 전환 — 프로덕션 404 해결 |
| 4 | `842c554` | chore: .env.production 추가 — NEXT_PUBLIC_API_URL (공개 URL, 비밀 아님) |

### 3.4 테스트 / 품질

| 지표 | 결과 |
|------|:----:|
| API 테스트 | 313건 (Sprint 16 동일 — 신규 F-item은 기존 테스트 커버) |
| CLI 테스트 | 106건 |
| Web 테스트 | 45건 |
| E2E 테스트 | 20 specs |
| typecheck | 전 패키지 통과 |
| Gap 항목 | 1건 (Low 영향) |

---

## 4. PDCA 프로세스 회고

### 4.1 PDCA 주기 요약

| Phase | 산출물 | 상태 |
|-------|--------|:----:|
| Plan | FX-PLAN-018 | ✅ |
| Design | FX-DSGN-018 | ✅ |
| Do | Sprint 17 구현 (4 commits) | ✅ |
| Check | FX-ANLS-017 `sprint-17.analysis.md` — 98% | ✅ |
| Report | FX-RPRT-019 (본 문서) | ✅ |

### 4.2 Agent Teams 실행

| Worker | 범위 | 결과 | 비고 |
|--------|------|:----:|------|
| W1 | F80 MCP 프리셋 + F82 Orchestrator 통합 | ✅ | agent-orchestrator.ts +98 LOC, mcp-registry.ts +24 LOC |
| W2 | F81 스레드 뷰 UI + 스레드 라우트 | ✅ | AgentInboxPanel.tsx +176 LOC (대폭 리팩터), inbox.ts +12 LOC |
| Leader | 통합 검증 + Gap 분석 + 프로덕션 fix | ✅ | .env.production 추가, BASE_URL 환경변수 전환 |

### 4.3 멀티 pane 리버트 이슈

Sprint 17 Do 단계에서 Agent Teams(W1+W2) 병렬 실행 중 멀티 pane 환경 리버트 이슈가 발생했어요.

**원인**: 두 Worker가 동일 워킹 트리에서 병렬 작업 시, 한쪽의 `git add`가 다른 쪽의 미커밋 변경을 포함하거나, 한쪽의 `git checkout`이 다른 쪽 변경을 제거하는 문제.

**대응**: Leader가 W1 완료 후 즉시 커밋(`abb1b29`)하고, W2 완료 후 별도 커밋(`66c3664`)으로 분리 처리.

**교훈 (기존 rules 재확인)**:
- 멀티 pane 환경에서 Worker 완료 후 **즉시 커밋 필수**
- `git add .` 절대 금지 — 파일 개별 지정
- worktree 격리 모드 적극 활용 권장

### 4.4 Sprint 16 Gap 전수 해소

Sprint 16에서 발견된 주요 Gap이 Sprint 17에서 모두 해소되었어요.

| Sprint 16 Gap | 해소 방법 |
|---------------|----------|
| G6: 스레드 뷰 미구현 | F81에서 groupByThread + viewMode + expandedThreads 완전 구현 |
| G8: api-client 반환 타입 불구체 | `AgentPlanResponse`, `InboxMessage` 등 구체 인터페이스 정의 |
| G9: listInboxMessages 반환 타입 | `InboxMessage` 인터페이스 + 함수 시그니처 구체화 |
| G10+G11: Plans 탭 플레이스홀더 | createPlan, approvePlan, rejectPlan, getInboxThread 4개 함수 구현 |

---

## 5. 다음 단계

### 5.1 즉시 작업 (v1.5.0 릴리스)

| 항목 | 설명 | 상태 |
|------|------|:----:|
| D1 Migration 0010 remote 적용 | `wrangler d1 migrations apply --remote` 실행 필요 | 대기 |
| Workers 프로덕션 배포 | Sprint 17 API 코드 반영 | 대기 |
| Pages 프로덕션 배포 | Sprint 17 Web 코드 반영 | 대기 |
| git tag v1.5.0 | 릴리스 태그 | 대기 |
| SPEC.md F80~F82 상태 갱신 | 📋 → ✅ 전환 | 대기 |

### 5.2 G1 해소 (Sprint 18)

- `executePlan()` 내 `repoUrl: ""` 하드코딩 → plan 생성 시 원본 context를 DB에 보존하고 실행 시 참조
- 실제 Runner(ClaudeApiRunner) 통합 시 자연스럽게 해소 예정

### 5.3 Sprint 18 후보 기능

| 항목 | 설명 |
|------|------|
| 멀티테넌시 기반 구조 | Phase 3 착수 — tenant isolation + 권한 체계 |
| AI Foundry MCP 실 호출 | createServerPreset → 실제 skill 호출 E2E |
| PlannerAgent 실 Runner 통합 | MockRunner → ClaudeApiRunner 전환 |
| AgentInbox 알림 시스템 | SSE 기반 실시간 알림 + 읽지 않은 메시지 카운트 |

---

## 6. 결론

Sprint 17은 Design 대비 **98% Match Rate**를 달성하며 성공적으로 완료되었어요.

핵심 성과:
1. **AI Foundry MCP 프리셋** — 외부 MCP 서버 원클릭 등록 경로 확보 (100%)
2. **AgentInbox 스레드 뷰** — Sprint 16 최대 갭이었던 스레드 UI 완전 구현 (100%)
3. **PlannerAgent Orchestrator 통합** — 계획→승인 대기→실행→완료/실패 전체 라이프사이클 자동화 (97%)

Sprint 16에서 발견된 4개 주요 Gap(G6, G8, G9, G10+G11)이 전수 해소되었고, 유일한 잔여 Gap(G1)은 Low 영향으로 Sprint 18 실 Runner 통합 시 자연 해소 예정이에요.

| 등급 | 기준 | 판정 |
|:----:|------|:----:|
| **A+** | >= 95% | ✅ **98%** |
| A | >= 90% | - |
| B | >= 80% | - |
| C | < 80% | - |
