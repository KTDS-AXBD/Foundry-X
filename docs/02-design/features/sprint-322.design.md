---
id: FX-DESIGN-322
title: Sprint 322 Design — F575 fx-agent 완전 분리
sprint: 322
feature: F575
req: FX-REQ-639
status: active
created: 2026-05-02
---

# Sprint 322 Design — F575 fx-agent 완전 분리

## §1 목표 아키텍처

```
[Web] → [fx-gateway]
           ├── /api/agents/*   → [fx-agent] ← F571(8 routes) + F575(7 routes)
           ├── /api/skills/*   → [fx-agent] ← F575 NEW
           ├── /api/telemetry/*→ [fx-agent] ← F575 NEW
           ├── /api/plan*      → [fx-agent] ← F575 NEW
           ├── /api/worktrees  → [fx-agent] ← F575 NEW
           ├── /api/task-states/*→ [fx-agent] ← F571 existing
           ├── /api/discovery/*→ [fx-discovery]
           ├── /api/shaping/*  → [fx-shaping]
           ├── /api/offerings/*→ [fx-offering]
           └── /api/*          → [MAIN_API]  ← agent routes 제거됨
```

## §2 테스트 계약 (TDD Red Target)

```
packages/fx-agent/src/__tests__/auth-guard-f575.test.ts
```

| 엔드포인트 | 기대 응답 (no auth) |
|-----------|-------------------|
| GET /api/agents | 401 |
| POST /api/agents/run/stream | 401 |
| GET /api/skills/registry | 401 |
| POST /api/skills/metrics/record | 401 |
| GET /api/skills/captured/patterns | 401 |
| GET /api/skills/derived/patterns | 401 |
| GET /api/telemetry/counts | 401 |

## §3 import path 변환 규칙

### Route 파일 (api/core/agent/routes/ → fx-agent/src/routes/)

| api 원본 경로 | fx-agent 경로 |
|-------------|--------------|
| `from "../../../env.js"` (Env type) | `from "../env.js"` (AgentEnv type) |
| `from "../../../middleware/tenant.js"` | `from "../middleware/tenant.js"` |
| `from "../../../db/index.js"` | `from "../db/index.js"` |
| `from "../../../db/schema.js"` | `from "../db/schema.js"` |
| `from "../../../services/*.js"` | `from "../services/*.js"` |
| `from "../../harness/services/*.js"` | `from "../services/*.js"` |
| `from "../../offering/schemas/plan.js"` | `from "../schemas/plan.js"` |
| `from "../../../modules/portal/services/*.js"` | `from "../services/*.js"` |
| `from "../../../modules/gate/services/*.js"` | `from "../services/*.js"` |
| `import type { Env }` | `import type { AgentEnv }` (+ 모든 사용처) |
| `new OpenAPIHono<{ Bindings: Env }>()` | `new OpenAPIHono<{ Bindings: AgentEnv }>()` |

### Service 파일 (api/core/agent/services/ → fx-agent/src/services/)

| api 원본 경로 | fx-agent 경로 |
|-------------|--------------|
| `from "../../../services/*.js"` | `from "./*.js"` (같은 services/ 디렉토리) |
| `from "../../harness/services/*.js"` | `from "./*.js"` |
| `from "../../../modules/portal/services/*.js"` | `from "./*.js"` |
| `from "../../../modules/gate/services/*.js"` | `from "./*.js"` |
| `from "../../offering/schemas/*.js"` | `from "../schemas/*.js"` |
| `from "../../agent/services/*.js"` (in harness services) | `from "./*.js"` |
| `from "../../../env.js"` | `from "../env.js"` |
| `from "../../../db/index.js"` | `from "../db/index.js"` |
| `from "../../../db/schema.js"` | `from "../db/schema.js"` |
| `import type { Env }` → `import type { AgentEnv }` 필요 시 |

### Cross-domain service 파일 (harness/portal/gate → fx-agent/src/services/)

| api 원본 경로 | fx-agent 경로 |
|-------------|--------------|
| `from "../../agent/services/*.js"` | `from "./*.js"` |
| `from "../../../services/*.js"` | `from "./*.js"` |
| `from "../../../core/agent/services/*.js"` (from portal) | `from "./*.js"` |

## §4 신규 디렉토리 구조

