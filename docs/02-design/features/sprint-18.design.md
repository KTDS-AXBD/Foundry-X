---
code: FX-DSGN-019
title: Sprint 18 (v1.6.0) — 멀티테넌시 설계 + GitHub/Slack 외부 도구 연동
version: 0.1
status: Draft
category: DSGN
system-version: 1.6.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-PLAN-019]]"
---

# Sprint 18 Design Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | D1 22테이블 중 격리 0. JWT에 org_id 없음. 외부 도구 단방향 webhook만 존재 |
| **Solution** | organizations + tenantGuard 미들웨어 + JWT org_id + GitHub 양방향 + Slack Block Kit |
| **Function/UX Effect** | 조직별 데이터 격리. GitHub Issues/Slack에 에이전트 작업 실시간 반영 |
| **Core Value** | 단일 사용자 도구 → 멀티 조직 SaaS 플랫폼 전환 |

---

## F83: 멀티테넌시 기초 — Organizations + tenant_id + RLS

### 1. 스키마 설계

#### Migration 0011: organizations + org_members

```sql
-- Migration: 0011_organizations
-- Description: Multi-tenancy base tables

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro','enterprise')),
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgmember_user ON org_members(user_id);
```

> `settings` JSON 필드에 org-level 설정 저장: slack_webhook_url, github_app_installation_id 등

#### Migration 0012: 기존 테이블 tenant_id 추가

```sql
-- Migration: 0012_add_org_id
-- Description: Add org_id to projects, agents, mcp_servers

-- 1. Default organization
INSERT OR IGNORE INTO organizations (id, name, slug, plan)
VALUES ('org_default', 'Default Organization', 'default', 'free');

-- 2. projects
ALTER TABLE projects ADD COLUMN org_id TEXT DEFAULT '';
UPDATE projects SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);

-- 3. agents
ALTER TABLE agents ADD COLUMN org_id TEXT DEFAULT '';
UPDATE agents SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);

-- 4. mcp_servers
ALTER TABLE mcp_servers ADD COLUMN org_id TEXT DEFAULT '';
UPDATE mcp_servers SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_mcpservers_org ON mcp_servers(org_id);

-- 5. GitHub sync 컬럼 (F84용)
ALTER TABLE agent_tasks ADD COLUMN github_issue_number INTEGER DEFAULT NULL;
ALTER TABLE agent_prs ADD COLUMN github_pr_number INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_github ON agent_tasks(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_prs_github ON agent_prs(github_pr_number);

-- 6. 기존 사용자 -> org_default 멤버
INSERT OR IGNORE INTO org_members (org_id, user_id, role)
SELECT 'org_default', id, 'owner' FROM users;
```

#### 테넌시 격리 계층

```
organizations
 ├─ org_members (직접 FK: org_id)
 ├─ projects (직접 FK: org_id)
 │   ├─ wiki_pages        (간접: project_id)
 │   ├─ token_usage       (간접: project_id)
 │   ├─ agent_sessions    (간접: project_id)
 │   ├─ spec_conflicts    (간접: project_id)
 │   ├─ merge_queue       (간접: project_id)
 │   └─ parallel_executions (간접: project_id)
 ├─ agents (직접 FK: org_id)
 │   ├─ agent_capabilities  (간접: agent_id)
 │   ├─ agent_constraints   (간접: agent_id)
 │   ├─ agent_tasks         (간접: agent_id)
 │   ├─ agent_prs           (간접: agent_id)
 │   ├─ agent_plans         (간접: agent_id)
 │   ├─ agent_messages      (간접: agent_id)
 │   └─ agent_worktrees     (간접: agent_id)
 └─ mcp_servers (직접 FK: org_id)
     └─ mcp_sampling_log   (간접: server_id)
```

핵심: `org_id` 직접 보유 = projects, agents, mcp_servers 3개만. 나머지는 FK 체인으로 간접 격리.

### 2. JWT 확장

```typescript
// middleware/auth.ts — JwtPayload 변경
export interface JwtPayload {
  sub: string;           // userId
  email: string;
  role: "admin" | "member" | "viewer";
  orgId: string;         // NEW: active organization
  orgRole: "owner" | "admin" | "member" | "viewer"; // NEW
  iat: number;
  exp: number;
  jti?: string;
}
```

