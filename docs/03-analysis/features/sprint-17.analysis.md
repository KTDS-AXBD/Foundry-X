---
code: FX-ANLS-017
title: Sprint 17 Gap Analysis
version: 1.0
status: Active
category: ANLS
system-version: 1.5.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-DSGN-018]]"
---

# Sprint 17 Gap Analysis

> **Date**: 2026-03-19
> **Methodology**: Leader 직접 분석 — Design 명세 vs 구현 코드 1:1 대조 (re-run after gap fix)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Overall Match Rate** | **97%** (F80 100% + F81 100% + F82 93% 가중 평균) |
| **총 체크 항목** | 30건 (F80: 5, F81: 8, F82: 17) |
| **✅ 구현** | 29건 (96.7%) |
| **🟡 부분 구현** | 1건 (3.3%) — executePlan에서 repoUrl 하드코딩 |
| **❌ 미구현** | 0건 |
| **이전 분석 대비** | Sprint 16 Gap(G6~G11) 전수 해소 |

---

## 1. F80 AI Foundry MCP 연동 — Match Rate 100%

### 검증 항목

| # | 항목 | Design 명세 | 구현 상태 | 점수 |
|---|------|------------|:---------:|:----:|
| 1 | `PRESET_CONFIGS` 상수 | `ai-foundry` 키, baseUrl + transportType + defaultName | ✅ mcp-registry.ts L146-152: `"ai-foundry"` 키, baseUrl, `"http"` transport, defaultName 함수 완전 일치 | 1.0 |
| 2 | `createServerPreset()` 메서드 | preset 키 + skillId/apiKey/name/skipHealthCheck 인자 → 서버 생성 + 헬스체크 | ✅ mcp-registry.ts L154-168: URL 조합, createServer 호출, skipHealthCheck 분기, 에러 시 updateStatus("error") | 1.0 |
| 3 | `mcpRegistry` in PlannerAgentDeps | PlannerAgent 의존성에 McpServerRegistry 주입 | ✅ planner-agent.ts L14: `mcpRegistry?: import("./mcp-registry.js").McpServerRegistry` | 1.0 |
| 4 | `ProposedStep.externalTool` 필드 | serverId + toolName + arguments 구조체 | ✅ shared/agent.ts L561-565: `externalTool?: { serverId, toolName, arguments? }` | 1.0 |
| 5 | `'external_tool'` in ProposedStep.type | 기존 create/modify/delete/test에 추가 | ✅ shared/agent.ts L558: `'external_tool'` union 멤버 포함 | 1.0 |

**F80 Match Rate: 5/5 = 100%**

> 모든 항목이 완전히 구현됨. PRESET_CONFIGS의 baseUrl 주소, transport 타입, 프리셋 생성 로직이 Design과 정확히 일치해요.

---

## 2. F81 AgentInbox 스레드 뷰 — Match Rate 100%

### 검증 항목

| # | 항목 | Design 명세 | 구현 상태 | 점수 |
|---|------|------------|:---------:|:----:|
| 6 | `/:parentMessageId/thread` 라우트 | GET 엔드포인트, thread 메시지 배열 반환 | ✅ inbox.ts L8-16: `GET /:parentMessageId/thread`, AgentInbox.getThread() 호출, 404 처리, limit 적용 | 1.0 |
| 7 | `threadParamsSchema` | parentMessageId 파라미터 검증 | ✅ schemas/inbox.ts L23-25: `z.object({ parentMessageId: z.string().min(1) })` | 1.0 |
| 8 | `threadQuerySchema` | limit 쿼리 파라미터 (기본 50, 최대 100) | ✅ schemas/inbox.ts L26-28: `z.coerce.number().int().min(1).max(100).optional().default(50)` | 1.0 |
| 9 | `viewMode` 상태 | "flat" \| "threaded" 전환 | ✅ AgentInboxPanel.tsx L32,123: `type ViewMode = "flat" \| "threaded"`, useState 사용 | 1.0 |
| 10 | `groupByThread` 함수 | parentMessageId 기반 그룹핑, threads + orphans 분리 | ✅ AgentInboxPanel.tsx L39-76: byId Map, childrenMap, roots/orphans 분리, 시간순 정렬 | 1.0 |
| 11 | `ThreadGroup` 인터페이스 | root + children 구조 | ✅ AgentInboxPanel.tsx L34-37: `{ root: AgentMessage; children: AgentMessage[] }` | 1.0 |
| 12 | `expandedThreads` 상태 + 토글 | Set<string> 기반 펼침/접힘 | ✅ AgentInboxPanel.tsx L124,180-187: `useState<Set<string>>`, handleToggleThread 함수 | 1.0 |
| 13 | `getInboxThread()` API 클라이언트 | parentMessageId + limit → thread 배열 반환 | ✅ api-client.ts L641-654: fetch GET 호출, 인증 헤더, limit 쿼리파라미터 | 1.0 |

