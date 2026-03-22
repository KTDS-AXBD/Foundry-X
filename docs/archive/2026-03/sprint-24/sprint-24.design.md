---
code: FX-DSGN-025
title: "Sprint 24 Design — 멀티 프로젝트 + Jira + 모니터링 + 워크플로우"
version: 0.1
status: Draft
category: DSGN
system-version: 1.8.1
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 24 Design — 멀티 프로젝트 + Jira + 모니터링 + 워크플로우

> **Summary**: F98~F101 4개 피처의 데이터 모델, API, UI, 테스트 설계
>
> **Project**: Foundry-X
> **Version**: v2.0.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-20
> **Status**: Draft
> **Planning Doc**: [sprint-24.plan.md](../../01-plan/features/sprint-24.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **기존 패턴 일관성**: GitHubService/SlackService 어댑터 패턴을 JiraAdapter에 동일 적용
2. **WebhookRegistry 범용화**: 현재 GitHub 전용 webhook.ts를 범용 프레임워크로 리팩토링
3. **번들 최소화**: React Flow를 dynamic import로 워크플로우 페이지에서만 로딩
4. **D1 확장 최소화**: 4개 신규 테이블만 추가 (0016 migration 1개)

### 1.2 Design Principles

- **Adapter Pattern**: 외부 서비스(Jira/Sentry)는 독립 어댑터로 격리
- **OpenAPI First**: 모든 신규 엔드포인트는 createRoute + Zod 스키마
- **Org-Scoped**: 모든 데이터는 org_id로 멀티테넌시 격리
- **Progressive Enhancement**: 기본 기능 먼저, 고급 기능(drag-and-drop 등)은 점진 추가

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Web Dashboard (Next.js 14)                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ ProjectOverview│ │ MonitorPanel │ │ WorkflowEditor       │ │
│  │ (F98)         │ │ (F100)       │ │ (F101, React Flow)   │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘ │
│         │                │                      │             │
│  ┌──────┴────────────────┴──────────────────────┴───────────┐│
│  │  api-client.ts (fetchApi)                                 ││
│  └──────────────────────────┬────────────────────────────────┘│
└─────────────────────────────┼────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┼────────────────────────────────┐
│  API Server (Hono on Workers)│                                │
│  ┌──────────────┐ ┌────────┴─────┐ ┌──────────────────────┐ │
│  │project-overview│ │webhook-registry│ │ workflow engine    │ │
│  │ route (F98)   │ │ route (F99)    │ │ route (F101)       │ │
│  └──────┬───────┘ └──────┬────────┘ └──────────┬──────────┘ │
│         │                │                      │             │
│  ┌──────┴──┐ ┌───────┬──┴──────┐ ┌────────────┴──────────┐ │
│  │project- │ │webhook│jira-    │ │workflow-  │monitoring │ │
│  │overview │ │registry│adapter  │ │engine     │service    │ │
│  │service  │ │service│service  │ │service    │(F100)     │ │
│  └────┬────┘ └───┬───┘└───┬────┘ └─────┬─────┘└─────┬────┘ │
│       │          │        │             │            │       │
│  ┌────┴──────────┴────────┴─────────────┴────────────┴────┐ │
│  │  D1 Database (SQLite)                                   │ │
│  │  + projects/agents/agent_tasks (기존)                    │ │
│  │  + webhooks, webhook_deliveries (F99 신규)               │ │
│  │  + workflows, workflow_executions (F101 신규)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  External:  Jira Cloud API  │  Sentry (toucan-js)  │  KV    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
F98: Dashboard → API /projects/overview → D1 집계 쿼리 → 건강도 + 활동 JSON
F99: Jira webhook → WebhookRegistry → signature 검증 → JiraAdapter → D1 sync
F100: Workers req → toucan-js → Sentry | Analytics API → KV 캐시 → Dashboard
F101: Editor UI → API /workflows CRUD → D1 저장 → /execute → Orchestrator
```

---

## 3. Data Model

### 3.1 D1 Migration 0016: Sprint 24 테이블

```sql
-- 0016_sprint24_webhook_workflow.sql

-- F99: WebhookRegistry
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  event_types TEXT NOT NULL,
  target_url TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  secret TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- F101: Workflow Engine
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  template_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  current_step TEXT,
  context TEXT,
  result TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
```

### 3.2 Entity Relationships

```
[organizations] 1 ──── N [webhooks]       (org_id)
[organizations] 1 ──── N [workflows]      (org_id)
[webhooks]      1 ──── N [webhook_deliveries] (webhook_id)
[workflows]     1 ──── N [workflow_executions] (workflow_id)
```

### 3.3 Workflow Definition Schema (JSON)

```typescript
interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'end';
  label: string;
  position: { x: number; y: number };
  data: {
    actionType?: 'run_agent' | 'create_pr' | 'send_notification' | 'run_analysis' | 'wait_approval';
    config?: Record<string, unknown>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;  // predefined condition key (e.g. 'approval_granted', 'analysis_passed')
}
```

**Condition 평가 전략**: 임의 코드 실행이 아닌, 사전 정의된 condition key 매핑 방식 사용:

```typescript
const CONDITION_EVALUATORS: Record<string, (ctx: ExecutionContext) => boolean> = {
  'approval_granted': (ctx) => ctx.lastResult?.approved === true,
  'analysis_passed': (ctx) => (ctx.lastResult?.matchRate ?? 0) >= 90,
  'pr_merged': (ctx) => ctx.lastResult?.prState === 'merged',
  'always': () => true,
};
```

---

## 4. API Specification

### 4.1 F98 — Project Overview (3 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/orgs/{orgId}/projects/overview | 크로스 프로젝트 건강도 + 요약 | tenantGuard |
| GET | /api/orgs/{orgId}/projects/health | 프로젝트별 SDD Triangle 점수 | tenantGuard |
| GET | /api/orgs/{orgId}/projects/activity | 최근 에이전트 활동 집계 | tenantGuard |

#### GET /api/orgs/{orgId}/projects/overview

**Response (200):**
```json
{
  "totalProjects": 3,
  "overallHealth": 87.5,
  "projects": [
    {
      "id": "proj-1",
      "name": "Foundry-X",
      "healthScore": 92,
      "grade": "A",
      "activeAgents": 2,
      "openTasks": 5,
      "recentPrCount": 3,
      "lastActivity": "2026-03-20T10:00:00Z"
    }
  ],
  "agentActivity": {
    "last24h": { "tasksCompleted": 12, "prsCreated": 4, "messagesSent": 28 },
    "last7d": { "tasksCompleted": 45, "prsCreated": 15, "messagesSent": 120 }
  }
}
```

**서비스: project-overview.ts**
```typescript
export class ProjectOverviewService {
  constructor(private db: D1Database) {}

  async getOverview(orgId: string): Promise<ProjectOverview> {
    // 1. projects 테이블에서 org_id 필터 집계
    // 2. agent_tasks에서 최근 24h/7d 활동 집계
    // 3. health-calc 로직 재사용 (per-project)
  }
}
```

### 4.2 F99 — Webhook Registry + Jira (9 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/orgs/{orgId}/webhooks | 등록된 웹훅 목록 | tenantGuard |
| POST | /api/orgs/{orgId}/webhooks | 웹훅 등록 | admin+ |
| GET | /api/orgs/{orgId}/webhooks/{id} | 웹훅 상세 | tenantGuard |
| DELETE | /api/orgs/{orgId}/webhooks/{id} | 웹훅 삭제 | admin+ |
| POST | /api/orgs/{orgId}/webhooks/{id}/test | 웹훅 테스트 발송 | admin+ |
| POST | /api/webhook/{provider} | 인바운드 웹훅 수신 (public) | signature |
| GET | /api/orgs/{orgId}/jira/projects | Jira 프로젝트 목록 | tenantGuard |
| PUT | /api/orgs/{orgId}/jira/config | Jira 연결 설정 | admin+ |
| POST | /api/orgs/{orgId}/jira/sync | Jira 수동 동기화 트리거 | admin+ |

**서비스: webhook-registry.ts**
```typescript
export class WebhookRegistryService {
  constructor(private db: D1Database) {}

  async register(orgId: string, webhook: WebhookCreate): Promise<Webhook> { ... }
  async list(orgId: string): Promise<Webhook[]> { ... }
  async delete(orgId: string, id: string): Promise<void> { ... }

  // 인바운드: 시그니처 검증 + 이벤트 라우팅
  async handleInbound(provider: string, headers: Headers, body: string): Promise<void> {
    const webhook = await this.findByProvider(provider);
    await this.verifySignature(webhook, headers, body);
    await this.dispatchEvent(webhook, JSON.parse(body));
  }

  // 아웃바운드: 이벤트 발송 + 재시도
  async deliver(webhookId: string, event: WebhookEvent): Promise<void> {
    const delivery = await this.createDelivery(webhookId, event);
    try {
      const res = await fetch(webhook.target_url, {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' },
      });
      await this.updateDelivery(delivery.id, { status: 'success', response_code: res.status });
    } catch {
      await this.scheduleRetry(delivery);
    }
  }

  // 시그니처 검증 (기존 webhook.ts의 computeHmacSha256 재사용)
  private async verifySignature(webhook: Webhook, headers: Headers, body: string): Promise<void> { ... }
}
```

**서비스: jira-adapter.ts**
```typescript
export class JiraAdapter {
  constructor(
    private apiUrl: string,    // https://your-domain.atlassian.net
    private email: string,
    private apiToken: string
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Basic ${btoa(`${this.email}:${this.apiToken}`)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getProjects(): Promise<JiraProject[]> { ... }
  async getIssue(issueKey: string): Promise<JiraIssue> { ... }
  async createIssue(project: string, summary: string, type: string): Promise<JiraIssue> { ... }
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> { ... }
  async addComment(issueKey: string, body: string): Promise<void> { ... }
}

// Jira <-> Foundry-X 양방향 동기화
export class JiraSyncService {
  constructor(private jira: JiraAdapter, private db: D1Database, private orgId: string) {}
  async syncIssueToSpec(issue: JiraIssue): Promise<SyncResult> { ... }
  async syncSpecToIssue(fItem: FItem): Promise<SyncResult> { ... }
}
```

### 4.3 F100 — Monitoring (2 endpoints + Sentry 연동)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/health/detailed | 서비스별 상세 상태 + 응답시간 | admin+ |
| GET | /api/orgs/{orgId}/monitoring/stats | Workers 통계 (KV 캐시) | tenantGuard |

**서비스: monitoring.ts**
```typescript
export class MonitoringService {
  constructor(private kv: KVNamespace, private db: D1Database) {}

  async getWorkerStats(): Promise<WorkerStats> {
    const cached = await this.kv.get('worker-stats', 'json');
    if (cached) return cached as WorkerStats;
    const stats = await this.fetchAnalytics();
    await this.kv.put('worker-stats', JSON.stringify(stats), { expirationTtl: 300 });
    return stats;
  }

  async getDetailedHealth(): Promise<DetailedHealth> { ... }
}
```

**Sentry 연동 (toucan-js):**
```typescript
// app.ts에 미들웨어로 추가
import Toucan from 'toucan-js';

app.use('*', async (c, next) => {
  const sentry = new Toucan({
    dsn: c.env.SENTRY_DSN,
    context: c.executionCtx,
    request: c.req.raw,
  });
  c.set('sentry', sentry);
  try {
    await next();
  } catch (e) {
    sentry.captureException(e);
    throw e;
  }
});
```

### 4.4 F101 — Workflow Engine (6 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/orgs/{orgId}/workflows | 워크플로우 목록 | tenantGuard |
| POST | /api/orgs/{orgId}/workflows | 워크플로우 생성 | admin+ |
| GET | /api/orgs/{orgId}/workflows/{id} | 워크플로우 상세 | tenantGuard |
| PUT | /api/orgs/{orgId}/workflows/{id} | 워크플로우 수정 | admin+ |
| DELETE | /api/orgs/{orgId}/workflows/{id} | 워크플로우 삭제 | admin+ |
| POST | /api/orgs/{orgId}/workflows/{id}/execute | 워크플로우 실행 | admin+ |

**서비스: workflow-engine.ts**
```typescript
export class WorkflowEngine {
  constructor(private db: D1Database, private orchestrator: AgentOrchestrator) {}

  async create(orgId: string, def: WorkflowCreate): Promise<Workflow> { ... }
  async list(orgId: string): Promise<Workflow[]> { ... }
  async get(orgId: string, id: string): Promise<Workflow | null> { ... }
  async update(orgId: string, id: string, def: Partial<WorkflowCreate>): Promise<Workflow> { ... }
  async delete(orgId: string, id: string): Promise<void> { ... }

  async execute(orgId: string, workflowId: string): Promise<WorkflowExecution> {
    const workflow = await this.get(orgId, workflowId);
    const definition: WorkflowDefinition = JSON.parse(workflow.definition);
    const execution = await this.createExecution(workflowId, orgId);
    const trigger = definition.nodes.find(n => n.type === 'trigger');
    await this.executeNode(execution.id, trigger, definition);
    return execution;
  }

  private async executeNode(execId: string, node: WorkflowNode, def: WorkflowDefinition): Promise<void> {
    await this.updateExecution(execId, { current_step: node.id, status: 'running' });

    switch (node.data.actionType) {
      case 'run_agent':
        await this.orchestrator.executeTask(node.data.config);
        break;
      case 'create_pr':
        // PrPipelineService 호출
        break;
      case 'send_notification':
        // SlackService / WebhookRegistry 호출
        break;
      case 'wait_approval':
        // AgentInbox 메시지 생성 + 대기
        break;
      case 'run_analysis':
        // PlannerAgent analyzeCodebase 호출
        break;
    }

    const nextEdges = def.edges.filter(e => e.source === node.id);
    for (const edge of nextEdges) {
      if (edge.condition && !CONDITION_EVALUATORS[edge.condition]?.(this.getContext(execId))) continue;
      const nextNode = def.nodes.find(n => n.id === edge.target);
      if (nextNode && nextNode.type !== 'end') {
        await this.executeNode(execId, nextNode, def);
      }
    }
  }
}
```

---

## 5. UI/UX Design

### 5.1 F98 — 멀티 프로젝트 대시보드

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar │  Projects Overview                                    │
│          │  ┌─────────────────────────────────────────────────┐  │
│          │  │  Overall Health: 87.5  │  Active Agents: 4     │  │
│          │  │  Projects: 3           │  Open Tasks: 12       │  │
│          │  └─────────────────────────────────────────────────┘  │
│          │                                                        │
│          │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│          │  │ Foundry-X    │ │ Discovery-X  │ │ AXIS DS      │  │
│          │  │ Health: A 92 │ │ Health: B 78 │ │ Health: A 95 │  │
│          │  │ Agents: 2    │ │ Agents: 1    │ │ Agents: 1    │  │
│          │  │ Tasks: 5     │ │ Tasks: 4     │ │ Tasks: 3     │  │
│          │  └──────────────┘ └──────────────┘ └──────────────┘  │
│          │                                                        │
│          │  Agent Activity (24h)                                  │
│          │  ┌─────────────────────────────────────────────────┐  │
│          │  │  Tasks: 12 completed │ PRs: 4 │ Messages: 28   │  │
│          │  └─────────────────────────────────────────────────┘  │
└──────────┴────────────────────────────────────────────────────────┘
```

**컴포넌트:**
- `ProjectOverviewPage` — `(app)/projects/page.tsx`
- `ProjectCard` — 프로젝트별 건강도 카드
- `AgentActivitySummary` — 24h/7d 활동 통계

### 5.2 F101 — 워크플로우 에디터

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar │  Workflow Editor: "PR Review Pipeline"                │
│          │  ┌────────────┐                                       │
│          │  │  Toolbox    │  ┌─────────────────────────────────┐ │
│          │  │ ○ Trigger   │  │                                 │ │
│          │  │ ○ Agent Run │  │   [Trigger] --> [Run Agent]     │ │
│          │  │ ○ Create PR │  │                    │             │ │
│          │  │ ○ Notify    │  │              [Wait Approval]     │ │
│          │  │ ○ Wait      │  │                    │             │ │
│          │  │ ○ Condition │  │         Yes────────┴───No        │ │
│          │  │ ○ End       │  │    [Create PR]        [End]     │ │
│          │  └────────────┘  │                                 │ │
│          │                   └─────────────────────────────────┘ │
│          │  ┌──────────────────────────────────────────────────┐ │
│          │  │  Properties: Run Agent                           │ │
│          │  │  Agent: [PlannerAgent v]  Task: [analyze v]     │ │
│          │  └──────────────────────────────────────────────────┘ │
└──────────┴────────────────────────────────────────────────────────┘
```

**컴포넌트:**
- `WorkflowListPage` — `(app)/workflows/page.tsx`
- `WorkflowEditorPage` — `(app)/workflows/[id]/page.tsx`
- `WorkflowCanvas` — React Flow 래퍼 (dynamic import, ssr: false)
- `NodeToolbox` — 드래그 가능한 노드 팔레트
- `NodeProperties` — 선택 노드의 설정 패널

**React Flow 의존성 + Dynamic Import:**
```bash
pnpm add @xyflow/react --filter web
```
```typescript
const WorkflowCanvas = dynamic(
  () => import('@/components/feature/WorkflowCanvas'),
  { ssr: false, loading: () => <div>Loading editor...</div> }
);
```

---

## 6. Zod Schemas (신규)

```typescript
// schemas/webhook.ts
export const webhookCreateSchema = z.object({
  provider: z.enum(['github', 'jira', 'slack', 'custom']),
  event_types: z.array(z.string()),
  target_url: z.string().url(),
  direction: z.enum(['inbound', 'outbound']).default('inbound'),
  secret: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// schemas/workflow.ts
export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'action', 'condition', 'end']),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    actionType: z.enum([
      'run_agent', 'create_pr', 'send_notification', 'run_analysis', 'wait_approval'
    ]).optional(),
    config: z.record(z.unknown()).optional(),
  }),
});