```
packages/fx-agent/src/
├── db/                    # NEW: Drizzle DB layer
│   ├── index.ts           # getDb + Database type
│   └── schema.ts          # agentSessions + 관련 테이블
├── streaming/             # NEW: copy from api/core/agent/streaming/
│   ├── agent-stream-handler.ts
│   ├── agent-metrics-service.ts
│   └── index.ts
├── runtime/               # NEW: copy from api/core/agent/runtime/
│   ├── agent-runtime.ts
│   ├── tool-registry.ts
│   ├── token-tracker.ts
│   ├── define-tool.ts
│   ├── agent-spec-loader.ts
│   └── index.ts
├── routes/                # 7개 신규 추가 (기존 8개 포함 총 15개)
│   ├── agent.ts           # F575 NEW
│   ├── streaming.ts       # F575 NEW
│   ├── orchestration.ts   # F575 NEW
│   ├── captured-engine.ts # F575 NEW
│   ├── derived-engine.ts  # F575 NEW
│   ├── skill-registry.ts  # F575 NEW
│   └── skill-metrics.ts   # F575 NEW
├── schemas/               # 6개 신규 추가
│   ├── agent.ts           # F575 NEW
│   ├── orchestration.ts   # F575 NEW
│   ├── captured-engine.ts # F575 NEW
│   ├── derived-engine.ts  # F575 NEW
│   ├── skill-registry.ts  # F575 NEW
│   ├── skill-metrics.ts   # F575 NEW
│   └── plan.ts            # F575 NEW (from offering/schemas)
└── services/              # 43개 신규 추가 (기존 22개 포함 총 65개)
    # From api/core/agent/services/:
    ├── skill-metrics.ts
    ├── skill-registry.ts
    ├── skill-search.ts
    ├── skill-md-generator.ts
    ├── workflow-pattern-extractor.ts
    ├── captured-skill-generator.ts
    ├── captured-review.ts
    ├── derived-skill-generator.ts
    ├── derived-review.ts
    ├── orchestration-loop.ts
    ├── agent-orchestrator.ts
    ├── reviewer-agent.ts
    ├── planner-agent.ts
    ├── planner-prompts.ts
    ├── architect-agent.ts
    ├── architect-prompts.ts
    ├── test-agent.ts
    ├── test-agent-prompts.ts
    ├── security-agent.ts
    ├── security-agent-prompts.ts
    ├── qa-agent.ts
    ├── qa-agent-prompts.ts
    ├── fallback-chain.ts
    ├── prompt-gateway.ts
    ├── agent-feedback-loop.ts
    ├── infra-agent.ts
    ├── infra-agent-prompts.ts
    ├── agent-self-reflection.ts
    ├── ensemble-voting.ts
    ├── agent-marketplace.ts
    ├── mcp-registry.ts
    ├── mcp-runner.ts
    ├── mcp-transport.ts
    ├── mcp-adapter.ts
    ├── mcp-resources.ts
    ├── mcp-sampling.ts
    # From api/services/ (shared):
    ├── sse-manager.ts
    ├── pr-pipeline.ts
    ├── merge-queue.ts
    ├── llm.ts
    ├── worktree-manager.ts
    ├── telemetry-collector.ts
    ├── event-bus.ts
    # From api/core/harness/services/:
    ├── safety-checker.ts
    ├── pattern-extractor.ts
    ├── evaluator-optimizer.ts
    ├── auto-fix.ts
    # From api/modules/portal/services/:
    ├── github.ts
    ├── feedback-loop-context.ts
    # From api/modules/gate/services/:
    └── evaluation-criteria.ts
```

## §5 파일 매핑 (수정/생성 파일 전체)

### 신규 생성 (fx-agent)