로그인 흐름 변경:
1. email/password 검증 (기존)
2. org_members에서 사용자의 org 목록 조회 (NEW)
3. org 1개 → 자동 선택 / org 2개+ → 첫 번째 선택 (Sprint 19에 switcher UI)
4. JWT에 orgId, orgRole 포함

### 3. tenantGuard 미들웨어

```typescript
// middleware/tenant.ts — NEW FILE
export const tenantGuard: MiddlewareHandler = async (c, next) => {
  const payload = c.get("jwtPayload");
  if (!payload?.orgId) {
    return c.json({ error: "Organization context required" }, 403);
  }

  // 실제 멤버십 검증 (JWT 위조 방지)
  const member = await c.env.DB.prepare(
    "SELECT role FROM org_members WHERE org_id = ? AND user_id = ?"
  ).bind(payload.orgId, payload.sub).first();

  if (!member) {
    return c.json({ error: "Not a member of this organization" }, 403);
  }

  c.set("orgId", payload.orgId);
  c.set("orgRole", member.role);
  c.set("userId", payload.sub);
  await next();
};
```

미들웨어 체인: `cors → authMiddleware → tenantGuard → routes`
(public paths는 tenantGuard도 bypass)

### 4. 서비스 레이어 변경 패턴

**Sprint 18 (Step 1)**: 직접 격리 테이블만 — routes에서 `c.get("orgId")` 읽어 WHERE 추가

```typescript
// 변경 예시 (routes/agent.ts)
// Before:
const { results } = await c.env.DB.prepare("SELECT * FROM agents").all();
// After:
const orgId = c.get("orgId");
const { results } = await c.env.DB.prepare(
  "SELECT * FROM agents WHERE org_id = ?"
).bind(orgId).all();
```

**Sprint 19 (Step 2)**: 간접 격리 — JOIN 또는 서비스 파라미터 추가

### 5. 테스트 호환 전략

```typescript
// mock-d1.ts 변경
// initSchema()에 organizations + org_members 추가
// default test org 자동 생성: { id: "org_test", slug: "test" }
// createTestEnv()에서 JWT payload에 orgId: "org_test" 포함
// → 기존 313 테스트 무수정 통과 목표
```

### 6. F83 예상 변경

| 파일 | 변경 | LOC |
|------|------|-----|
| `middleware/tenant.ts` | **NEW** tenantGuard | ~40 |
| `middleware/auth.ts` | JwtPayload + createTokenPair 수정 | +15 |
| `app.ts` | tenantGuard 체인 추가 | +5 |
| `routes/auth.ts` | login org 선택 로직 | +45 |
| `routes/agent.ts` | org_id 필터 | +20 |
| `routes/mcp.ts` | org_id 필터 | +10 |
| `db/migrations/0011_organizations.sql` | **NEW** | ~25 |
| `db/migrations/0012_add_org_id.sql` | **NEW** | ~30 |
| `schemas/org.ts` | **NEW** Zod 스키마 | ~35 |
| `__tests__/helpers/mock-d1.ts` | org fixture | +30 |
| `shared/src/types.ts` | Organization, OrgMember 타입 | +20 |
| 테스트 파일들 | +25 tests | ~200 |
| **소계** | | **~475 LOC** |

---

## F84: GitHub 양방향 동기화

### 1. GitHubSyncService (NEW)

```typescript
// services/github-sync.ts
export class GitHubSyncService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private orgId: string,
  ) {}

  // agent_tasks -> GitHub Issues
  async syncTaskToIssue(taskId: string): Promise<{ issueNumber: number }>;

  // GitHub Issues -> agent_tasks (webhook)
  async syncIssueToTask(issueEvent: GitHubIssueEvent): Promise<void>;

  // agent_prs <-> GitHub PR 상태
  async syncPrStatus(prEvent: GitHubPrEvent): Promise<void>;
}
```

### 2. Webhook 확장

```typescript
// routes/webhook.ts 변경
// 기존: push 이벤트만 (WikiSync)
// 추가: issues, pull_request 이벤트

switch (event) {
  case "push": return handlePush(c, payload, org);      // 기존
  case "issues": return handleIssue(c, payload, org);    // NEW
  case "pull_request": return handlePr(c, payload, org); // NEW
}
```

테넌트 식별: webhook secret -> organizations.settings.webhook_secret 매핑

### 3. GitHubService 확장

