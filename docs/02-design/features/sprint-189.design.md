---
code: FX-DSGN-S189
title: "Sprint 189 Design — Gate-X 독립 Workers scaffold + Gate 모듈 추출"
version: 1.0
status: Active
category: DSGN
sprint: 189
f-items: [F402, F403]
created: 2026-04-07
updated: 2026-04-07
author: Sinclair + Claude
---

# Sprint 189 Design — Gate-X 독립 Workers scaffold + Gate 모듈 추출

## 1. 전체 구조

```
packages/gate-x/
├── package.json                          # @foundry-x/gate-x
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml                         # gate-x-api Workers
└── src/
    ├── index.ts                          # Workers entry (export default app)
    ├── app.ts                            # Hono app + harness-kit 미들웨어
    ├── env.ts                            # GateEnv (extends HarnessEnv)
    ├── middleware/
    │   └── tenant.ts                     # tenantGuard (harness-kit JWT 기반)
    ├── routes/
    │   ├── index.ts                      # 라우트 집약
    │   ├── ax-bd-evaluations.ts          # 7 endpoints
    │   ├── decisions.ts                  # 5 endpoints
    │   ├── evaluation-report.ts          # 3 endpoints
    │   ├── gate-package.ts               # 5 endpoints
    │   ├── team-reviews.ts               # 4 endpoints
    │   ├── validation-meetings.ts        # 5 endpoints
    │   └── validation-tier.ts            # 3 endpoints
    ├── services/
    │   ├── evaluation-service.ts
    │   ├── evaluation-criteria.ts
    │   ├── evaluation-report-service.ts
    │   ├── decision-service.ts           # 크로스 의존 해소 (어댑터 주입)
    │   ├── gate-package-service.ts
    │   ├── meeting-service.ts
    │   ├── validation-service.ts
    │   └── adapters/
    │       ├── pipeline-adapter.ts       # PipelineService → D1 직접 쿼리
    │       └── notification-adapter.ts   # NotificationService → D1EventBus
    ├── schemas/
    │   ├── decision.schema.ts
    │   ├── evaluation-report.schema.ts
    │   ├── evaluation.schema.ts
    │   ├── gate-package.schema.ts
    │   ├── team-review-schema.ts
    │   └── validation.schema.ts
    ├── types/
    │   └── agent-execution.ts            # AgentExecution 타입 로컬 복사 (core 의존 제거)
    └── db/
        └── migrations/
            └── 0001_initial.sql          # Gate-X 전용 D1 테이블 9개
```

## 2. package.json

```json
{
  "name": "@foundry-x/gate-x",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@foundry-x/harness-kit": "workspace:*",
    "@hono/zod-openapi": "^0.18.0",
    "hono": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  }
}
```

## 3. wrangler.toml

```toml
name = "gate-x-api"
account_id = "b6c06059b413892a92f150e5ca496236"
main = "src/index.ts"
compatibility_date = "2026-03-17"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "gate-x-db"
database_id = "TBD"
migrations_dir = "src/db/migrations"

[vars]
ENVIRONMENT = "production"
```

## 4. 크로스 모듈 의존 해소 전략

| 원래 의존 | 해소 방법 |
|----------|----------|
| `KpiService` (portal) | `ax-bd-evaluations.ts` KPI CRUD를 gate-x `evaluation.schema` 내 kpi 타입 + `evaluation-service` 확장 |
| `PipelineService` (launch) | `pipeline-adapter.ts` — D1 `pipeline_stages` 직접 쿼리 (Gate-X DB에 테이블 포함) |
| `NotificationService` (portal) | `notification-adapter.ts` — `D1EventBus.publish("decision.made", ...)` 이벤트 발행 |
| `AgentExecutionRequest/Result` (core) | `types/agent-execution.ts` 로컬 복사 (동일 타입, 단순 interface) |