| 파일 | 소스 | 비고 |
|------|------|------|
| `packages/fx-agent/src/db/index.ts` | `packages/api/src/db/index.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/db/schema.ts` | `packages/api/src/db/schema.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/streaming/*` (3파일) | `packages/api/src/core/agent/streaming/*` | 경로 fix 없음 |
| `packages/fx-agent/src/runtime/*` (6파일) | `packages/api/src/core/agent/runtime/*` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/agent.ts` | `packages/api/src/core/agent/schemas/agent.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/orchestration.ts` | `packages/api/src/core/agent/schemas/orchestration.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/captured-engine.ts` | `packages/api/src/core/agent/schemas/captured-engine.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/derived-engine.ts` | `packages/api/src/core/agent/schemas/derived-engine.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/skill-registry.ts` | `packages/api/src/core/agent/schemas/skill-registry.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/skill-metrics.ts` | `packages/api/src/core/agent/schemas/skill-metrics.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/schemas/plan.ts` | `packages/api/src/core/offering/schemas/plan.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/services/skill-metrics.ts` | `packages/api/src/core/agent/services/skill-metrics.ts` | import path fix |
| `packages/fx-agent/src/services/skill-registry.ts` | `packages/api/src/core/agent/services/skill-registry.ts` | import path fix |
| `packages/fx-agent/src/services/skill-search.ts` | `packages/api/src/core/agent/services/skill-search.ts` | import path fix |
| `packages/fx-agent/src/services/skill-md-generator.ts` | `packages/api/src/core/agent/services/skill-md-generator.ts` | import path fix |
| `packages/fx-agent/src/services/workflow-pattern-extractor.ts` | `packages/api/src/core/agent/services/workflow-pattern-extractor.ts` | import path fix |
| `packages/fx-agent/src/services/captured-skill-generator.ts` | `packages/api/src/core/agent/services/captured-skill-generator.ts` | import path fix |
| `packages/fx-agent/src/services/captured-review.ts` | `packages/api/src/core/agent/services/captured-review.ts` | import path fix |
| `packages/fx-agent/src/services/derived-skill-generator.ts` | `packages/api/src/core/agent/services/derived-skill-generator.ts` | import path fix |
| `packages/fx-agent/src/services/derived-review.ts` | `packages/api/src/core/agent/services/derived-review.ts` | import path fix |
| `packages/fx-agent/src/services/orchestration-loop.ts` | `packages/api/src/core/agent/services/orchestration-loop.ts` | import path fix |
| `packages/fx-agent/src/services/agent-orchestrator.ts` | `packages/api/src/core/agent/services/agent-orchestrator.ts` | import path fix |
| `packages/fx-agent/src/services/reviewer-agent.ts` | `packages/api/src/core/agent/services/reviewer-agent.ts` | import path fix |
| `packages/fx-agent/src/services/planner-agent.ts` | `packages/api/src/core/agent/services/planner-agent.ts` | import path fix |
| `packages/fx-agent/src/services/planner-prompts.ts` | `packages/api/src/core/agent/services/planner-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/architect-agent.ts` | `packages/api/src/core/agent/services/architect-agent.ts` | import path fix |
| `packages/fx-agent/src/services/architect-prompts.ts` | `packages/api/src/core/agent/services/architect-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/test-agent.ts` | `packages/api/src/core/agent/services/test-agent.ts` | import path fix |
| `packages/fx-agent/src/services/test-agent-prompts.ts` | `packages/api/src/core/agent/services/test-agent-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/security-agent.ts` | `packages/api/src/core/agent/services/security-agent.ts` | import path fix |
| `packages/fx-agent/src/services/security-agent-prompts.ts` | `packages/api/src/core/agent/services/security-agent-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/qa-agent.ts` | `packages/api/src/core/agent/services/qa-agent.ts` | import path fix |
| `packages/fx-agent/src/services/qa-agent-prompts.ts` | `packages/api/src/core/agent/services/qa-agent-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/fallback-chain.ts` | `packages/api/src/core/agent/services/fallback-chain.ts` | import path fix |
| `packages/fx-agent/src/services/prompt-gateway.ts` | `packages/api/src/core/agent/services/prompt-gateway.ts` | import path fix |
| `packages/fx-agent/src/services/agent-feedback-loop.ts` | `packages/api/src/core/agent/services/agent-feedback-loop.ts` | import path fix |
| `packages/fx-agent/src/services/infra-agent.ts` | `packages/api/src/core/agent/services/infra-agent.ts` | import path fix |
| `packages/fx-agent/src/services/infra-agent-prompts.ts` | `packages/api/src/core/agent/services/infra-agent-prompts.ts` | import path fix |
| `packages/fx-agent/src/services/agent-self-reflection.ts` | `packages/api/src/core/agent/services/agent-self-reflection.ts` | import path fix |
| `packages/fx-agent/src/services/ensemble-voting.ts` | `packages/api/src/core/agent/services/ensemble-voting.ts` | import path fix |
| `packages/fx-agent/src/services/agent-marketplace.ts` | `packages/api/src/core/agent/services/agent-marketplace.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-registry.ts` | `packages/api/src/core/agent/services/mcp-registry.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-runner.ts` | `packages/api/src/core/agent/services/mcp-runner.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-transport.ts` | `packages/api/src/core/agent/services/mcp-transport.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-adapter.ts` | `packages/api/src/core/agent/services/mcp-adapter.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-resources.ts` | `packages/api/src/core/agent/services/mcp-resources.ts` | import path fix |
| `packages/fx-agent/src/services/mcp-sampling.ts` | `packages/api/src/core/agent/services/mcp-sampling.ts` | import path fix |
| `packages/fx-agent/src/services/sse-manager.ts` | `packages/api/src/services/sse-manager.ts` | import path fix |
| `packages/fx-agent/src/services/pr-pipeline.ts` | `packages/api/src/services/pr-pipeline.ts` | import path fix |
| `packages/fx-agent/src/services/merge-queue.ts` | `packages/api/src/services/merge-queue.ts` | import path fix |
| `packages/fx-agent/src/services/llm.ts` | `packages/api/src/services/llm.ts` | import path fix |
| `packages/fx-agent/src/services/worktree-manager.ts` | `packages/api/src/services/worktree-manager.ts` | import path fix |
| `packages/fx-agent/src/services/telemetry-collector.ts` | `packages/api/src/services/telemetry-collector.ts` | import path fix |
| `packages/fx-agent/src/services/event-bus.ts` | `packages/api/src/services/event-bus.ts` | import path fix |
| `packages/fx-agent/src/services/safety-checker.ts` | `packages/api/src/core/harness/services/safety-checker.ts` | import path fix |
| `packages/fx-agent/src/services/pattern-extractor.ts` | `packages/api/src/core/harness/services/pattern-extractor.ts` | import path fix |
| `packages/fx-agent/src/services/evaluator-optimizer.ts` | `packages/api/src/core/harness/services/evaluator-optimizer.ts` | import path fix |
| `packages/fx-agent/src/services/auto-fix.ts` | `packages/api/src/core/harness/services/auto-fix.ts` | import path fix |
| `packages/fx-agent/src/services/github.ts` | `packages/api/src/modules/portal/services/github.ts` | 경로 fix 없음 |
| `packages/fx-agent/src/services/feedback-loop-context.ts` | `packages/api/src/modules/portal/services/feedback-loop-context.ts` | import path fix |
| `packages/fx-agent/src/services/evaluation-criteria.ts` | `packages/api/src/modules/gate/services/evaluation-criteria.ts` | import path fix |
| `packages/fx-agent/src/routes/agent.ts` | `packages/api/src/core/agent/routes/agent.ts` | import path fix (복잡) |
| `packages/fx-agent/src/routes/streaming.ts` | `packages/api/src/core/agent/routes/streaming.ts` | import path fix |
| `packages/fx-agent/src/routes/orchestration.ts` | `packages/api/src/core/agent/routes/orchestration.ts` | import path fix |
| `packages/fx-agent/src/routes/captured-engine.ts` | `packages/api/src/core/agent/routes/captured-engine.ts` | import path fix |
| `packages/fx-agent/src/routes/derived-engine.ts` | `packages/api/src/core/agent/routes/derived-engine.ts` | import path fix |
| `packages/fx-agent/src/routes/skill-registry.ts` | `packages/api/src/core/agent/routes/skill-registry.ts` | import path fix |
| `packages/fx-agent/src/routes/skill-metrics.ts` | `packages/api/src/core/agent/routes/skill-metrics.ts` | import path fix |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `packages/fx-agent/src/app.ts` | 7개 신규 route import + registration 추가 |
| `packages/fx-gateway/src/app.ts` | 신규 path prefix → AGENT 라우팅 추가 |
| `packages/api/src/core/agent/index.ts` | 7개 route export 제거 |
| `packages/api/src/app.ts` | 7개 route import/registration 제거 |

## §6 fx-gateway 라우팅 추가 (F575)

```typescript
// F575: agent 잔여 7 routes → fx-agent
app.all("/api/agents", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/agents/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/telemetry/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/skills/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/skills", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/plan", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/plan/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/worktrees", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/routing-rules", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/routing-rules/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
```

**위치**: F571 기존 agent routes 블록 아래, catch-all(`/api/*`) 위쪽.

## §7 fx-agent app.ts 변경

```typescript
// F575: 7개 신규 route 추가
import { agentRoute } from "./routes/agent.js";
import { streamingRoute } from "./routes/streaming.js";
import { orchestrationRoute } from "./routes/orchestration.js";
import { capturedEngineRoute } from "./routes/captured-engine.js";
import { derivedEngineRoute } from "./routes/derived-engine.js";
import { skillRegistryRoute } from "./routes/skill-registry.js";
import { skillMetricsRoute } from "./routes/skill-metrics.js";

// 7 routes (F575)
authenticated.route("/api", agentRoute);
authenticated.route("/api", streamingRoute);
authenticated.route("/api", orchestrationRoute);
authenticated.route("/api", capturedEngineRoute);
authenticated.route("/api", derivedEngineRoute);
authenticated.route("/api", skillRegistryRoute);
authenticated.route("/api", skillMetricsRoute);
```

## §8 D1 체크리스트 (D1~D4)

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트: streaming route 2개 엔드포인트, agent route `/agents` - 모두 Design §5에 명시 | ✅ |
| D2 | 식별자 계약: agentSessions.id, sessionId 포맷 변경 없음 (DB 공유) | ✅ |
| D3 | Breaking change 영향도: api에서 7개 route 제거. 기존 MAIN_API 서빙에서 fx-agent 서빙으로 전환 (투명한 변경) | ✅ |
| D4 | TDD Red: auth-guard-f575.test.ts 7개 route FAIL 확인 필수 | 🔧 |
