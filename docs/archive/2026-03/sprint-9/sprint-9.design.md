---
code: FX-DSGN-009
title: Sprint 9 (v0.9.0) — 프로덕션 배포 + E2E + 에이전트 오케스트레이션 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.9.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 9 Design Document

> **Summary**: Sprint 8 서비스 레이어(9개) 위에 프로덕션 배포를 완성하고, Playwright E2E로 크리티컬 패스를 자동 검증하며, 에이전트 Capability/Constraint를 실 데이터로 전환하고 브랜치 기반 격리를 구현하는 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 0.9.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [sprint-9.plan.md](../../01-plan/features/sprint-9.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **프로덕션 배포 완성 (F48)**: Workers + Pages CI/CD 파이프라인, D1 remote migration, secrets 설정, 배포 Runbook
2. **E2E 크리티컬 패스 (F49)**: Playwright 인프라 + 5개 사용자 시나리오 + 4개 API 통합 테스트
3. **에이전트 오케스트레이션 기초 (F50)**: D1 3 테이블 추가, Capability/Constraint 실 정의, 브랜치 기반 작업 흐름
4. **옵저버빌리티 (F51)**: 상세 health check, 구조화 로깅, smoke test

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | 문제 | Sprint 9 변경 |
|------|----------|------|--------------|
| `.github/workflows/deploy.yml` | API deploy만 존재 | Pages deploy job 제거 상태 | Pages job 복원 + post-deploy smoke test |
| `routes/agent.ts` | MOCK_AGENTS 하드코딩, `capabilities: []` 빈 반환 | 실 Capability/Constraint 없음 | D1 JOIN으로 실데이터 반환 + 4 endpoints 추가 |
| `routes/health.ts` | HealthCalculator → mock fallback | 인프라 상태 미포함 | D1/KV/GitHub 상태 포함 상세 health check |
| `shared/agent.ts` | 기본 인터페이스만 | orchestration 타입 부족 | CapabilityDefinition, ConstraintRule, AgentTask 추가 |
| `db/schema.ts` | 6 테이블 | capability/constraint/task 테이블 없음 | 3 테이블 추가 (0004 migration) |
| E2E | 없음 | Playwright/Cypress 미설정 | playwright.config.ts + e2e/ 디렉토리 |

### 1.3 환경 변경

```typescript
// packages/api/src/env.ts — Sprint 9 변경 없음 (기존 바인딩 활용)
// Workers secrets만 프로덕션에 설정:
// - JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY
```

---

## 2. F48: 프로덕션 배포 파이프라인 완성

### 2.1 deploy.yml 변경

```yaml
# .github/workflows/deploy.yml — Pages job 추가
name: Deploy to Cloudflare
on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck lint test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/api

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - run: pnpm --filter @foundry-x/web build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/web
          command: pages deploy out --project-name=foundry-x-web

  smoke-test:
    needs: [deploy-api, deploy-web]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: bash scripts/smoke-test.sh
        env:
          API_URL: https://foundry-x-api.ktds-axbd.workers.dev
          WEB_URL: https://fx.minu.best
```

### 2.2 Smoke Test 스크립트

```bash
#!/usr/bin/env bash
# scripts/smoke-test.sh — 배포 후 자동 검증
set -euo pipefail

API_URL="${API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
WEB_URL="${WEB_URL:-https://fx.minu.best}"
PASS=0
FAIL=0

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "✅ $name"
    ((PASS++))
  else
    echo "❌ $name"
    ((FAIL++))
  fi
}

echo "🔥 Smoke Test — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "─────────────────────────────────"

check "API /health"         "curl -sf '$API_URL/health'"
check "API /api/requirements" "curl -sf '$API_URL/api/requirements'"
check "Web landing"          "curl -sf '$WEB_URL' | grep -q 'Foundry-X'"
check "Web dashboard"        "curl -sf '$WEB_URL/dashboard'"

echo "─────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
```

### 2.3 배포 Runbook 구조

`docs/guides/deployment-runbook.md`:

| 섹션 | 내용 |
|------|------|
| 1. 사전 조건 | Cloudflare 계정, API Token 권한 (Workers+Pages+D1+KV) |
| 2. Secrets 설정 | `wrangler secret put` 4개 (JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY) |
| 3. D1 Migration | `wrangler d1 migrations apply foundry-x-db --remote` |
| 4. 배포 순서 | D1 → Workers → Pages (순차) |
| 5. 검증 | smoke-test.sh 실행 |
| 6. 롤백 | `wrangler rollback` (Workers), Pages 이전 빌드 선택 |
| 7. 트러블슈팅 | 토큰 권한, KV 미연결, D1 drift 등 |

### 2.4 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `.github/workflows/deploy.yml` | 수정 | deploy-web + smoke-test job 추가 |
| `scripts/smoke-test.sh` | 신규 | 배포 후 검증 스크립트 |
| `docs/guides/deployment-runbook.md` | 신규 | 배포 가이드 |

---

## 3. F49: E2E 테스트 인프라 + 크리티컬 패스

### 3.1 Playwright 설정

```typescript
// packages/web/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

### 3.2 E2E 디렉토리 구조

```
packages/web/
├── e2e/
│   ├── fixtures/
│   │   └── auth.ts          # 로그인 fixture (재사용)
│   ├── landing.spec.ts       # E1: 랜딩 페이지 렌더링
│   ├── auth-flow.spec.ts     # E1: 로그인 → JWT 발급
│   ├── dashboard.spec.ts     # E2: 대시보드 진입 + 사이드바
│   ├── agents.spec.ts        # E3: 에이전트 목록 + SSE
│   └── spec-generator.spec.ts # E4: NL→Spec 입력→결과
├── playwright.config.ts
└── package.json              # scripts.e2e 추가
```

### 3.3 E2E 시나리오 상세

#### E1: 랜딩 → 로그인

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("landing page renders hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Foundry-X/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started/i })).toBeVisible();
  });

  test("login form submits and redirects to dashboard", async ({ page }) => {
    await page.goto("/login");  // 또는 모달
    await page.fill("[name=email]", "test@example.com");
    await page.fill("[name=password]", "password123");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

#### E2: 대시보드

```typescript
// e2e/dashboard.spec.ts
test("dashboard shows sidebar navigation", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/dashboard");
  const sidebar = authenticatedPage.getByRole("navigation");
  await expect(sidebar.getByText("Dashboard")).toBeVisible();
  await expect(sidebar.getByText("Agents")).toBeVisible();
  await expect(sidebar.getByText("Spec Generator")).toBeVisible();
});
```

#### E3: 에이전트 목록

```typescript
// e2e/agents.spec.ts
test("agents page shows agent cards", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/agents");
  await expect(authenticatedPage.getByText("Agent Transparency")).toBeVisible();
  // Wait for API response (mock or real)
  const cards = authenticatedPage.locator("[data-testid=agent-card]");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
});
```

#### E4: Spec Generator

```typescript
// e2e/spec-generator.spec.ts
test("spec generator produces output from input", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/spec-generator");
  const input = authenticatedPage.getByRole("textbox");
  await input.fill("사용자 인증 기능을 추가해주세요");
  await authenticatedPage.click("button:has-text('Generate')");
  // Wait for LLM response (may need increased timeout)
  await expect(authenticatedPage.getByTestId("spec-output")).toBeVisible({ timeout: 30000 });
});
```

### 3.4 Auth Fixture

```typescript
// e2e/fixtures/auth.ts
import { test as base, type Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // API를 통해 JWT 획득 후 localStorage에 저장
    const response = await page.request.post("/api/auth/login", {
      data: { email: "test@example.com", password: "password123" },
    });
    const { token } = await response.json();

    await page.goto("/");
    await page.evaluate((t) => localStorage.setItem("token", t), token);

    await use(page);
  },
});
```

### 3.5 API 통합 테스트

```
packages/api/src/__tests__/integration/
├── auth-profile.test.ts    # I1: register → login → profile
├── wiki-git.test.ts        # I2: wiki create → git sync trigger
├── spec-generate.test.ts   # I3: NL input → LLM → result
└── agent-sse.test.ts       # I4: session insert → SSE event
```

#### I1: Auth → Profile 통합

```typescript
// packages/api/src/__tests__/integration/auth-profile.test.ts
import { describe, test, expect, beforeAll } from "vitest";
import { createTestApp } from "../helpers/test-app.js";