**F81 Match Rate: 8/8 = 100%**

> Sprint 16 G6(스레드 뷰 미구현) 갭이 완전히 해소됨. 목록/스레드 뷰 전환 UI, 답장 개수 배지, 펼침/접힘 토글, orphan 메시지 처리까지 모두 구현.

### Sprint 16 대비 해소된 Gap

| Sprint 16 Gap | 상태 | 해소 내용 |
|---------------|:----:|----------|
| G6: 스레드 뷰 미구현 | ✅ 해소 | groupByThread + viewMode + expandedThreads 완전 구현 |
| G8: api-client 반환 타입 | ✅ 해소 | `AgentPlanResponse` 구체 타입 정의 (api-client.ts L508-520) |
| G9: listInboxMessages 반환 타입 | ✅ 해소 | `InboxMessage` 인터페이스 정의 (api-client.ts L582-593) |
| G10+G11: Plans 탭 실 렌더링 | ✅ 해소 | Plan API 함수 4개 구현 (createPlan, approvePlan, rejectPlan + getInboxThread) |

---

## 3. F82 PlannerAgent Orchestrator 통합 — Match Rate 93%

### 검증 항목

| # | 항목 | Design 명세 | 구현 상태 | 점수 |
|---|------|------------|:---------:|:----:|
| 14 | `createPlanAndWait()` polling | PlannerAgent.createPlan → while 루프 polling → approve/reject/timeout | ✅ agent-orchestrator.ts L636-665: pollInterval 1s, timeout 300s, signal abort 지원 | 1.0 |
| 15 | `PlanTimeoutError` | planId + timeoutMs 속성 | ✅ agent-orchestrator.ts L14-18: `extends Error`, planId/timeoutMs readonly | 1.0 |
| 16 | `PlanRejectedError` | planId + reason 속성 | ✅ agent-orchestrator.ts L20-24: `extends Error`, planId/reason readonly | 1.0 |
| 17 | `PlanCancelledError` | planId + reason 속성 (AbortSignal 연동) | ✅ agent-orchestrator.ts L26-30: `extends Error`, signal.aborted 체크 L654 | 1.0 |
| 18 | `executePlan()` executing 상태 전환 | DB UPDATE status='executing', execution_status='executing' | ✅ agent-orchestrator.ts L681-683: 정확히 일치 | 1.0 |
| 19 | `executePlan()` completed 전환 | 성공 시 status='completed', execution_result 저장 | ✅ agent-orchestrator.ts L693-695: JSON.stringify(result), completedAt 기록 | 1.0 |
| 20 | `executePlan()` failed 전환 | 실패 시 status='failed', execution_error 저장, 재throw | ✅ agent-orchestrator.ts L700-705: errorMsg 추출, DB 기록, throw err | 1.0 |
| 21 | `executePlan()` repoUrl 컨텍스트 | plan의 실제 repo/branch 사용 | 🟡 agent-orchestrator.ts L687: `repoUrl: ""` 빈 문자열 하드코딩 | 0.5 |
| 22 | `plan/:id` GET 라우트 | planId로 조회, 404 처리 | ✅ agent.ts L899-905: `GET /plan/:id`, getPlan() 호출, 404 분기 | 1.0 |
| 23 | `plan/:id/execute` POST 라우트 | planId → executePlan 실행, plan+result 반환 | ✅ agent.ts L907-917: PlannerAgent+Orchestrator 생성, MockRunner 사용, JSON 반환 | 1.0 |
| 24 | SSE `agent.plan.waiting` 이벤트 | createPlanAndWait 진입 시 발행 | ✅ sse-manager.ts L108: SSEEvent union 포함, agent-orchestrator.ts L648-651: pushEvent 호출 | 1.0 |
| 25 | SSE `agent.plan.executing` 이벤트 | executePlan 시작 시 발행 | ✅ sse-manager.ts L109, agent-orchestrator.ts L684 | 1.0 |
| 26 | SSE `agent.plan.completed` 이벤트 | 실행 성공 시 발행 | ✅ sse-manager.ts L110, agent-orchestrator.ts L696 | 1.0 |
| 27 | SSE `agent.plan.failed` 이벤트 | 실행 실패 시 발행 | ✅ sse-manager.ts L111, agent-orchestrator.ts L704 | 1.0 |
| 28 | PlanRow `execution_*` 필드 | execution_status, execution_started_at, execution_completed_at, execution_result, execution_error | ✅ planner-agent.ts L31-35: 5개 필드 모두 존재 | 1.0 |
| 29 | mapRow `execution*` 매핑 | PlanRow → AgentPlan 변환 시 execution 필드 포함 | ✅ planner-agent.ts L53-57: 5개 필드 모두 매핑, JSON.parse 포함 | 1.0 |
| 30 | AgentPlan `execution*` 필드 | executionStatus, executionStartedAt 등 | ✅ shared/agent.ts L582-587: 모든 필드 + PlanWaitingData/PlanExecutingData 등 L590-599 | 1.0 |
| 31 | `'failed'` in AgentPlanStatus | 기존 union에 'failed' 추가 | ✅ shared/agent.ts L554: `| 'failed'` 포함 | 1.0 |
| 32 | 0010_plan_execution.sql | ALTER TABLE 5개 + INDEX | ✅ 0010_plan_execution.sql: 5개 ALTER TABLE + idx_agent_plans_execution_status 인덱스 | 1.0 |
| 33 | `rejectPlanBodySchema` | reason 필드 Zod 스키마 | ✅ schemas/agent.ts L334-336: `z.object({ reason: z.string().max(1000).optional() })` | 1.0 |

