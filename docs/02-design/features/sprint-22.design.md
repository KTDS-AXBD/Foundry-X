---
code: FX-DSGN-022
title: Sprint 22 — Slack 고도화 상세 설계 (Interactive D1 실연동 + 채널별 알림)
version: 1.0
status: Draft
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F94
req: FX-REQ-094
plan: "[[FX-PLAN-025]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F94: Slack 고도화 — Interactive 메시지 D1 실연동 + 채널별 알림 설정 |
| Plan 참조 | [[FX-PLAN-025]] Sprint 22 Plan |
| 설계 범위 | D1 migration 1개 + 서비스 2개 수정 + 라우트 1개 수정 + 스키마 1개 수정 + 테스트 +30건 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 버튼 클릭이 텍스트 응답만 반환, 단일 webhook으로 채널 분리 불가 |
| **Solution** | Interactive D1 실 연동 + slack_notification_configs 테이블 + 카테고리별 라우팅 |
| **Function UX Effect** | Slack 승인 버튼 → Plan 즉시 실행, 알림이 agent/pr/plan 채널로 분리 전송 |
| **Core Value** | Slack에서 직접 의사결정, 채널 분리로 정보 과부하 감소 |

## 1. 데이터 설계

### 1.1 D1 Migration — 0014_slack_notification_configs.sql

```sql
-- 0014_slack_notification_configs.sql
-- Sprint 22: F94 Slack 고도화 — 카테고리별 알림 채널 설정

CREATE TABLE IF NOT EXISTS slack_notification_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('agent', 'pr', 'plan', 'queue', 'message')),
  webhook_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, category)
);

CREATE INDEX IF NOT EXISTS idx_slack_config_org ON slack_notification_configs(org_id);
```

**카테고리 정의:**

| category | SSE 이벤트 매핑 | 설명 |
|----------|-----------------|------|
| `agent` | `agent.task.started`, `agent.task.completed` | 에이전트 작업 알림 |
| `pr` | `agent.pr.created`, `agent.pr.reviewed`, `agent.pr.merged`, `agent.pr.review_needed` | PR 관련 알림 |
| `plan` | `agent.plan.*` (waiting, approved, rejected, executing, completed, failed) | Plan 생명주기 알림 |
| `queue` | `agent.queue.*` (updated, conflict, merged, rebase) | 머지 큐 알림 |
| `message` | `agent.message.*` (received, thread_reply) | 에이전트 메시지 알림 |

**Fallback 전략:**
```
1. slack_notification_configs에서 (org_id, category) 조회
2. 설정 있고 enabled=1 → 해당 webhook_url 사용
3. 설정 있고 enabled=0 → skip (알림 안 보냄)
4. 설정 없음 → organizations.settings.slack_webhook_url fallback
5. fallback도 없음 → skip
```

### 1.2 Mock D1 스키마 추가

`__tests__/helpers/mock-d1.ts`의 `initSchema()`에 추가:

```sql
CREATE TABLE IF NOT EXISTS slack_notification_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('agent', 'pr', 'plan', 'queue', 'message')),
  webhook_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, category)
);
```

## 2. 서비스 설계

### 2.1 SlackService 확장 (`services/slack.ts`)

#### 2.1.1 이벤트 타입 확장

```typescript
// 기존 3개 → 8개로 확장
export type SlackEventType =
  | "task.completed"
  | "pr.merged"
  | "plan.waiting"
  // F94 신규
  | "queue.conflict"
  | "message.received"
  | "plan.executing"
  | "plan.completed"
  | "plan.failed";
```

#### 2.1.2 새 Block Kit 빌더 메서드

```typescript
// SlackService 클래스에 추가
private queueConflictBlocks(event: SlackEvent): Block[]
  // ⚠️ 머지 큐 충돌 감지 — header + section + "대시보드에서 보기" 버튼

private messageReceivedBlocks(event: SlackEvent): Block[]
  // 💬 에이전트 메시지 수신 — header + section + "답장하기" 버튼 (대시보드 링크)

private planExecutingBlocks(event: SlackEvent): Block[]
  // 🚀 계획 실행 시작 — header + section (알림만, 버튼 없음)

private planCompletedBlocks(event: SlackEvent): Block[]
  // ✅ 계획 실행 완료 — header + section + "결과 보기" 버튼

private planFailedBlocks(event: SlackEvent): Block[]
  // ❌ 계획 실행 실패 — header + section(에러) + "상세 보기" 버튼
```