describe("Auth → Profile Integration", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(() => {
    app = createTestApp(); // MockD1 + app 인스턴스
  });

  test("register → login → get profile", async () => {
    // 1. Register
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "integration@test.com", password: "pass123", name: "Tester" }),
    });
    expect(regRes.status).toBe(201);

    // 2. Login
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "integration@test.com", password: "pass123" }),
    });
    expect(loginRes.status).toBe(200);
    const { token } = await loginRes.json();
    expect(token).toBeDefined();

    // 3. Get Profile
    const profileRes = await app.request("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profileRes.status).toBe(200);
    const profile = await profileRes.json();
    expect(profile.email).toBe("integration@test.com");
  });
});
```

### 3.6 E2E CI 워크플로우

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    branches: [master]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - run: npx playwright install --with-deps chromium
      - run: pnpm --filter @foundry-x/web e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: packages/web/playwright-report/
```

### 3.7 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/web/playwright.config.ts` | 신규 | Playwright 설정 |
| `packages/web/e2e/fixtures/auth.ts` | 신규 | 인증 fixture |
| `packages/web/e2e/landing.spec.ts` | 신규 | 랜딩 E2E |
| `packages/web/e2e/auth-flow.spec.ts` | 신규 | 로그인 E2E |
| `packages/web/e2e/dashboard.spec.ts` | 신규 | 대시보드 E2E |
| `packages/web/e2e/agents.spec.ts` | 신규 | 에이전트 E2E |
| `packages/web/e2e/spec-generator.spec.ts` | 신규 | Spec Generator E2E |
| `packages/api/src/__tests__/integration/auth-profile.test.ts` | 신규 | Auth→Profile 통합 |
| `packages/api/src/__tests__/integration/wiki-git.test.ts` | 신규 | Wiki→Git 통합 |
| `packages/api/src/__tests__/integration/spec-generate.test.ts` | 신규 | NL→Spec 통합 |
| `packages/api/src/__tests__/integration/agent-sse.test.ts` | 신규 | Agent→SSE 통합 |
| `.github/workflows/e2e.yml` | 신규 | E2E CI 워크플로우 |
| `packages/web/package.json` | 수정 | devDependencies + e2e script |

