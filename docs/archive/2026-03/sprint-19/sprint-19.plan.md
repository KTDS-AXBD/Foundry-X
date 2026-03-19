---
code: FX-PLAN-020
title: Sprint 19 (v1.7.0) — AgentInbox 스레드 답장 (ThreadReplyForm)
version: 0.1
status: Draft
category: PLAN
system-version: 1.7.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# Sprint 19 (v1.7.0) Planning Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 17(F81)에서 스레드 뷰(읽기)를 구현했지만, 에이전트 간 스레드 내 답장(쓰기) UI가 없음. getInboxThread() API 클라이언트 함수가 존재하지만 UI에서 미사용. mock-d1에 agent_messages 테이블 누락으로 통합 테스트 불가 |
| **Solution** | F87: ThreadReplyForm + ThreadDetailView UI / F88: 답장 알림 SSE + ackThread() 일괄 확인 / F89: mock-d1 보완 + 라우트 통합 테스트 + Playwright E2E |
| **Function/UX Effect** | 스레드 클릭 → 전체 대화 상세 뷰 + 인라인 답장 폼. 답장 시 실시간 SSE 전파. 스레드 단위 일괄 읽음 처리 |
| **Core Value** | 에이전트 간 비동기 협업의 핵심 UX 완성 — 읽기(F81) → 쓰기(F87) → 알림(F88) → 검증(F89) |

## Background

### 현재 상태 분석

**이미 구현된 인프라 (Sprint 15~17):**

| 구성요소 | 상태 | 위치 |
|----------|------|------|
| D1 `agent_messages` 테이블 | ✅ | migration 0009 — `parent_message_id` 컬럼 + 인덱스 |
| `AgentInbox.send()` | ✅ | `services/agent-inbox.ts` — `parentMessageId` 옵셔널 파라미터 |
| `AgentInbox.getThread()` | ✅ | `services/agent-inbox.ts` — parent + children 조회 |
| POST `/agents/inbox/send` | ✅ | `routes/inbox.ts` — `parentMessageId` 스키마 포함 |
| GET `/agents/inbox/:parentMessageId/thread` | ✅ | `routes/inbox.ts` — 스레드 조회 |
| `sendInboxMessage()` API 클라이언트 | ✅ | `lib/api-client.ts` — `parentMessageId` 파라미터 지원 |
| `getInboxThread()` API 클라이언트 | ✅ | `lib/api-client.ts` — **UI에서 미사용** |
| `groupByThread()` | ✅ | `AgentInboxPanel.tsx` — 스레드 그룹핑 |
| `MessageItem` 컴포넌트 | ✅ | `AgentInboxPanel.tsx` — flat/threaded 공용 렌더러 |
| 단위 테스트 8건 | ✅ | `agent-inbox.test.ts` — send/list/ack/getThread |
| mock-d1 `agent_messages` | ❌ | `helpers/mock-d1.ts`에 누락 |
| ThreadReplyForm | ❌ | 미구현 |
| ThreadDetailView | ❌ | 미구현 |
| 라우트 통합 테스트 | ❌ | inbox 라우트 테스트 없음 |
| E2E 스레드 시나리오 | ❌ | 미구현 |

### 아키텍처 위치

```
Sprint 19 작업 범위:

packages/web/src/components/feature/
├── AgentInboxPanel.tsx         ← 수정: 스레드 클릭 핸들러 추가
├── ThreadDetailView.tsx        ← 신규: 스레드 상세 뷰
└── ThreadReplyForm.tsx         ← 신규: 답장 입력 폼

packages/api/src/
├── services/agent-inbox.ts     ← 수정: ackThread() 메서드 추가
├── routes/inbox.ts             ← 수정: POST /:parentMessageId/ack-thread 추가
└── schemas/inbox.ts            ← 수정: ackThread 스키마 추가

packages/api/src/__tests__/
├── helpers/mock-d1.ts          ← 수정: agent_messages CREATE TABLE 추가
├── inbox-routes.test.ts        ← 신규: 라우트 통합 테스트
└── agent-inbox.test.ts         ← 수정: ackThread 테스트 추가

packages/web/e2e/
└── inbox-thread.spec.ts        ← 신규: E2E 스레드 시나리오
```