#### 2.1.3 카테고리 매핑 유틸

```typescript
// services/slack.ts에 export 추가
export function eventToCategory(eventType: string): string | null {
  if (eventType.startsWith("agent.task."))    return "agent";
  if (eventType.startsWith("agent.pr."))      return "pr";
  if (eventType.startsWith("agent.plan."))    return "plan";
  if (eventType.startsWith("agent.queue."))   return "queue";
  if (eventType.startsWith("agent.message.")) return "message";
  return null;
}
```

### 2.2 SSEManager 카테고리 라우팅 (`services/sse-manager.ts`)

**변경**: `forwardToSlack()` 메서드를 카테고리 인식으로 수정

```typescript
private async forwardToSlack(orgId: string, event: SSEEvent): Promise<void> {
  const { eventToCategory } = await import("./slack.js");
  const category = eventToCategory(event.event);
  if (!category) return;

  // 1) 카테고리별 설정 조회
  const config = await this.db.prepare(
    "SELECT webhook_url, enabled FROM slack_notification_configs WHERE org_id = ? AND category = ?"
  ).bind(orgId, category).first<{ webhook_url: string; enabled: number }>();

  let webhookUrl: string | null = null;

  if (config) {
    if (!config.enabled) return;           // 명시적 비활성화
    webhookUrl = config.webhook_url;
  } else {
    // 2) fallback: org.settings.slack_webhook_url
    const org = await this.db.prepare(
      "SELECT settings FROM organizations WHERE id = ?"
    ).bind(orgId).first<{ settings: string }>();
    if (!org) return;
    const settings = JSON.parse(org.settings || "{}");
    webhookUrl = settings.slack_webhook_url || null;
  }

  if (!webhookUrl) return;

  // 3) 전송
  const { SlackService } = await import("./slack.js");
  const slack = new SlackService({ webhookUrl });
  // ... (기존 buildSlackEvent 로직)
}
```

**isSlackEligible 확장:**

```typescript
private isSlackEligible(eventType: string): boolean {
  // 기존 3개 → 카테고리 기반으로 확장
  const { eventToCategory } = require("./slack.js"); // sync import not ideal; see note
  return eventToCategory(eventType) !== null;
}
```

> **Note**: dynamic import의 비동기 문제를 피하기 위해, `eventToCategory`를 별도 파일(`slack-utils.ts`)로 분리하거나 inline으로 구현하는 것이 더 깔끔해요. Design에서는 `slack.ts`에 유지하되, 구현 시 inline 패턴도 허용.

### 2.3 Interactive 핸들러 D1 실 연동 (`routes/slack.ts`)

**핵심 변경**: interactions 핸들러에서 D1 Plan 상태를 실제로 갱신