---

## 4. F50: 에이전트 오케스트레이션 기초

### 4.1 타입 확장 (`packages/shared/src/agent.ts`)

```typescript
// ─── Sprint 9: Orchestration Types ───

/** F50: 에이전트 Capability 상세 정의 */
export interface AgentCapabilityDefinition {
  id: string;
  agentId: string;
  name: string;
  description: string;
  tools: string[];
  allowedPaths: string[];     // glob 패턴: ["packages/api/**", "docs/**"]
  maxConcurrency: number;     // 동시 작업 수 제한
}

/** F50: Constraint 강제 규칙 */
export interface AgentConstraintRule {
  id: string;
  tier: 'always' | 'ask' | 'never';
  action: string;             // "push-to-main", "add-dependency", "delete-test" 등
  description: string;
  enforcementMode: 'block' | 'warn' | 'log';
}

/** F50: Constraint 검증 요청/결과 */
export interface ConstraintCheckRequest {
  agentId: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface ConstraintCheckResult {
  allowed: boolean;
  tier: 'always' | 'ask' | 'never';
  rule: AgentConstraintRule;
  reason: string;
}

/** F50: 에이전트 브랜치 기반 작업 */
export interface AgentTask {
  id: string;
  agentSessionId: string;
  branch: string;             // "feature/{agent-name}/{task-id}"
  prNumber?: number;
  prStatus: 'draft' | 'open' | 'merged' | 'closed';
  sddVerified: boolean;       // lint + typecheck + test 통과 여부
  createdAt: string;
  updatedAt: string;
}

/** F50: 에이전트 등록 정보 (D1 저장용) */
export interface AgentRegistration {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}
```

### 4.2 D1 마이그레이션 (`0004_agent_orchestration.sql`)

