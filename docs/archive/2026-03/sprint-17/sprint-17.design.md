---
code: FX-DSGN-018
title: Sprint 17 (v1.5.0) — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합
version: 0.1
status: Archived
category: DSGN
system-version: 1.5.0
created: 2026-03-18
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-PLAN-018]]"
---

# Sprint 17 Design Document (Archived Summary)

> 원본은 멀티 pane 리버트로 소실. 핵심 설계를 요약 보존.

## F80: AI Foundry MCP 연동
- McpRegistry.createServerPreset("ai-foundry", { skillId, apiKey }) — 프리셋 등록
- PRESET_CONFIGS: baseUrl, transportType("http"), defaultName
- PlannerAgentDeps.mcpRegistry — 외부 도구 정보 수집 (gatherExternalToolInfo)
- ProposedStep.externalTool { serverId, toolName, arguments } — 외부 도구 참조
- 에러 핸들링: graceful degradation (MCP 실패 시 외부 도구 없이 진행)

## F81: AgentInbox 스레드 뷰
- GET /agents/inbox/:parentMessageId/thread — getThread() 라우트 노출
- threadParamsSchema + threadQuerySchema Zod 스키마
- AgentInboxPanel: viewMode(flat/threaded), groupByThread() O(N) 알고리즘
- ThreadGroup { root, children }, orphans 분리
- expandedThreads Set, 접기/펼치기, "{N}개 답장" 배지
- api-client getInboxThread()

## F82: PlannerAgent Orchestrator 통합
- createPlanAndWait(): 폴링 loop (1s interval, 5min timeout, AbortSignal)
- SSE agent.plan.waiting 이벤트 → 대시보드 승인 요청 알림
- executePlan(): approved/failed → executing → completed/failed 상태 머신
- D1 UPDATE agent_plans (execution_status, execution_started_at/completed_at, execution_result/error)
- SSE 4종: waiting, executing, completed, failed
- PlanTimeoutError, PlanRejectedError, PlanCancelledError 에러 클래스
- Plan API: GET /plan/:id, POST /plan/:id/execute
- D1 migration 0010: ALTER TABLE agent_plans ADD COLUMN execution_* 5개 + INDEX

## 전체 변경 예상: ~415 LOC, 테스트 +22건