### PipelineAdapter (핵심)
```typescript
// gate-x/src/services/adapters/pipeline-adapter.ts
export class PipelineAdapter {
  constructor(private db: D1Database) {}

  async getCurrentStage(bizItemId: string) {
    return this.db.prepare(
      `SELECT stage FROM pipeline_stages WHERE biz_item_id = ? AND exited_at IS NULL ORDER BY entered_at DESC LIMIT 1`
    ).bind(bizItemId).first<{ stage: string }>();
  }

  async advanceStage(bizItemId: string, orgId: string, stage: string, userId: string, reason: string) {
    const now = "datetime('now')";
    await this.db.prepare(
      `UPDATE pipeline_stages SET exited_at = ${now} WHERE biz_item_id = ? AND exited_at IS NULL`
    ).bind(bizItemId).run();
    await this.db.prepare(
      `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by, entered_at, reason) VALUES (?,?,?,?,?,${now},?)`
    ).bind(crypto.randomUUID(), bizItemId, orgId, stage, userId, reason).run();
  }
}
```

### NotificationAdapter (핵심)
```typescript
// gate-x/src/services/adapters/notification-adapter.ts
import { D1EventBus } from "@foundry-x/harness-kit/events";
export class NotificationAdapter {
  private bus: D1EventBus;
  constructor(db: D1Database) { this.bus = new D1EventBus(db); }

  async notify(params: { orgId: string; recipientId: string; type: string; bizItemId: string; title: string; body: string; actorId: string; }) {
    await this.bus.publish({ type: "notification.requested", payload: params, source: "gate-x" });
  }
}
```

## 5. D1 마이그레이션 (0001_initial.sql)

Gate-X 전용 테이블 9개:
- `ax_evaluations` — 평가 (핵심)
- `ax_evaluation_history` — 평가 이력
- `decisions` — Go/Hold/Drop 의사결정
- `gate_packages` — 게이트 패키지
- `evaluation_reports` — 평가 리포트
- `expert_meetings` — 전문가 미팅
- `validation_history` — 검증 이력
- `ax_team_reviews` — 팀 리뷰
- `pipeline_stages` — 단계 추적 (biz_items stub 포함)
- `biz_items` — Decision용 최소 참조 테이블

## 6. Worker 매핑 (구현 병렬화)

| Worker | 담당 | 파일 |
|--------|------|------|
| W1 | scaffold + app/env/index + D1 migration | package.json, tsconfig.json, wrangler.toml, vitest.config.ts, src/index.ts, src/app.ts, src/env.ts, src/middleware/tenant.ts, src/db/migrations/0001_initial.sql |
| W2 | schemas + adapters | src/schemas/*(6파일), src/services/adapters/*(2파일), src/types/agent-execution.ts |
| W3 | services | src/services/*(7파일) |
| W4 | routes + tests | src/routes/*(8파일), src/routes/index.ts, src/test/*.test.ts |

## 7. app.ts 설계

```typescript
// harness-kit 미들웨어 체인:
// CORS → Auth(JWT) → tenantGuard → routes
const config: HarnessConfig = {
  serviceName: "gate-x",
  serviceId: "gate-x",
  corsOrigins: ["https://fx.minu.best", "http://localhost:3000"],
  publicPaths: ["/api/health"],
};
app.use("*", createCorsMiddleware(config));
app.use("/api/*", createAuthMiddleware(config));
app.use("/api/*", tenantGuard);
```

## 8. 성공 기준 ↔ 구현 매핑

| 성공 기준 | 구현 위치 |
|----------|----------|
| packages/gate-x/ 독립 패키지 존재 | §1 전체 구조 |
| pnpm typecheck 성공 | tsconfig.json + strict |
| D1 마이그레이션 SQL 파일 생성 | src/db/migrations/0001_initial.sql |
| 7 routes + 7 services + 6 schemas | §1 구조 |
| health check (GET /api/health) | app.ts health endpoint |
| 크로스 모듈 import 0개 | §4 해소 전략 |
| 단위 테스트 통과 | src/test/*.test.ts |