```sql
-- 0004_agent_orchestration.sql
-- Sprint 9: 에이전트 오케스트레이션 기초 테이블

-- 에이전트 등록 (기존 mock 대체)
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 에이전트 Capability 정의
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tools TEXT NOT NULL DEFAULT '[]',       -- JSON array
  allowed_paths TEXT NOT NULL DEFAULT '[]', -- JSON array of glob patterns
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent
  ON agent_capabilities(agent_id);

-- 3-tier Constraint 규칙
CREATE TABLE IF NOT EXISTS agent_constraints (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK(tier IN ('always', 'ask', 'never')),
  action TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enforcement_mode TEXT NOT NULL DEFAULT 'block'
    CHECK(enforcement_mode IN ('block', 'warn', 'log'))
);

-- 에이전트 브랜치 기반 작업
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  agent_session_id TEXT NOT NULL REFERENCES agent_sessions(id),
  branch TEXT NOT NULL,
  pr_number INTEGER,
  pr_status TEXT NOT NULL DEFAULT 'draft'
    CHECK(pr_status IN ('draft', 'open', 'merged', 'closed')),
  sdd_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_session
  ON agent_tasks(agent_session_id);

-- Seed: 기본 Constraint 규칙 (PRD §7.2-C 기반)
INSERT OR IGNORE INTO agent_constraints (id, tier, action, description, enforcement_mode)
VALUES
  ('c-always-read-specs',  'always', 'read-specs',      'Read spec files',           'log'),
  ('c-always-run-test',    'always', 'run-test',        'Execute test suite',        'log'),
  ('c-always-run-lint',    'always', 'run-lint',        'Execute linter',            'log'),
  ('c-always-create-branch','always','create-branch',   'Create feature branch',     'log'),
  ('c-ask-add-dep',        'ask',    'add-dependency',   'Add package dependency',    'block'),
  ('c-ask-schema-change',  'ask',    'schema-change',    'Modify DB schema',          'block'),
  ('c-ask-external-api',   'ask',    'external-api-call','Call external API',         'warn'),
  ('c-ask-delete-test',    'ask',    'delete-test',      'Delete or skip test',       'block'),
  ('c-never-push-main',    'never',  'push-to-main',     'Direct push to main/master','block'),
  ('c-never-no-verify',    'never',  'no-verify',        'Skip git hooks',            'block'),
  ('c-never-commit-secret','never',  'commit-secret',    'Commit credentials/secrets','block');
```

### 4.3 Drizzle 스키마 확장 (`packages/api/src/db/schema.ts`)

```typescript
// ── Agents (Sprint 9) ─────────────────────────
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
});

// ── Agent Capabilities (Sprint 9) ─────────────
export const agentCapabilities = sqliteTable("agent_capabilities", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  tools: text("tools").notNull().default("[]"),
  allowedPaths: text("allowed_paths").notNull().default("[]"),
  maxConcurrency: integer("max_concurrency").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

// ── Agent Constraints (Sprint 9) ──────────────
export const agentConstraints = sqliteTable("agent_constraints", {
  id: text("id").primaryKey(),
  tier: text("tier", { enum: ["always", "ask", "never"] }).notNull(),
  action: text("action").notNull().unique(),
  description: text("description").notNull(),
  enforcementMode: text("enforcement_mode", { enum: ["block", "warn", "log"] })
    .notNull()
    .default("block"),
});

// ── Agent Tasks (Sprint 9) ────────────────────
export const agentTasks = sqliteTable("agent_tasks", {
  id: text("id").primaryKey(),
  agentSessionId: text("agent_session_id")
    .notNull()
    .references(() => agentSessions.id),
  branch: text("branch").notNull(),
  prNumber: integer("pr_number"),
  prStatus: text("pr_status", { enum: ["draft", "open", "merged", "closed"] })
    .notNull()
    .default("draft"),
  sddVerified: integer("sdd_verified").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

### 4.4 AgentOrchestrator 서비스

```typescript
// packages/api/src/services/agent-orchestrator.ts
import type { D1Database } from "@cloudflare/workers-types";
import type { ConstraintCheckRequest, ConstraintCheckResult, AgentTask } from "@foundry-x/shared";

export class AgentOrchestrator {
  constructor(private db: D1Database) {}

  /** Constraint 검증 — 에이전트 요청 action이 허용되는지 확인 */
  async checkConstraint(req: ConstraintCheckRequest): Promise<ConstraintCheckResult> {
    const rule = await this.db
      .prepare("SELECT * FROM agent_constraints WHERE action = ?")
      .bind(req.action)
      .first();

    if (!rule) {
      // 규칙 미등록 action → 기본 허용 (warn)
      return {
        allowed: true,
        tier: "always",
        rule: { id: "default", tier: "always", action: req.action, description: "No rule defined", enforcementMode: "log" },
        reason: "No constraint rule found — default allow",
      };
    }

    const tier = rule.tier as "always" | "ask" | "never";
    const allowed = tier !== "never";

    return {
      allowed,
      tier,
      rule: {
        id: rule.id as string,
        tier,
        action: rule.action as string,
        description: rule.description as string,
        enforcementMode: rule.enforcement_mode as "block" | "warn" | "log",
      },
      reason: tier === "never"
        ? `Action "${req.action}" is forbidden: ${rule.description}`
        : tier === "ask"
          ? `Action "${req.action}" requires approval: ${rule.description}`
          : `Action "${req.action}" is allowed`,
    };
  }

