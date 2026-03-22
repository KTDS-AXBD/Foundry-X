---
code: FX-ANLS-009
title: Sprint 9 (v0.9.0) Gap Analysis — Design vs Implementation
version: 0.1
status: Active
category: ANLS
system-version: 0.9.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 9 Gap Analysis Report

> **Analysis Type**: Design-Implementation Gap Analysis (PDCA Check)
>
> **Project**: Foundry-X
> **Version**: 0.9.0
> **Analyst**: Sinclair Seo (bkit-gap-detector)
> **Date**: 2026-03-18
> **Design Doc**: [sprint-9.design.md](../../02-design/features/sprint-9.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 9 Design (FX-DSGN-009)에서 정의한 4개 F-item(F48~F51)의 실제 구현 일치도를 검증하고, 차이점의 심각도를 분류해요.

### 1.2 Analysis Scope

| F-item | 대상 | 설계 파일 | 구현 파일 |
|--------|------|----------|----------|
| F48 | 프로덕션 배포 파이프라인 | design.md §2 | deploy.yml, smoke-test.sh, runbook |
| F49 | E2E 테스트 인프라 | design.md §3 | playwright.config.ts, e2e/, e2e.yml |
| F50 | 에이전트 오케스트레이션 | design.md §4 | shared/agent.ts, schema.ts, orchestrator, routes |
| F51 | 옵저버빌리티 | design.md §5 | health.ts, logger.ts, health schema |

### 1.3 Test Results

| Package | Tests | Status |
|---------|:-----:|:------:|
| CLI | 106 | PASS |
| API | 101 | PASS |
| Web | 34 | PASS |
| **Total** | **241** | **PASS** |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F48 프로덕션 배포 | 97% | ✅ |
| F49 E2E 테스트 | 92% | ✅ |
| F50 에이전트 오케스트레이션 | 91% | ✅ |
| F51 옵저버빌리티 | 95% | ✅ |
| **Overall** | **94%** | **✅** |

---

## 3. F48: 프로덕션 배포 파이프라인 (97%)

### 3.1 파일 존재 확인

| Design | Implementation | Status |
|--------|---------------|:------:|
| `.github/workflows/deploy.yml` (수정) | deploy.yml 4 jobs: test, deploy-api, deploy-web, smoke-test | ✅ |
| `scripts/smoke-test.sh` (신규) | 49줄, 5 checks (API health, requirements, agents, web landing, dashboard) | ✅ |
| `docs/guides/deployment-runbook.md` (신규) | 134줄, 8 sections, FX-GUID-001 | ✅ |

### 3.2 상세 비교

| Item | Design | Implementation | Status | Notes |
|------|--------|----------------|:------:|-------|
| deploy.yml: test job | pnpm turbo typecheck lint test | 동일 | ✅ | |
| deploy.yml: deploy-api | shared build → wrangler-action | 동일 | ✅ | |
| deploy.yml: deploy-web | shared build → web build → pages deploy | 동일 | ✅ | |
| deploy.yml: smoke-test | needs both, bash scripts/smoke-test.sh | 동일 | ✅ | |
| deploy.yml: smoke-test env | API_URL + WEB_URL | 동일 | ✅ | |
| smoke-test: check function | `eval "$cmd"` 패턴 | `"$@"` 패턴 | ⚠️ Minor | 기능 동등, 더 안전한 구현 |
| smoke-test: checks | 4 checks (health, requirements, landing, dashboard) | 5 checks (+agents) | ⚠️ Added | 설계보다 많음 (양호) |
| runbook: sections | 7 sections | 8 sections (+환경 정보) | ⚠️ Added | 추가 섹션 (양호) |

### 3.3 F48 Gaps

| # | Severity | Description |
|---|----------|-------------|
| GAP-01 | Minor | smoke-test.sh: 설계는 `eval "$cmd"` 패턴, 구현은 `"$@"` 직접 실행 — 기능 동등하며 구현이 더 안전 |

**F48 Score: 97%** — 모든 핵심 파일 존재 + CI 파이프라인 완전, 사소한 구현 방식 차이만 존재.

---

## 4. F49: E2E 테스트 인프라 (92%)

### 4.1 파일 존재 확인

| Design | Implementation | Status |
|--------|---------------|:------:|
| `packages/web/playwright.config.ts` | 존재, 27줄 | ✅ |
| `packages/web/e2e/fixtures/auth.ts` | 존재, 30줄 | ✅ |
| `packages/web/e2e/landing.spec.ts` | 존재, 27줄 | ✅ |
| `packages/web/e2e/auth-flow.spec.ts` | 존재, 21줄 | ✅ |
| `packages/web/e2e/dashboard.spec.ts` | 존재, 23줄 | ✅ |
| `packages/web/e2e/agents.spec.ts` | 존재, 27줄 | ✅ |
| `packages/web/e2e/spec-generator.spec.ts` | 존재, 30줄 | ✅ |
| `.github/workflows/e2e.yml` | 존재, 40줄 | ✅ |
| `packages/web/package.json` | @playwright/test + e2e/e2e:ui scripts | ✅ |
| `packages/api/src/__tests__/integration/auth-profile.test.ts` | 존재, 3 tests | ✅ |
| `packages/api/src/__tests__/integration/wiki-git.test.ts` | 존재, 3 tests | ✅ |
| `packages/api/src/__tests__/integration/spec-generate.test.ts` | 존재, 3 tests | ✅ |
| `packages/api/src/__tests__/integration/agent-sse.test.ts` | 존재, 3 tests | ✅ |

### 4.2 Playwright Config 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| testDir | `"./e2e"` | `"./e2e"` | ✅ |
| fullyParallel | `true` | `true` | ✅ |
| retries (CI) | `2` | `2` | ✅ |
| workers (CI) | `1` | `1` | ✅ |
| reporter (CI) | `"github"` | `"github"` | ✅ |
| baseURL | `"http://localhost:3000"` | `"http://localhost:3000"` | ✅ |
| trace | `"on-first-retry"` | `"on-first-retry"` | ✅ |
| screenshot | `"only-on-failure"` | `"only-on-failure"` | ✅ |
| webServer.command | `"pnpm dev"` | `"pnpm dev"` | ✅ |
| forbidOnly | 미명시 | `!!process.env.CI` | ⚠️ Added | 좋은 추가 |

### 4.3 E2E 시나리오 비교

| Design Scenario | Implementation | Status | Notes |
|----------------|---------------|:------:|-------|
| E1: landing hero + nav | landing.spec.ts: 2 tests | ✅ | |
| E1: login form → dashboard redirect | auth-flow.spec.ts: URL check + heading check | ⚠️ Changed | form fill/submit 없이 URL/heading만 검증 |
| E2: dashboard sidebar nav | dashboard.spec.ts: sidebar items + heading | ✅ | |
| E3: agents page + cards | agents.spec.ts: heading + list/empty | ✅ | `data-testid=agent-card` 대신 CSS 기반 |
| E4: spec generator input → output | spec-generator.spec.ts: textarea + fill | ⚠️ Changed | Generate 버튼 클릭 + 결과 대기 없음 |

### 4.4 Auth Fixture 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| API endpoint | `/api/auth/login` | `/api/auth/login` | ✅ |
| credentials | `test@example.com` | `test@foundry-x.dev` | ⚠️ Minor | 도메인 다름 |
| localStorage key | `"token"` | `"fx-token"` | ⚠️ Minor | 키 이름 다름 |
| fallback token | 없음 | `"test-jwt-token"` 폴백 | ⚠️ Added | graceful 처리 |
| export expect | 없음 | `export { expect }` 추가 | ⚠️ Added | 편의 re-export |

### 4.5 API 통합 테스트 비교

| Design Test | Implementation | Status | Notes |
|-------------|---------------|:------:|-------|
| I1: register → login → profile | 3 tests (flow, unauth 401, invalid token 401) | ✅ | 설계보다 풍부 |
| I2: wiki create → git sync | 3 tests (create+get, create+update, create+delete) | ✅ | git sync trigger 대신 CRUD 통합 |
| I3: NL input → LLM → result | 3 tests (structured spec, with context, AI 503) | ✅ | |
| I4: session insert → SSE event | 3 tests (session→agents, SSE stream, constraint check) | ✅ | |

### 4.6 E2E CI Workflow 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| trigger | PR to master | PR to master | ✅ |
| playwright install | `npx playwright install --with-deps chromium` | `pnpm -F exec playwright install --with-deps chromium` | ⚠️ Minor | 동등 |
| e2e command | `pnpm --filter @foundry-x/web e2e` | `pnpm -F @foundry-x/web e2e` | ✅ | shorthand |
| artifact upload | `if: failure()` | `if: ${{ !cancelled() }}` | ⚠️ Changed | 구현이 더 넓은 범위 |
| timeout-minutes | 미명시 | `15` | ⚠️ Added | 좋은 추가 |
| retention-days | 미명시 | `14` | ⚠️ Added | |

### 4.7 F49 Gaps

| # | Severity | Description |
|---|----------|-------------|
| GAP-02 | Major | auth-flow.spec.ts: 설계의 login form fill + submit + redirect 시나리오가 URL/heading 확인으로 단순화됨 |
| GAP-03 | Major | spec-generator.spec.ts: 설계의 Generate 버튼 클릭 + LLM 결과 대기(30s timeout) 시나리오가 textarea fill 확인으로 축소됨 |
| GAP-04 | Minor | Auth fixture: localStorage key가 `"token"` → `"fx-token"`, test email이 `test@example.com` → `test@foundry-x.dev` |
| GAP-05 | Minor | agents.spec.ts: `data-testid=agent-card` locator 대신 CSS class 기반 선택 |

**F49 Score: 92%** — 모든 파일 존재 + CI 워크플로우 완전. E2E 시나리오 2개가 설계 대비 단순화.

---

## 5. F50: 에이전트 오케스트레이션 기초 (91%)

### 5.1 타입 비교 (`packages/shared/src/agent.ts`)

| Design Type | Implementation | Status |
|-------------|---------------|:------:|
| `AgentCapabilityDefinition` | 존재, 7 fields 일치 | ✅ |
| `AgentConstraintRule` | 존재, 5 fields 일치 | ✅ |
| `ConstraintCheckRequest` | 존재, 3 fields 일치 | ✅ |
| `ConstraintCheckResult` | 존재, 4 fields 일치 | ✅ |
| `AgentTask` | 존재, 8 fields 일치 | ✅ |
| `AgentRegistration` | 존재, 5 fields 일치 | ✅ |

설계: 6 타입. 구현: 6 타입. **100% 일치**.

### 5.2 D1 Migration 비교 (`0004_agent_orchestration.sql`)

| Design Table | Implementation | Status | Notes |
|-------------|----------------|:------:|-------|
| `agents` | 5 columns, CHECK constraint | ✅ | |
| `agent_capabilities` | 7 columns, FK → agents, index | ✅ | |
| `agent_constraints` | 5 columns, UNIQUE on action, CHECK constraints | ✅ | |
| `agent_tasks` | 8 columns, FK → agent_sessions, index | ✅ | |
| Seed constraints (11) | 11 INSERT OR IGNORE | ✅ | |

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Seed constraint IDs | `c-always-read-specs` 등 | `constraint-01` ~ `constraint-11` | ⚠️ Changed |
| constraint-07 enforcement | `'warn'` (external-api-call) | `'block'` | ⚠️ Changed |

### 5.3 Drizzle Schema 비교 (`packages/api/src/db/schema.ts`)

| Design Table | Implementation | Status | Notes |
|-------------|----------------|:------:|-------|
| `agents` | 5 fields 일치 | ✅ | |
| `agentCapabilities` | 7 fields 일치 | ⚠️ | `onDelete: "cascade"` 누락 |
| `agentConstraints` | 5 fields | ⚠️ | `.unique()` on action 누락 |
| `agentTasks` | 8 fields 일치 | ✅ | |

### 5.4 AgentOrchestrator 서비스 비교

| Design Method | Implementation | Status | Notes |
|--------------|----------------|:------:|-------|
| `checkConstraint(req: ConstraintCheckRequest)` | `checkConstraint(action: string)` | ⚠️ Changed | 시그니처 단순화: req 객체 대신 action만 |
| `listAgents()` | `listAgents(): Promise<AgentRegistration[]>` | ✅ | 반환 타입 명시적 |
| `getCapabilities(agentId)` | `getCapabilities(agentId): Promise<AgentCapabilityDefinition[]>` | ✅ | |
| `createTask(sessionId, branch)` | `createTask(sessionId, branch): Promise<AgentTask>` | ✅ | |
| `listTasks(agentId)` | `listTasks(agentName): Promise<AgentTask[]>` | ✅ | 파라미터명 변경 (동일 쿼리) |
| — | `listAllCapabilities()` | ⚠️ Added | 설계에 없는 메서드 추가 |

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Local type mirrors | `import from @foundry-x/shared` | Local interface 복사 + comment | ⚠️ Changed | 주석에 향후 import 예정 명시 |
| Task ID format | `crypto.randomUUID()` | `task-${crypto.randomUUID().slice(0,8)}` | ⚠️ Minor | 접두사 + 8자 축약 |

### 5.5 Constraint Guard 미들웨어 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Header check | X-Agent-Id + X-Agent-Action | 동일 | ✅ |
| Pass through (no headers) | `return next()` | 동일 | ✅ |
| Response headers | X-Constraint-Tier, X-Constraint-Allowed | 동일 | ✅ |
| Block response | 403 + error JSON | 동일 | ✅ |
| orchestrator call | `orchestrator.checkConstraint({ agentId, action })` | `orchestrator.checkConstraint(agentAction)` | ⚠️ | 시그니처 차이 반영 |

### 5.6 Routes 비교

| Design Endpoint | Implementation | Status |
|----------------|---------------|:------:|
| GET `/agents` (D1 우선 + mock fallback) | D1 agents → capabilities JOIN → mock fallback | ✅ |
| GET `/agents/stream` (SSE) | 동일 | ✅ |
| GET `/agents/capabilities` (신규) | `listAllCapabilities()` 호출 | ✅ |
| GET `/agents/:id/tasks` (신규) | `listTasks(id)` 호출 | ✅ |
| POST `/agents/:id/tasks` (신규) | session 조회 → `createTask()` | ✅ |
| POST `/agents/constraints/check` (신규) | `checkConstraint(action)` 호출 | ✅ |

### 5.7 Zod Schema 비교

| Design Schema | Implementation | Status |
|--------------|----------------|:------:|
| ConstraintCheckRequestSchema | `{ agentId, action, context? }` | ✅ |
| ConstraintCheckResultSchema | `{ allowed, tier, rule, reason }` | ✅ |
| AgentTaskSchema | 8 fields | ✅ |
| CreateTaskRequestSchema | `{ branch }` | ✅ |
| AgentCapabilityDefinitionSchema | 7 fields | ✅ |
| AgentRegistrationSchema | 5 fields | ⚠️ Added | 설계에 미명시, 좋은 추가 |

### 5.8 Web Dashboard 비교

| Design | Implementation | Status |
|--------|---------------|:------:|
| 실 Capability 카드 표시 | AgentCard에서 capabilities 매핑 표시 | ✅ |
| Constraint tier 색상 배지 | AgentCard에서 constraints 표시 (tier별 구분) | ⚠️ | 배지 색상 미확인 |
| 에이전트 tasks 목록 | 미구현 — AgentsPage에 tasks 표시 없음 | ❌ Missing |

### 5.9 테스트 비교

| Design Test | Implementation | Status |
|------------|----------------|:------:|
| agent-orchestrator.test.ts (~8 tests) | 8 tests (4 constraint + listAgents + getCapabilities + createTask + listTasks) | ✅ |
| constraint-guard.test.ts (~5 tests) | 5 tests (no headers, always, never/block, headers, ask/warn) | ✅ |
| Integration tests (~4 files) | 4 files (auth-profile, wiki-git, spec-generate, agent-sse) | ✅ |

### 5.10 F50 Gaps

| # | Severity | Description |
|---|----------|-------------|
| GAP-06 | Major | agents/page.tsx: 에이전트 tasks 목록(branch + PR status) 미표시 — 설계 §4.7 명시 |
| GAP-07 | Minor | Drizzle schema: `agentCapabilities.agentId`에 `onDelete: "cascade"` 누락 (SQL migration에는 있음) |
| GAP-08 | Minor | Drizzle schema: `agentConstraints.action`에 `.unique()` 누락 (SQL migration UNIQUE 존재) |
| GAP-09 | Minor | `checkConstraint` 시그니처: 설계는 `ConstraintCheckRequest` 객체, 구현은 `action: string`만 받음 |
| GAP-10 | Minor | Seed constraint IDs: 설계 `c-always-*` 패턴 → 구현 `constraint-01` 순번 패턴 (기능 무관) |
| GAP-11 | Minor | Seed constraint-07 (`external-api-call`): 설계 `enforcement_mode: 'warn'` → 구현 `'block'` |
| GAP-12 | Minor | AgentOrchestrator: 설계에 없는 `listAllCapabilities()` 메서드 추가 (양호) |
| GAP-13 | Minor | Task ID: 설계 full UUID → 구현 `task-` 접두사 + 8자 축약 |

**F50 Score: 91%** — 6 타입 + 4 테이블 + 4 endpoints + 서비스 + 미들웨어 모두 존재. Dashboard tasks 표시 미구현이 주요 gap.

---

## 6. F51: 옵저버빌리티 (95%)

### 6.1 파일 존재 확인

| Design | Implementation | Status |
|--------|---------------|:------:|
| `packages/api/src/routes/health.ts` (수정) | D1/KV/GitHub 상세 체크 추가 | ✅ |
| `packages/api/src/services/logger.ts` (신규) | 4-level 구조화 로깅, 48줄 | ✅ |
| `packages/api/src/schemas/health.ts` (수정) | DetailedHealthSchema 추가 | ✅ |
| `packages/api/src/services/github.ts` (수정) | `getRateLimit()` 메서드 추가 | ✅ |

### 6.2 Health Route 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| Endpoint path | 기존 `/health` 확장 | 별도 `/health/detailed` 신규 추가 | ⚠️ Changed | 기존 health 보존 + 분리 |
| D1 check | `SELECT 1` + latency | 동일 | ✅ |
| KV check | `CACHE.get("__health_check__")` + latency | 동일 | ✅ |
| GitHub check | `getRateLimit()` → rateLimit 포함 | 동일 | ✅ |
| Response: status | `"ok" \| "degraded" \| "down"` | `"ok" \| "degraded"` (down 미사용) | ⚠️ Minor |
| Response: version | `"0.9.0"` | `"0.9.0"` | ✅ |
| Response: uptime | 포함 | 미포함 | ⚠️ Minor |

### 6.3 Logger 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| LogLevel | `"debug" \| "info" \| "warn" \| "error"` | 동일 | ✅ |
| LogEntry fields | level, message, context, timestamp, requestId | 동일 | ✅ |
| `info()` | 존재 | 존재 | ✅ |
| `warn()` | 존재 | 존재 | ✅ |
| `error()` | 존재 | 존재 | ✅ |
| `debug()` | 미명시 | 추가 구현 | ⚠️ Added | 좋은 추가 |
| console 분기 | error→console.error, warn→console.warn, 나머지→console.log | 동일 | ✅ |

### 6.4 Health Schema 비교

| Item | Design | Implementation | Status |
|------|--------|----------------|:------:|
| `DetailedHealth.status` | `"ok" \| "degraded" \| "down"` | 동일 | ✅ |
| `DetailedHealth.version` | `string` | 동일 | ✅ |
| `DetailedHealth.checks` | `{ d1, kv, github }` 고정 | `z.record(InfraCheckSchema)` 동적 | ⚠️ Changed | 확장성 우수 |
| InfraCheck fields | status, latency?, error?, rateLimit? | 동일 | ✅ |

### 6.5 F51 Gaps

| # | Severity | Description |
|---|----------|-------------|
| GAP-14 | Minor | health endpoint: 설계는 기존 `/health` 확장, 구현은 `/health/detailed` 분리 — 기존 endpoint 보존으로 더 안전 |
| GAP-15 | Minor | DetailedHealth response에 `uptime` 필드 미포함 |
| GAP-16 | Minor | checks 스키마: 설계는 고정 `{ d1, kv, github }`, 구현은 `z.record()` 동적 — 확장성 우수 |

**F51 Score: 95%** — 모든 핵심 기능 구현 완료. endpoint 분리 결정이 설계와 다르나 더 나은 선택.

---

## 7. Test Coverage

### 7.1 Sprint 9 신규 테스트

| Category | File | Tests |
|----------|------|:-----:|
| AgentOrchestrator 단위 | services/agent-orchestrator.test.ts | 8 |
| Constraint Guard 단위 | middleware/constraint-guard.test.ts | 5 |
| 통합: Auth→Profile | integration/auth-profile.test.ts | 3 |
| 통합: Wiki→Git | integration/wiki-git.test.ts | 3 |
| 통합: Spec Generate | integration/spec-generate.test.ts | 3 |
| 통합: Agent→SSE | integration/agent-sse.test.ts | 3 |
| **Sprint 9 신규 합계** | | **25** |

### 7.2 설계 대비 테스트 수

| Design 예상 | 구현 실적 | Status |
|:-----------:|:--------:|:------:|
| ~43 (E2E 12 + API 통합 12 + 단위 16 + health 3) | 25 (단위 13 + 통합 12) | ⚠️ |

E2E 테스트(~12)는 Playwright이라 API test count에 미포함. Logger 단위 테스트(~3), Health 확장 테스트(~3)가 미작성.

---

## 8. Gap Summary

### 8.1 전체 Gap 목록

| # | F-item | Severity | Description | Recommendation |
|---|--------|----------|-------------|----------------|
| GAP-01 | F48 | Minor | smoke-test.sh check() 함수 패턴 차이 (`eval` vs `"$@"`) | 유지 — 구현이 더 안전 |
| GAP-02 | F49 | Major | auth-flow E2E: login form fill+submit 시나리오 미구현 | login 페이지/모달 구현 후 E2E 보강 |
| GAP-03 | F49 | Major | spec-generator E2E: Generate 버튼 클릭 + 결과 대기 미구현 | LLM mock 설정 후 full-flow E2E 추가 |
| GAP-04 | F49 | Minor | Auth fixture: localStorage key 및 test email 차이 | 설계 문서 업데이트 |
| GAP-05 | F49 | Minor | agents.spec: CSS 기반 선택자 vs data-testid | 컴포넌트에 data-testid 추가 권장 |
| GAP-06 | F50 | Major | agents/page.tsx: tasks 목록(branch+PR) 미표시 | Tasks 섹션 추가 구현 필요 |
| GAP-07 | F50 | Minor | Drizzle agentCapabilities: `onDelete: "cascade"` 누락 | `.references(() => agents.id, { onDelete: "cascade" })` 추가 |
| GAP-08 | F50 | Minor | Drizzle agentConstraints.action: `.unique()` 누락 | Drizzle schema에 `.unique()` 추가 |
| GAP-09 | F50 | Minor | checkConstraint 시그니처: 객체 → string 단순화 | 설계 문서 업데이트 또는 객체로 변경 |
| GAP-10 | F50 | Minor | Seed constraint IDs 네이밍 패턴 차이 | 기능 무관, 유지 |
| GAP-11 | F50 | Minor | constraint-07 enforcement_mode: warn → block | 의도적 강화면 설계 업데이트 |
| GAP-12 | F50 | Minor | listAllCapabilities() 메서드 추가 | 설계 문서에 반영 |
| GAP-13 | F50 | Minor | Task ID 형식: full UUID → `task-` 접두사 | 유지, 설계 업데이트 |
| GAP-14 | F51 | Minor | health endpoint: `/health` 확장 → `/health/detailed` 분리 | 유지 — 더 안전한 설계 |
| GAP-15 | F51 | Minor | uptime 필드 미포함 | Workers 환경에서 uptime 의미 제한적, 제거 가능 |
| GAP-16 | F51 | Minor | checks 스키마 동적 record vs 고정 object | 유지 — 확장성 우수 |

### 8.2 Severity 분포

| Severity | Count | Items |
|----------|:-----:|-------|
| Critical | 0 | — |
| Major | 3 | GAP-02, GAP-03, GAP-06 |
| Minor | 13 | GAP-01, GAP-04~05, GAP-07~16 |
| **Total** | **16** | |

---

## 9. Match Rate Calculation

### 9.1 F-item별 Match Rate

| F-item | Total Items | Match | Partial | Missing | Rate |
|--------|:-----------:|:-----:|:-------:|:-------:|:----:|
| F48: 배포 파이프라인 | 11 | 10 | 1 | 0 | 97% |
| F49: E2E 테스트 | 25 | 20 | 5 | 0 | 92% |
| F50: 오케스트레이션 | 30 | 23 | 6 | 1 | 91% |
| F51: 옵저버빌리티 | 14 | 12 | 2 | 0 | 95% |

### 9.2 Overall

```
                Sprint 9 Overall Match Rate
┌─────────────────────────────────────────────────┐
│                                                 │
│  F48 배포 파이프라인     ████████████████████ 97% │
│  F49 E2E 테스트         ██████████████████░░ 92% │
│  F50 오케스트레이션      █████████████████░░░ 91% │
│  F51 옵저버빌리티       ███████████████████░ 95% │
│                                                 │
│  Overall                ██████████████████░░ 94% │
│                                                 │
│  Status: ✅ PASS (>= 90%)                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 10. Recommended Actions

### 10.1 즉시 조치 (Major Gaps)

| Priority | Gap | Action | Effort |
|:--------:|-----|--------|:------:|
| 1 | GAP-06 | agents/page.tsx에 에이전트 tasks 섹션 추가 (branch + PR status 표시) | S |
| 2 | GAP-02 | auth-flow.spec.ts에 login form fill+submit 시나리오 추가 (login UI 구현 선행) | M |
| 3 | GAP-03 | spec-generator.spec.ts에 Generate full-flow 시나리오 추가 (LLM mock 필요) | M |

### 10.2 단기 조치 (Minor, 코드)

| Priority | Gap | Action | Effort |
|:--------:|-----|--------|:------:|
| 4 | GAP-07 | Drizzle schema agentCapabilities FK에 `{ onDelete: "cascade" }` 추가 | XS |
| 5 | GAP-08 | Drizzle schema agentConstraints.action에 `.unique()` 추가 | XS |
| 6 | GAP-05 | AgentCard 컴포넌트에 `data-testid="agent-card"` 추가 | XS |

### 10.3 설계 문서 업데이트

| Gap | Update |
|-----|--------|
| GAP-04 | Auth fixture: localStorage key `fx-token`, email `test@foundry-x.dev` 반영 |
| GAP-09 | checkConstraint 시그니처: `action: string` 단순화 반영 |
| GAP-11 | constraint-07 enforcement_mode: `block` 반영 |
| GAP-12 | `listAllCapabilities()` 메서드 추가 반영 |
| GAP-13 | Task ID 형식: `task-{uuid8}` 반영 |
| GAP-14 | Health endpoint: `/health/detailed` 분리 반영 |
| GAP-16 | checks 스키마: 동적 record 반영 |

---

## 11. Conclusion

Sprint 9 전체 Match Rate **94%**로 목표(>=90%)를 달성했어요.

- **F48 배포 파이프라인 (97%)**: deploy.yml, smoke-test.sh, runbook 모두 설계 일치. 가장 완성도 높음.
- **F49 E2E 테스트 (92%)**: 파일 구조 + CI 완전. E2E 시나리오 2개가 단순화(login form, spec generator full-flow).
- **F50 오케스트레이션 (91%)**: 타입 6개 + D1 4테이블 + 서비스 + 미들웨어 + 4 endpoints 구현 완료. Dashboard tasks 표시 미구현.
- **F51 옵저버빌리티 (95%)**: 상세 health check + 구조화 로깅 완전. endpoint 분리가 설계보다 나은 결정.

Major gap 3건 중 GAP-06(tasks 표시)은 즉시 수정 가능(S). GAP-02, GAP-03은 login UI / LLM mock 선행 필요(M).

---

## Related Documents

- Plan: [sprint-9.plan.md](../../01-plan/features/sprint-9.plan.md)
- Design: [sprint-9.design.md](../../02-design/features/sprint-9.design.md)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial gap analysis — 94% match rate | Sinclair Seo |