export const workflowCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  definition: z.object({
    nodes: z.array(workflowNodeSchema),
    edges: z.array(z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
      condition: z.string().optional(),
    })),
  }),
  template_id: z.string().optional(),
});

// schemas/jira.ts
export const jiraConfigSchema = z.object({
  api_url: z.string().url(),
  email: z.string().email(),
  api_token: z.string().min(1),
  project_key: z.string().optional(),
});
```

---

## 7. Security Considerations

- [x] Jira API Token: D1 config JSON 내부 저장 (Workers 환경, 접근 제어로 보호)
- [x] Webhook 시그니처 검증: crypto.subtle.HMAC (기존 패턴 재사용)
- [x] Sentry DSN: Workers Secret 관리 (wrangler secret put SENTRY_DSN)
- [x] Workflow condition: 사전 정의 key 매핑만 허용, 임의 코드 실행 차단
- [x] 모든 신규 엔드포인트에 tenantGuard 적용

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | 예상 건수 |
|------|--------|------|:--------:|
| Unit | WebhookRegistryService | Vitest | ~8 |
| Unit | JiraAdapter | Vitest | ~6 |
| Unit | WorkflowEngine | Vitest | ~8 |
| Unit | ProjectOverviewService | Vitest | ~4 |
| Unit | MonitoringService | Vitest | ~4 |
| Integration | webhook-registry routes | Vitest + app.request() | ~6 |
| Integration | workflow routes | Vitest + app.request() | ~6 |
| E2E | Projects overview page | Playwright | ~2 |
| E2E | Workflow editor page | Playwright | ~3 |

**총 신규 테스트: ~47건** (API ~42 + E2E ~5)

### 8.2 Test Cases (Key)

- [ ] WebhookRegistry: 등록 → 시그니처 검증 → 이벤트 라우팅 성공
- [ ] WebhookRegistry: 아웃바운드 실패 → 3회 재시도 → dead_letter 기록
- [ ] JiraAdapter: API Token 인증 → 이슈 생성 → 상태 전환
- [ ] JiraSyncService: Jira Issue 변경 → Spec F-item 동기화
- [ ] WorkflowEngine: 정의 생성 → 실행 → 노드 순차 처리 → 완료
- [ ] WorkflowEngine: condition 분기 → true/false 경로 분리 실행
- [ ] ProjectOverview: 3개 프로젝트 건강도 집계 정확성
- [ ] Monitoring: KV 캐시 히트/미스 동작

---

## 9. Implementation Order

### Phase A: 기반 (F98 + F100)

| # | 작업 | 파일 |
|---|------|------|
| 1 | project-overview 서비스 | services/project-overview.ts |
| 2 | project-overview 라우트 (3 ep) | routes/project-overview.ts |
| 3 | ProjectOverviewPage UI | web/(app)/projects/page.tsx |
| 4 | monitoring 서비스 + Sentry 미들웨어 | services/monitoring.ts, app.ts |
| 5 | health/detailed 라우트 | routes/health.ts 확장 |
| 6 | MonitorPanel UI | web/components/feature/MonitorPanel.tsx |

### Phase B: 외부 연동 (F99)

| # | 작업 | 파일 |
|---|------|------|
| 7 | D1 migration 0016 | db/migrations/0016_sprint24_webhook_workflow.sql |
| 8 | webhook-registry 서비스 | services/webhook-registry.ts |
| 9 | 기존 webhook.ts 리팩토링 | routes/webhook.ts |
| 10 | webhook-registry 라우트 (5 ep) | routes/webhook-registry.ts |
| 11 | jira-adapter 서비스 | services/jira-adapter.ts |
| 12 | jira-sync 서비스 | services/jira-sync.ts |
| 13 | jira 라우트 (4 ep) | org.ts 확장 또는 routes/jira.ts |
| 14 | Jira 설정 UI | web/(app)/settings/jira/page.tsx |

### Phase C: 워크플로우 (F101)

| # | 작업 | 파일 |
|---|------|------|
| 15 | workflow-engine 서비스 | services/workflow-engine.ts |
| 16 | workflow 라우트 (6 ep) | routes/workflow.ts |
| 17 | Zod 스키마 (webhook + workflow + jira) | schemas/ |
| 18 | pnpm add @xyflow/react --filter web | package.json |
| 19 | WorkflowCanvas (React Flow 래퍼) | web/components/feature/WorkflowCanvas.tsx |
| 20 | WorkflowListPage + EditorPage | web/(app)/workflows/ |
| 21 | 워크플로우 템플릿 3종 | services/workflow-engine.ts |

### Phase D: 통합 + 배포

| # | 작업 | 파일 |
|---|------|------|
| 22 | API 테스트 (~42건) | __tests__/ |
| 23 | E2E 테스트 (~5건) | web/e2e/ |
| 24 | typecheck + lint 수정 | 전체 |
| 25 | Workers 배포 + D1 migration remote | wrangler |
| 26 | PDCA 갭 분석 | /pdca analyze sprint-24 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-20 | Initial draft — F98~F101 상세 설계 | Sinclair Seo |