  /** 에이전트 목록 (D1, 실데이터) */
  async listAgents() {
    return this.db.prepare("SELECT * FROM agents WHERE status = 'active'").all();
  }

  /** 에이전트 Capability 목록 */
  async getCapabilities(agentId: string) {
    return this.db
      .prepare("SELECT * FROM agent_capabilities WHERE agent_id = ?")
      .bind(agentId)
      .all();
  }

  /** 에이전트 작업 생성 (브랜치 기반) */
  async createTask(agentSessionId: string, branch: string): Promise<AgentTask> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO agent_tasks (id, agent_session_id, branch, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, agentSessionId, branch, now, now)
      .run();

    return { id, agentSessionId, branch, prStatus: "draft", sddVerified: false, createdAt: now, updatedAt: now };
  }

  /** 에이전트 작업 목록 */
  async listTasks(agentId: string) {
    return this.db
      .prepare(
        `SELECT t.* FROM agent_tasks t
         JOIN agent_sessions s ON t.agent_session_id = s.id
         WHERE s.agent_name = ?
         ORDER BY t.created_at DESC`
      )
      .bind(agentId)
      .all();
  }
}
```

### 4.5 Constraint Guard 미들웨어

```typescript
// packages/api/src/middleware/constraint-guard.ts
import type { MiddlewareHandler } from "hono";
import type { Env } from "../env.js";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";

/**
 * 에이전트 요청에 X-Agent-Id + X-Agent-Action 헤더가 있으면
 * Constraint 테이블에서 검증 후 차단/경고/로깅
 */
export const constraintGuard: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const agentId = c.req.header("X-Agent-Id");
  const action = c.req.header("X-Agent-Action");

  if (!agentId || !action) {
    // 에이전트 헤더 없음 → 일반 사용자 요청, 통과
    return next();
  }

  const orchestrator = new AgentOrchestrator(c.env.DB);
  const result = await orchestrator.checkConstraint({ agentId, action });

  // 결과를 헤더에 기록 (로깅/디버깅용)
  c.header("X-Constraint-Tier", result.tier);
  c.header("X-Constraint-Allowed", String(result.allowed));

  if (!result.allowed && result.rule.enforcementMode === "block") {
    return c.json(
      { error: "Constraint violation", tier: result.tier, action, reason: result.reason },
      403,
    );
  }

  return next();
};
```

### 4.6 에이전트 API 확장 (`routes/agent.ts`)

기존 2 endpoints + 신규 4 endpoints:

| Endpoint | Method | Purpose | 신규 여부 |
|----------|--------|---------|:--------:|
| `/agents` | GET | 에이전트 목록 (D1 실데이터 우선) | 수정 |
| `/agents/stream` | GET | SSE 스트림 | 기존 |
| `/agents/capabilities` | GET | 전체 Capability 목록 | ✅ 신규 |
| `/agents/:id/tasks` | GET | 에이전트 작업 목록 | ✅ 신규 |
| `/agents/:id/tasks` | POST | 에이전트 작업 생성 | ✅ 신규 |
| `/agents/constraints/check` | POST | Constraint 검증 | ✅ 신규 |

#### GET /agents 수정

```typescript
// 기존: sessions 없으면 MOCK_AGENTS 반환
// 변경: agents 테이블 → capabilities JOIN → constraints 전체 → activity from sessions
agentRoute.openapi(getAgents, async (c) => {
  const orchestrator = new AgentOrchestrator(c.env.DB);

  try {
    const agentsResult = await orchestrator.listAgents();
    if (!agentsResult.results?.length) {
      return c.json(MOCK_AGENTS); // D1 비어있으면 mock fallback 유지
    }

    const profiles = await Promise.all(
      agentsResult.results.map(async (agent) => {
        const caps = await orchestrator.getCapabilities(agent.id as string);
        // ... sessions에서 latest activity 가져오기
        return { id, name, capabilities, constraints, activity };
      })
    );
    return c.json(profiles);
  } catch {
    return c.json(MOCK_AGENTS);
  }
});
```

#### POST /agents/constraints/check

```typescript
const checkConstraint = createRoute({
  method: "post",
  path: "/agents/constraints/check",
  tags: ["Agents"],
  summary: "Check if agent action is allowed by constraints",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            agentId: z.string(),
            action: z.string(),
            context: z.record(z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            allowed: z.boolean(),
            tier: z.enum(["always", "ask", "never"]),
            reason: z.string(),
          }),
        },
      },
      description: "Constraint check result",
    },
  },
});
```

### 4.7 웹 대시보드 업데이트

`packages/web/src/app/(app)/agents/page.tsx` 변경:
- 빈 capabilities → 실 Capability 카드 표시
- Constraint tier별 색상 배지 (always=green, ask=yellow, never=red)
- 에이전트 tasks 목록 (브랜치 + PR 상태)

### 4.8 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/shared/src/agent.ts` | 수정 | 5 타입 추가 |
| `packages/api/src/db/migrations/0004_agent_orchestration.sql` | 신규 | 4 테이블 + 11 seed constraints |
| `packages/api/src/db/schema.ts` | 수정 | 4 Drizzle 테이블 추가 |
| `packages/api/src/services/agent-orchestrator.ts` | 신규 | 오케스트레이션 서비스 |
| `packages/api/src/middleware/constraint-guard.ts` | 신규 | Constraint 강제 미들웨어 |
| `packages/api/src/routes/agent.ts` | 수정 | GET /agents 변경 + 4 endpoints 추가 |
| `packages/api/src/schemas/agent.ts` | 수정 | Zod 스키마 확장 |
| `packages/web/src/app/(app)/agents/page.tsx` | 수정 | 실 Capability/Constraint 표시 |