```typescript
slackRoute.openapi(interactionRoute, async (c) => {
  const result = await verifySlack(c as any);
  if (result instanceof Response) return result;

  const params = new URLSearchParams(result.body);
  const rawPayload = params.get("payload") ?? "{}";

  let payload: {
    actions?: Array<{ action_id: string; value?: string }>;
    user?: { id: string; name: string };
    // Slack은 team.id를 payload에 포함
    team?: { id: string };
  };
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return c.json({ text: "잘못된 페이로드에요." });
  }

  const action = payload.actions?.[0];
  if (!action) return c.json({ text: "액션을 찾을 수 없어요." });

  const planId = action.value ?? "";
  const slackUserId = payload.user?.id ?? "unknown";
  const db = c.env.DB;

  // ─── plan_approve ───
  if (action.action_id === "plan_approve" && planId) {
    const now = new Date().toISOString();

    // Race condition 방어: WHERE status = 'pending_approval'
    const updated = await db.prepare(
      `UPDATE agent_plans
       SET status = 'approved', approved_at = ?, human_feedback = ?
       WHERE id = ? AND status = 'pending_approval'`
    ).bind(now, `Slack 승인 by ${slackUserId}`, planId).run();

    if (!updated.meta.changes) {
      return c.json({
        replace_original: true,
        text: `⚠️ 계획 \`${planId}\`은(는) 이미 처리되었어요.`,
      });
    }

    // SSE 이벤트 발행 (SSEManager 접근 방식은 §2.4 참조)
    // sseManager.pushEvent({ event: "agent.plan.approved", data: { planId, approvedBy: slackUserId } });

    return c.json({
      replace_original: true,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `✅ *계획 승인 완료*\n계획 \`${planId}\`을(를) <@${slackUserId}>님이 승인했어요. 실행을 시작해요.` } },
      ],
    });
  }

  // ─── plan_reject ───
  if (action.action_id === "plan_reject" && planId) {
    const now = new Date().toISOString();

    const updated = await db.prepare(
      `UPDATE agent_plans
       SET status = 'rejected', rejected_at = ?, human_feedback = ?
       WHERE id = ? AND status = 'pending_approval'`
    ).bind(now, `Slack 거절 by ${slackUserId}`, planId).run();

    if (!updated.meta.changes) {
      return c.json({
        replace_original: true,
        text: `⚠️ 계획 \`${planId}\`은(는) 이미 처리되었어요.`,
      });
    }

    return c.json({
      replace_original: true,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `❌ *계획 거절됨*\n계획 \`${planId}\`을(를) <@${slackUserId}>님이 거절했어요.` } },
      ],
    });
  }

  // ─── view_dashboard (기존 — 변경 없음) ───
  if (action.action_id === "view_dashboard") {
    return c.json({ text: "대시보드로 이동해요." });
  }

  return c.json({ text: "알 수 없는 액션이에요." });
});
```

### 2.4 SSEManager 접근 패턴

**문제**: Slack 라우트는 public 경로이고, SSEManager 인스턴스는 개별 SSE 커넥션에서 생성됨.

**해결**: Slack interaction에서 SSE 이벤트를 직접 발행하지 않고, D1 상태 변경만 수행. SSEManager의 poll 주기(10초)가 자동으로 상태 변경을 감지하여 SSE 클라이언트에 전파.

```
Slack 버튼 클릭
  → D1 agent_plans.status 갱신
  → (10초 이내) SSEManager poll → agent_sessions/agent_plans 변경 감지
  → SSE 클라이언트에 status 이벤트 전파
```

**장점**: SSEManager 인스턴스 공유 문제를 우회하고, 기존 아키텍처와 일관성 유지.

**대안 (미채택)**: Hono Context에 SSEManager를 바인딩하는 방식 — Workers 환경에서 글로벌 상태 공유가 제한적이라 비채택.

## 3. API 설계

### 3.1 알림 설정 CRUD

알림 설정 API는 org 라우트 하위에 추가. 기존 `routes/slack.ts`(public)가 아니라, **auth + tenantGuard + roleGuard('admin')** 이 적용되는 별도 핸들러로 구현.

**구현 위치**: `routes/slack.ts`에 추가하되, 알림 설정 라우트만 미들웨어 적용

#### GET /api/orgs/:orgId/slack/configs

```
Response 200:
{
  configs: [
    { id: "snc_xxx", category: "agent", webhook_url: "https://hooks.slack.com/...", enabled: true },
    { id: "snc_yyy", category: "pr", webhook_url: "https://hooks.slack.com/...", enabled: true },
    ...
  ]
}
```

- **인증**: JWT + tenantGuard + roleGuard('member') — 멤버 이상 조회 가능
- orgId는 URL 파라미터에서 추출, tenantGuard가 소속 검증

#### PUT /api/orgs/:orgId/slack/configs/:category

```
Request Body:
{
  "webhook_url": "https://hooks.slack.com/services/T.../B.../xxx",
  "enabled": true
}