**F82 Match Rate: 16.5/17 = 97%**

---

## 4. Gap 상세

### G1: executePlan repoUrl 빈 문자열 (🟡 Low)

- **위치**: `packages/api/src/services/agent-orchestrator.ts` L687
- **Design**: plan에 연결된 원본 컨텍스트의 repoUrl/branch를 사용
- **구현**: `repoUrl: ""` 하드코딩, `branch: "master"` 고정
- **영향**: Low — 현재 MockRunner만 사용하므로 실제 동작에 영향 없음. 실제 Runner 연동 시 수정 필요
- **수정 방안**: PlanRow에 original_context 컬럼 추가 또는 plan 생성 시 context 보존

---

## 5. Overall Match Rate 계산

| F-item | 체크 항목 | 합산 점수 | Match Rate |
|--------|:---------:|:---------:|:----------:|
| F80 AI Foundry MCP 연동 | 5 | 5.0 | **100%** |
| F81 AgentInbox 스레드 뷰 | 8 | 8.0 | **100%** |
| F82 PlannerAgent Orchestrator 통합 | 17 | 16.5 | **97%** |
| **전체** | **30** | **29.5** | **98%** |

---

## 6. 결론

Sprint 17 구현은 Design 명세 대비 **98% Match Rate**를 달성했어요. Sprint 16에서 발견된 주요 갭(스레드 뷰 미구현, Plans 탭 플레이스홀더, API 타입 불구체)이 모두 해소되었고, 신규 F82 Orchestrator 통합도 polling/lifecycle/SSE/migration 전 항목이 구현되어 있어요.

유일한 갭(G1)은 executePlan의 repoUrl 빈 문자열 하드코딩으로, 현재 MockRunner 환경에서는 영향이 없으며 Sprint 18에서 실제 Runner 통합 시 자연스럽게 해소될 예정이에요.

### 평가

| 등급 | 기준 | 판정 |
|:----:|------|:----:|
| A+ | >= 95% | ✅ **98%** |
| A | >= 90% | - |
| B | >= 80% | - |
| C | < 80% | - |