---

## 5. F51: 옵저버빌리티 + 배포 후 검증

### 5.1 상세 Health Check

```typescript
// packages/api/src/routes/health.ts — 확장
interface DetailedHealth {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime?: number;
  checks: {
    d1: { status: "ok" | "error"; latency?: number; error?: string };
    kv: { status: "ok" | "error"; latency?: number; error?: string };
    github: { status: "ok" | "error"; rateLimit?: { remaining: number; limit: number } };
  };
}

healthRoute.openapi(getHealth, async (c) => {
  const checks: DetailedHealth["checks"] = {
    d1: { status: "ok" },
    kv: { status: "ok" },
    github: { status: "ok" },
  };

  // D1 check
  try {
    const start = Date.now();
    await c.env.DB.prepare("SELECT 1").first();
    checks.d1.latency = Date.now() - start;
  } catch (e) {
    checks.d1 = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  // KV check
  try {
    const start = Date.now();
    await c.env.CACHE.get("__health_check__");
    checks.kv.latency = Date.now() - start;
  } catch (e) {
    checks.kv = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  // GitHub check
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const rateLimit = await github.getRateLimit();
    checks.github.rateLimit = rateLimit;
  } catch (e) {
    checks.github = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  const hasError = Object.values(checks).some((c) => c.status === "error");
  const status: DetailedHealth["status"] = hasError ? "degraded" : "ok";

  return c.json({ status, version: "0.9.0", checks });
});
```

### 5.2 구조화 로깅

```typescript
// packages/api/src/services/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export class Logger {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("error", message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };
    // Workers 환경: console.log → Cloudflare Workers Logs로 전달
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      JSON.stringify(entry)
    );
  }
}
```

### 5.3 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/api/src/routes/health.ts` | 수정 | D1/KV/GitHub 상세 체크 |
| `packages/api/src/services/logger.ts` | 신규 | 구조화 로깅 |
| `packages/api/src/schemas/health.ts` | 수정 | DetailedHealth Zod 스키마 |

---

## 6. 테스트 전략

### 6.1 테스트 추가 예상