기존 `services/github.ts`에 추가:
- `createIssue(params)` — Issue 생성
- `updateIssue(number, params)` — Issue 업데이트
- `addIssueComment(number, body)` — 코멘트

### 4. 라벨 매핑

| agent_tasks 필드 | GitHub Label |
|-----------------|-------------|
| agent_name | `agent:{name}` |
| priority | `priority:{level}` |
| task_type | `type:{type}` |
| status=completed | Issue close |

### 5. F84 예상 변경

| 파일 | 변경 | LOC |
|------|------|-----|
| `services/github-sync.ts` | **NEW** | ~120 |
| `services/github.ts` | 3 메서드 추가 | +45 |
| `routes/webhook.ts` | issues/PR 핸들러 | +60 |
| `routes/agent.ts` | task 생성 시 sync 호출 | +15 |
| `schemas/webhook.ts` | **NEW** 이벤트 스키마 | ~40 |
| 테스트 | +15 tests | ~180 |
| **소계** | | **~460 LOC** |

---

## F85: Slack 통합

### 1. SlackService (NEW)

```typescript
// services/slack.ts
export class SlackService {
  constructor(private config: { webhookUrl: string }) {}

  async sendNotification(event: SlackEvent): Promise<void>;
  // Block Kit 메시지 빌더 (task.completed, pr.merged, plan.waiting)
}
```

### 2. 슬래시 커맨드 (routes/slack.ts — NEW)

- `POST /api/slack/commands` — `/foundry-x status|plan <desc>`
- `POST /api/slack/interactions` — 버튼 클릭 (계획 승인/거절)
- Slack request signature 검증 (`X-Slack-Signature`)

### 3. SSE -> Slack 브릿지

`sse-manager.ts`의 `pushEvent()` 확장:
- org settings에 slack_webhook_url이 있으면 Slack 알림 동시 전송
- 대상 이벤트: task.completed, pr.merged, plan.waiting

### 4. Slack 이벤트 매핑

| SSE Event | Slack 메시지 |
|-----------|-------------|
| agent.task.completed | 에이전트 작업 완료 + 대시보드 링크 |
| agent.pr.merged | PR 머지 완료 알림 |
| agent.plan.waiting | 계획 승인 요청 + Approve/Reject 버튼 |

### 5. F85 예상 변경

| 파일 | 변경 | LOC |
|------|------|-----|
| `services/slack.ts` | **NEW** Block Kit builder | ~100 |
| `routes/slack.ts` | **NEW** 커맨드 + interactions | ~80 |
| `services/sse-manager.ts` | Slack 브릿지 | +30 |
| `app.ts` | slack 라우트 + public path | +5 |
| `schemas/slack.ts` | **NEW** Slack 스키마 | ~30 |
| 테스트 | +10 tests | ~120 |
| **소계** | | **~365 LOC** |

---

## F86: Sprint 18 통합 + v1.6.0 릴리스

### 통합 테스트 시나리오

1. 멀티테넌시 격리: Org A agents != Org B agents
2. 로그인 -> JWT orgId 포함 검증
3. GitHub: task 생성 -> Issue 생성 -> Issue close -> task 완료
4. Slack: agent.task.completed -> Block Kit 메시지
5. 기존 313 테스트 regression = 0

### 배포 체크리스트

- D1 migration 0011+0012 remote 적용
- Workers secrets: SLACK_SIGNING_SECRET
- Workers + Pages deploy + smoke test
- version bump v1.6.0 + git tag
- SPEC + CHANGELOG 갱신

---

## 전체 변경 요약

| F-item | 신규 파일 | 변경 파일 | LOC | 테스트 |
|--------|-----------|-----------|-----|--------|
| F83 | 4 | 7 | ~475 | +25 |
| F84 | 2 | 3 | ~460 | +15 |
| F85 | 3 | 2 | ~365 | +10 |
| F86 | 0 | 4 | ~50 | +5 |
| **합계** | **9** | **~14** | **~1,350** | **+55** |

## 구현 순서

```
Phase 1: F83 (Leader, 선행 필수)
  migration -> JWT -> tenantGuard -> route 필터 -> 313 테스트 통과 확인
    |
Phase 2: F84 + F85 (W1, W2 병렬)
  W1: GitHubSyncService + webhook 확장
  W2: SlackService + 슬래시 커맨드 + SSE 브릿지
    |
Phase 3: F86 (Leader)
  통합 테스트 + 배포 + 릴리스
```