Response 200:
{
  id: "snc_xxx",
  category: "agent",
  webhook_url: "https://hooks.slack.com/...",
  enabled: true,
  updated_at: "2026-03-19T..."
}
```

- **인증**: JWT + tenantGuard + roleGuard('admin') — admin 이상만 설정 변경
- **Upsert 로직**: `INSERT OR REPLACE` (D1/SQLite의 `ON CONFLICT ... DO UPDATE`)
- category 파라미터는 enum 검증: `'agent' | 'pr' | 'plan' | 'queue' | 'message'`
- webhook_url 형식 검증: `https://hooks.slack.com/` 접두사

#### DELETE /api/orgs/:orgId/slack/configs/:category

```
Response 200: { deleted: true }
Response 404: { error: "Config not found" }
```

- **인증**: JWT + tenantGuard + roleGuard('admin')
- 삭제 시 해당 카테고리는 org fallback webhook으로 자동 전환

#### POST /api/orgs/:orgId/slack/test

```
Request Body:
{
  "category": "agent"     // optional — 지정 시 해당 카테고리 채널, 미지정 시 fallback
}

Response 200: { sent: true }
Response 400: { error: "No webhook configured for category" }
```

- **인증**: JWT + tenantGuard + roleGuard('admin')
- 테스트 메시지: "🔔 Foundry-X 알림 테스트 — {category} 채널 연결 확인"

### 3.2 라우트 마운팅 (`app.ts`)

알림 설정 API는 org 라우트 하위이므로 기존 `app.ts:76-78` org 마운트에서 자연스럽게 auth+tenantGuard 적용됨:

```typescript
// app.ts — 변경 없음
// 기존 org routes가 /api/orgs/* 경로에 대해 auth middleware 적용
app.use("/api/orgs", authMiddleware);
app.use("/api/orgs/*", authMiddleware);
app.route("/api", orgRoute);
```

**알림 설정 라우트는 `routes/org.ts`에 추가**하거나, `routes/slack.ts`에서 별도로 마운트.

**결정: `routes/org.ts`에 추가** — 이유:
1. `/api/orgs/:orgId/slack/configs`는 org 하위 리소스
2. 기존 org 라우트의 auth/tenant/role 미들웨어 재활용
3. `routes/slack.ts`는 public 경로(webhook 수신) 전용으로 유지

## 4. 스키마 설계

### 4.1 Zod 스키마 추가 (`schemas/slack.ts`)

```typescript
// 기존 SlackCommandSchema, SlackInteractionSchema 유지

// F94 신규
export const SlackNotificationCategorySchema = z.enum([
  "agent", "pr", "plan", "queue", "message",
]).openapi("SlackNotificationCategory");

export const SlackNotificationConfigSchema = z.object({
  id: z.string(),
  category: SlackNotificationCategorySchema,
  webhook_url: z.string().url().startsWith("https://hooks.slack.com/"),
  enabled: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).openapi("SlackNotificationConfig");

export const UpsertSlackConfigSchema = z.object({
  webhook_url: z.string().url().startsWith("https://hooks.slack.com/"),
  enabled: z.boolean().default(true),
}).openapi("UpsertSlackConfig");

export const SlackTestSchema = z.object({
  category: SlackNotificationCategorySchema.optional(),
}).openapi("SlackTest");
```

## 5. 테스트 설계

### 5.1 테스트 파일: `__tests__/slack.test.ts` (기존 확장)

#### 신규 테스트 그룹 1: SlackService 새 Block Kit 빌더 (5건)

| # | 테스트명 | 검증 |
|---|---------|------|
| 1 | `buildBlocks for queue.conflict includes warning header and dashboard button` | header ⚠️ + actions |
| 2 | `buildBlocks for message.received includes reply button` | header 💬 + actions |
| 3 | `buildBlocks for plan.executing includes rocket header, no actions` | header 🚀, actions 없음 |
| 4 | `buildBlocks for plan.completed includes result button` | header ✅ + actions |
| 5 | `buildBlocks for plan.failed includes error section and detail button` | header ❌ + section + actions |

#### 신규 테스트 그룹 2: eventToCategory 매핑 (5건)