## F-items

| F# | 제목 | Priority | 핵심 작업 | 예상 테스트 |
|----|------|:--------:|-----------|:-----------:|
| F87 | ThreadReplyForm UI — 스레드 상세 뷰 + 답장 폼 + getInboxThread 연동 | P1 | ThreadDetailView + ThreadReplyForm 컴포넌트 + AgentInboxPanel 연동 | +8 |
| F88 | 스레드 답장 API 보강 — 답장 알림 + 읽음 처리 확장 | P1 | ackThread() 일괄 확인 + SSE thread_reply 이벤트 + API 라우트 확장 | +6 |
| F89 | 스레드 통합 테스트 + E2E | P2 | mock-d1 보완 + inbox 라우트 통합 테스트 + Playwright E2E | +10 |

**예상 총 신규 테스트: +24건** (API ~16 + Web ~4 + E2E ~4)

## 상세 설계 방향

### F87: ThreadReplyForm UI

**1. ThreadDetailView 컴포넌트**

스레드 루트 메시지 클릭 시 상세 뷰로 전환. `getInboxThread()` 호출하여 전체 대화를 시간순 렌더링.

```
┌─────────────────────────────────────────┐
│ ← 뒤로 | 스레드: "Task 결과 보고"       │
├─────────────────────────────────────────┤
│ 🔵 leader → worker-1                    │
│ task_assign | "빌드 스크립트 점검"       │
│ 2026-03-19 10:00                         │
│─────────────────────────────────────────│
│   🟢 worker-1 → leader                  │
│   task_result | "점검 완료 — 이상 없음"  │
│   2026-03-19 10:05                       │
│─────────────────────────────────────────│
│   🟡 leader → worker-1                  │
│   task_question | "lint 경고는?"         │
│   2026-03-19 10:07                       │
├─────────────────────────────────────────┤
│ [type ▾] [subject...] [payload...]      │
│                              [답장 전송] │
└─────────────────────────────────────────┘
```

**핵심 결정 사항:**
- `viewMode` 확장: `"flat" | "threaded" | "detail"` — detail 모드에서 ThreadDetailView 렌더링
- 스레드 루트 클릭 시 `selectedThreadId` 상태에 parentMessageId 저장
- 뒤로 버튼 → `viewMode: "threaded"` 복귀

**2. ThreadReplyForm 컴포넌트**

답장 전송 전용 폼. 기존 `sendInboxMessage()`를 `parentMessageId` 포함하여 호출.

- **Props**: `parentMessageId`, `fromAgentId`, `toAgentId`, `onReplySent` 콜백
- **필드**: type (select), subject (text), payload (JSON textarea, optional)
- **기본값**: type = `task_result`, subject 빈 문자열
- **전송 후**: `onReplySent()` → ThreadDetailView 메시지 목록 리프레시

### F88: 스레드 답장 API 보강

**1. ackThread() 일괄 확인**

현재 `ack()`는 단건만 처리. 스레드 전체를 한 번에 읽음 처리하는 메서드 추가.

```typescript
// services/agent-inbox.ts
async ackThread(parentMessageId: string): Promise<number> {
  const result = await this.db.prepare(
    `UPDATE agent_messages SET acknowledged = 1, acknowledged_at = datetime('now')
     WHERE (parent_message_id = ? OR id = ?) AND acknowledged = 0`
  ).bind(parentMessageId, parentMessageId).run();
  return result.meta.changes ?? 0;
}
```

**2. SSE 이벤트 확장**

기존 `agent.message.received` 이벤트에 추가로, 스레드 답장 시 구분 가능한 이벤트 전파:

```typescript
// send() 내부 — parentMessageId가 있을 때
if (parentMessageId) {
  sseManager.pushEvent(toAgentId, {
    type: 'agent.message.thread_reply',
    data: { messageId, parentMessageId, fromAgentId, subject }
  });
}
```