| 카테고리 | 파일 | 테스트 수 |
|---------|------|:--------:|
| E2E (Playwright) | e2e/*.spec.ts × 5 | ~12 |
| API 통합 | integration/*.test.ts × 4 | ~12 |
| AgentOrchestrator 단위 | services/agent-orchestrator.test.ts | ~8 |
| Constraint Guard | middleware/constraint-guard.test.ts | ~5 |
| Logger | services/logger.test.ts | ~3 |
| Health (확장) | simple-routes.test.ts 추가 | ~3 |
| **합계** | | **~43** |

**Sprint 9 완료 후 예상**: 216 (기존) + ~43 = **~259 tests**

### 6.2 Mock 전략

| 대상 | Mock 방식 |
|------|----------|
| D1 | better-sqlite3 MockD1Database (기존 패턴) |
| KV | 인메모리 Map 기반 MockKVNamespace |
| GitHub API | fetch mock (기존 패턴) |
| Playwright | Next.js dev server + API mock (MSW 또는 route handler) |

---

## 7. 구현 순서 + Agent Teams 위임

### 7.1 Phase 순서

```
Phase A: 프로덕션 배포 (F48) — Day 1 ★ Leader 직접
  A1. Workers secrets 설정 (wrangler CLI)
  A2. D1 migrations apply --remote
  A3. deploy.yml Pages job 복원
  A4. smoke-test.sh 작성 + CI 통합
  A5. 배포 검증 + Runbook 작성

Phase B: E2E + 통합 테스트 (F49) — Day 1~2 ★ W1 위임 가능
  B1. Playwright 설치 + config
  B2. Auth fixture + 5 E2E 시나리오
  B3. API 통합 테스트 4개
  B4. e2e.yml CI 워크플로우

Phase C: 에이전트 오케스트레이션 (F50) — Day 2 ★ W2 위임 가능
  C1. shared/agent.ts 타입 확장
  C2. 0004 D1 마이그레이션 + schema.ts
  C3. AgentOrchestrator 서비스
  C4. Constraint Guard 미들웨어
  C5. agent.ts 4 endpoints 추가
  C6. Zod 스키마 확장
  C7. 단위 테스트 (~13)

Phase D: 옵저버빌리티 (F51) — Day 2 ★ Leader 직접
  D1. health.ts 상세 체크
  D2. logger.ts 구조화 로깅
  D3. health Zod 스키마 갱신
```

### 7.2 Agent Teams 위임 전략

| Worker | Phase | 범위 | 금지 파일 |
|--------|-------|------|----------|
| **W1** | B (E2E) | `packages/web/playwright.config.ts`, `packages/web/e2e/`, `.github/workflows/e2e.yml`, `packages/web/package.json` (devDeps만) | `packages/api/src/`, `packages/cli/`, `SPEC.md`, `CLAUDE.md`, `packages/shared/` |
| **W2** | C (오케스트레이션) | `packages/api/src/services/agent-orchestrator.ts`, `packages/api/src/middleware/constraint-guard.ts`, `packages/api/src/routes/agent.ts`, `packages/api/src/db/migrations/0004*`, `packages/api/src/db/schema.ts`, `packages/api/src/schemas/agent.ts`, `packages/api/src/__tests__/` | `packages/web/`, `packages/cli/`, `SPEC.md`, `CLAUDE.md` |
| **Leader** | A (배포) + D (옵저버빌리티) | deploy.yml, scripts/, docs/guides/, health.ts, logger.ts, `packages/shared/src/agent.ts` | — |

> **주의**: `packages/shared/src/agent.ts`는 Leader만 수정. W2는 이 파일 수정 금지 — Leader가 먼저 타입을 확정한 후 W2에 공유.

---

## 8. 리스크 대응 상세

| # | 리스크 | 대응 설계 |
|---|--------|----------|
| R1 | Pages deploy 토큰 | `cloudflare/wrangler-action@v3`의 `command: pages deploy` 사용. 토큰에 Pages 권한 확인 필수 |
| R2 | E2E flaky | `retries: 2` + `screenshot: only-on-failure` + 아티팩트 업로드 |
| R3 | Constraint 호환성 | 초기 seed에 `enforcement_mode: 'log'`(always) / `'block'`(ask/never). 안전하게 시작 |
| R4 | F50 범위 | 실제 에이전트 실행(Claude Code 연동)은 Sprint 10. 이번엔 CRUD + check API만 |
| R5 | D1 migration drift | `wrangler d1 migrations list --remote`로 적용 상태 사전 확인 |

---

## 9. 완료 기준 (Success Criteria)

| 항목 | 기준 |
|------|------|
| F48 | Workers `/health` OK + Pages 랜딩 렌더링 + smoke-test.sh 통과 |
| F49 | Playwright 5 시나리오 + API 통합 4 테스트 전부 CI 통과 |
| F50 | agents 테이블 + capabilities JOIN + constraint check API + 단위 테스트 13개 |
| F51 | `/health` D1/KV/GitHub 상태 포함 + logger.ts 동작 |
| 전체 | typecheck ✅, build ✅, ~259 tests ✅, PDCA Match Rate ≥ 90% |