| # | 테스트명 | 검증 |
|---|---------|------|
| 6 | `eventToCategory maps agent.task.* to 'agent'` | "agent" |
| 7 | `eventToCategory maps agent.pr.* to 'pr'` | "pr" |
| 8 | `eventToCategory maps agent.plan.* to 'plan'` | "plan" |
| 9 | `eventToCategory maps agent.queue.* to 'queue'` | "queue" |
| 10 | `eventToCategory returns null for unknown event` | null |

#### 신규 테스트 그룹 3: Interactive D1 실 연동 (8건)

| # | 테스트명 | 검증 |
|---|---------|------|
| 11 | `plan_approve updates agent_plans status to approved` | D1 UPDATE + 200 |
| 12 | `plan_approve returns replace_original block` | replace_original: true |
| 13 | `plan_approve on already processed plan returns warning` | "이미 처리" |
| 14 | `plan_approve with invalid planId returns warning` | meta.changes = 0 |
| 15 | `plan_reject updates agent_plans status to rejected` | D1 UPDATE + 200 |
| 16 | `plan_reject returns replace_original block` | replace_original: true |
| 17 | `plan_reject on already processed plan returns warning` | "이미 처리" |
| 18 | `interaction with no DB env falls back to text response` | 텍스트 응답 |

#### 신규 테스트 그룹 4: 채널별 알림 라우팅 (7건)

| # | 테스트명 | 검증 |
|---|---------|------|
| 19 | `forwardToSlack uses category-specific webhook when configured` | 카테고리 webhook 호출 |
| 20 | `forwardToSlack falls back to org webhook when no category config` | org webhook 호출 |
| 21 | `forwardToSlack skips when category config is disabled` | fetch 호출 안 됨 |
| 22 | `forwardToSlack skips when no webhook configured at all` | fetch 호출 안 됨 |
| 23 | `isSlackEligible returns true for all 5 categories` | true ×5 |
| 24 | `isSlackEligible returns false for unknown event` | false |
| 25 | `forwardToSlack handles new event types correctly` | plan.completed 등 |

### 5.2 테스트 파일: `__tests__/slack-config.test.ts` (신규)

#### 알림 설정 CRUD API 테스트 (7건)

| # | 테스트명 | 검증 |
|---|---------|------|
| 26 | `GET /api/orgs/:orgId/slack/configs returns empty list initially` | [] |
| 27 | `PUT /api/orgs/:orgId/slack/configs/agent creates config` | 200 + config |
| 28 | `PUT /api/orgs/:orgId/slack/configs/agent updates existing` | upsert |
| 29 | `PUT with invalid category returns 400` | 400 |
| 30 | `PUT with invalid webhook_url returns 400` | 400 |
| 31 | `DELETE /api/orgs/:orgId/slack/configs/agent removes config` | 200 |
| 32 | `POST /api/orgs/:orgId/slack/test sends test message` | 200 |

**총 신규 테스트: 32건** (기존 12건 + 신규 32건 = 44건)

## 6. 수정 파일 총괄

| # | 파일 | 변경 유형 | 핵심 변경 |
|---|------|----------|----------|
| 1 | `db/migrations/0014_slack_notification_configs.sql` | **신규** | 테이블 1개 + 인덱스 1개 |
| 2 | `__tests__/helpers/mock-d1.ts` | 수정 | slack_notification_configs CREATE TABLE 추가 |
| 3 | `services/slack.ts` | 수정 | SlackEventType 8개 확장 + Block Kit 빌더 5개 + eventToCategory() |
| 4 | `services/sse-manager.ts` | 수정 | forwardToSlack 카테고리 라우팅 + isSlackEligible 확장 |
| 5 | `routes/slack.ts` | 수정 | interactions D1 실 연동 (plan_approve/reject) |
| 6 | `routes/org.ts` | 수정 | 알림 설정 CRUD 4 endpoints 추가 |
| 7 | `schemas/slack.ts` | 수정 | SlackNotificationConfig + UpsertSlackConfig + SlackTest |
| 8 | `__tests__/slack.test.ts` | 수정 | +25건 (블록 빌더 5 + 매핑 5 + D1 연동 8 + 라우팅 7) |
| 9 | `__tests__/slack-config.test.ts` | **신규** | +7건 (CRUD API) |