**3. 라우트 추가**

```
POST /agents/inbox/:parentMessageId/ack-thread  →  ackThread()
```

### F89: 통합 테스트 + E2E

**1. mock-d1.ts 보완**

`agent_messages` + `agent_plans` + `agent_worktrees` CREATE TABLE 추가 (migration 0009 기반).

**2. inbox 라우트 통합 테스트** (`inbox-routes.test.ts`)

| # | 테스트 시나리오 | 검증 |
|---|----------------|------|
| 1 | POST /agents/inbox/send — 정상 생성 | 201 + 필드 검증 |
| 2 | POST /agents/inbox/send — parentMessageId 포함 | 201 + 스레딩 |
| 3 | GET /agents/inbox/:agentId — 목록 조회 | 200 + 필터 |
| 4 | GET /agents/inbox/:parentMessageId/thread — 스레드 조회 | 200 + 순서 |
| 5 | POST /agents/inbox/:id/ack — 단건 확인 | 200 |
| 6 | POST /agents/inbox/:parentMessageId/ack-thread — 일괄 확인 | 200 + 변경 건수 |
| 7 | 스키마 검증 실패 — 필수 필드 누락 | 400 |
| 8 | 존재하지 않는 메시지 ack | 404 |

**3. Playwright E2E** (`inbox-thread.spec.ts`)

| # | 시나리오 | 검증 |
|---|---------|------|
| 1 | 에이전트 페이지 → Inbox 탭 접근 | 컴포넌트 렌더링 |
| 2 | 스레드 뷰 전환 + 스레드 클릭 → 상세 | ThreadDetailView 표시 |
| 3 | 답장 폼 작성 + 전송 | 메시지 추가 확인 |
| 4 | 뒤로 → 스레드 목록 복귀 | viewMode 전환 |

## 구현 순서

```
Phase 1: API 보강 (F88)
├── Step 1: mock-d1.ts agent_messages 추가 (F89 선행)
├── Step 2: ackThread() 서비스 메서드 + 테스트
├── Step 3: POST /:parentMessageId/ack-thread 라우트 + 스키마
└── Step 4: SSE thread_reply 이벤트

Phase 2: UI 구현 (F87)
├── Step 5: ThreadReplyForm 컴포넌트
├── Step 6: ThreadDetailView 컴포넌트
├── Step 7: AgentInboxPanel viewMode 확장 + 연동
└── Step 8: SSE thread_reply 이벤트 처리

Phase 3: 통합 검증 (F89)
├── Step 9: inbox-routes.test.ts 라우트 통합 테스트
├── Step 10: Playwright E2E 스레드 시나리오
└── Step 11: typecheck + build + 전체 테스트 통과
```

## 리스크

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | Sprint 18 WIP와 브랜치 충돌 | 중 | Sprint 19는 별도 브랜치에서 작업, Sprint 18 머지 후 rebase |
| 2 | mock-d1 보완 범위 확대 | 저 | agent_messages만 추가, 나머지는 순차적 |
| 3 | E2E에서 inbox 데이터 시딩 필요 | 저 | API 직접 호출로 테스트 데이터 생성 |

## 의존성

- **Sprint 17 (F81)**: 스레드 뷰 인프라 — ✅ 완료
- **Sprint 18**: 직접 의존 없음 (멀티테넌시는 독립적), 단 tenant_id 추가 후 agent_messages에도 반영 필요 가능
- **기존 API**: POST /agents/inbox/send + GET /thread — ✅ 활용

## 완료 기준

- [ ] ThreadReplyForm + ThreadDetailView 컴포넌트 구현
- [ ] ackThread() 서비스 + 라우트 추가
- [ ] SSE thread_reply 이벤트 전파
- [ ] mock-d1 agent_messages 테이블 추가
- [ ] inbox 라우트 통합 테스트 8건 이상
- [ ] Playwright E2E 스레드 시나리오 4건 이상
- [ ] typecheck + build + 전체 테스트 통과
- [ ] PDCA Gap Analysis ≥ 90%
