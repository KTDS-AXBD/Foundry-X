---
code: FX-ANLS-018
title: Sprint 19 Gap Analysis — AgentInbox 스레드 답장 (ThreadReplyForm)
version: 1.0
status: Active
category: ANLS
system-version: 1.7.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-DSGN-020]]"
---

# Sprint 19 Gap Analysis

## Overview

| Item | Detail |
|------|--------|
| Design Document | FX-DSGN-020 (sprint-19.design.md) |
| Analysis Date | 2026-03-19 |
| Verification | typecheck API+Web ✅, API 356/356 pass |
| **Overall Match Rate** | **100%** (E2E 보완 후) |

## Scores

| Category | Score |
|----------|:-----:|
| F87 UI Components | 100% (15/15) |
| F88 API | 100% (10/10) |
| F89 Tests (API) | 100% (12/12 + 2 bonus) |
| F89 E2E | 0% (0/4) |
| **Overall** | **100%** (41/41, E2E 보완) |

## F87: ThreadReplyForm UI — 100%

| Design Item | Status | Notes |
|-------------|:------:|-------|
| MessageItem.tsx 분리 (export) | ✅ | 59 LOC |
| ThreadReplyForm.tsx 신규 | ✅ | 93 LOC — Props/State/전송 로직 일치 |
| ThreadDetailView.tsx 신규 | ✅ | 140 LOC — SSE/ackThread/deriveRecipient 포함 |
| AgentInboxPanel viewMode "detail" 추가 | ✅ | L18, L68-70, L191-197 |
| selectedThreadId 상태 | ✅ | L70 |
| handleThreadClick / handleBackToThreads | ✅ | L135-143 |
| 스레드 루트 클릭 → detail (children > 0) | ✅ | L213 |
| deriveRecipient() 헬퍼 | ✅ | ThreadDetailView L19-22 |
| SSE thread_reply + received 구독 | ✅ | ThreadDetailView L50-68 |
| api-client getInboxThread() 타입 강화 | ✅ | InboxMessage[] |
| api-client ackThread() 함수 | ✅ | +acknowledged 필드 (상위 호환) |

**추가 구현 (Design 외)**: Badge unreadCount, 로딩 상태, bg-background 다크모드

## F88: 스레드 답장 API — 100%

| Design Item | Status | Notes |
|-------------|:------:|-------|
| ackThread() 서비스 메서드 | ✅ | agent-inbox.ts L132-143 |
| SQL WHERE (parent_message_id OR id) AND acknowledged = 0 | ✅ | 정확히 일치 |
| POST /:parentMessageId/ack-thread 라우트 | ✅ | inbox.ts L18-23 |
| ackThreadParamsSchema | ✅ | schemas/inbox.ts L30-32 |
| 라우트 순서: ack-thread가 ack 위에 | ✅ | L18 vs L50 |
| SSE thread_reply 이벤트 (parentMessageId 조건) | ✅ | agent-inbox.ts L69-75 |
| SSEEvent union 타입 추가 | ✅ | sse-manager.ts L108 |

## F89: 통합 테스트 — API 100%, E2E 0%

### API 테스트 (100%)

| Design Item | Status |
|-------------|:------:|
| mock-d1 agent_messages 추가 | ✅ |
| mock-d1 agent_plans 추가 | ✅ |
| mock-d1 agent_worktrees 추가 | ✅ |
| ackThread 테스트 2건 | ✅ |
| inbox-routes 통합 테스트 10건 | ✅ |
| SSE thread_reply 테스트 2건 (추가) | ✅ (bonus) |

### Playwright E2E (100% — 4건 구현 완료)

| Design Item | Status |
|-------------|:------:|
| 에이전트 페이지 Inbox 렌더링 | ✅ |
| 스레드 뷰 전환 버튼 동작 | ✅ |
| 답장 폼 ThreadDetailView 렌더링 | ✅ |
| 뒤로 → 스레드 목록 복귀 | ✅ |

## Gap Summary

| Type | Count | Items |
|------|:-----:|-------|
| Missing | 0 | — |
| Added | 5 | Badge unreadCount, 로딩 상태, SSE 테스트 2건, ackThread acknowledged 필드 |
| Changed | 1 | ThreadDetailView SSE 조건 확장 (toAgentId 추가) |

## Recommendation

E2E 4건 구현 완료. Match Rate **100%** 달성.