## 7. 구현 순서

```
Step 1: D1 Migration 0014 + mock-d1.ts 스키마 추가
  └── 테이블 생성 확인 테스트 (mock-d1 기반)
  ↓
Step 2: schemas/slack.ts — Zod 스키마 추가
  └── SlackNotificationCategory, Config, Upsert, Test 스키마
  ↓
Step 3: services/slack.ts — SlackService 확장
  └── 이벤트 타입 8개 + Block Kit 빌더 5개 + eventToCategory()
  └── 테스트: 블록 빌더 5건 + 매핑 5건
  ↓
Step 4: routes/slack.ts — Interactive D1 실 연동
  └── plan_approve/reject → D1 UPDATE + replace_original 응답
  └── 테스트: D1 연동 8건
  ↓
Step 5: services/sse-manager.ts — 카테고리 라우팅
  └── forwardToSlack 리팩토링 + isSlackEligible 확장
  └── 테스트: 라우팅 7건
  ↓
Step 6: routes/org.ts — 알림 설정 CRUD 4 endpoints
  └── GET/PUT/DELETE/POST + roleGuard('admin')
  └── 테스트: CRUD 7건 (slack-config.test.ts)
  ↓
Step 7: typecheck + lint + 전체 테스트 통과 확인
```

## 8. 시퀀스 다이어그램

### 8.1 Interactive 메시지 승인 플로우

```
사용자(Slack)      Foundry-X API        D1              SSE Clients
    │                   │                │                   │
    │ 버튼 "승인" 클릭   │                │                   │
    │──────────────────>│                │                   │
    │ POST /slack/      │                │                   │
    │  interactions     │                │                   │
    │                   │ 서명 검증       │                   │
    │                   │──────┐         │                   │
    │                   │<─────┘         │                   │
    │                   │                │                   │
    │                   │ UPDATE plans   │                   │
    │                   │ SET status=    │                   │
    │                   │ 'approved'     │                   │
    │                   │───────────────>│                   │
    │                   │     OK (1 row) │                   │
    │                   │<───────────────│                   │
    │                   │                │                   │
    │ replace_original  │                │                   │
    │ "✅ 승인 완료"     │                │                   │
    │<──────────────────│                │                   │
    │                   │                │   (10초 이내)      │
    │                   │                │ poll → 상태 변경   │
    │                   │                │──────────────────>│
    │                   │                │   SSE: plan.approved│
```

### 8.2 카테고리별 알림 라우팅

```
SSEManager.pushEvent()
    │
    ├─ isSlackEligible(event.event)?
    │   └─ eventToCategory(event.event) !== null
    │
    ├─ forwardToSlack(orgId, event)
    │   │
    │   ├─ category = eventToCategory(event.event)
    │   │
    │   ├─ SELECT slack_notification_configs
    │   │   WHERE org_id = ? AND category = ?
    │   │
    │   ├── 설정 있음 + enabled=1 ──→ 카테고리 webhook 사용
    │   ├── 설정 있음 + enabled=0 ──→ skip
    │   └── 설정 없음 ──→ org.settings fallback
    │
    └─ SlackService.sendNotification(event)
```

## 9. 설계 결정 근거

| 결정 | 선택 | 근거 |
|------|------|------|
| 알림 설정 테이블 vs org.settings JSON | 별도 테이블 | 카테고리별 UNIQUE 제약, enabled 필드 인덱싱, 확장성 |
| SSE 직접 발행 vs poll 기반 | poll 기반 | Workers 환경 글로벌 상태 공유 제한, 기존 아키텍처 일관성 |
| 알림 설정 라우트 위치 | routes/org.ts | org 하위 리소스, auth/tenant/role 미들웨어 자연 적용 |
| replace_original vs 새 메시지 | replace_original | 중복 클릭 방지, Slack UX 가이드라인 준수 |
| plan 상태 변경 조건 | WHERE status='pending_approval' | Race condition 방어, idempotent 처리 |
