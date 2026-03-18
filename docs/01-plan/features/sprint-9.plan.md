---
code: FX-PLAN-009
title: Sprint 9 (v0.9.0) — 프로덕션 배포 + E2E + 에이전트 오케스트레이션
version: 0.1
status: Draft
category: PLAN
system-version: 0.9.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 9 (v0.9.0) Planning Document

> **Summary**: Sprint 8에서 구축한 서비스 레이어(9개)+SSE+NL→Spec+Wiki 기반 위에, 프로덕션 배포를 완성하고, E2E 테스트로 품질을 보증하며, 에이전트 오케스트레이션 기초를 구현하여 Foundry-X를 "실서비스 운영 가능" 상태로 전환한다.
>
> **Project**: Foundry-X
> **Version**: 0.9.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 8 코드(v0.8.0)가 프로덕션 미배포 상태이며, E2E 테스트가 0건이고, 에이전트는 mock 데이터에 의존하여 실제 오케스트레이션이 불가능하다 |
| **Solution** | F48: Workers+Pages 프로덕션 배포 완성 + F49: Playwright E2E 크리티컬 패스 + F50: 에이전트 Capability/Constraint 실 구현 + F51: Smoke test + 옵저버빌리티 |
| **Function/UX Effect** | fx.minu.best에서 랜딩→대시보드 전체 플로우 동작, E2E로 회귀 방지, 에이전트가 실제 Git 브랜치에서 작업하고 결과를 대시보드에서 추적 가능 |
| **Core Value** | "출시 가능한 품질" 확보 — 배포+테스트+모니터링 3축 완성으로 외부 사용자 온보딩 준비 완료. 에이전트 오케스트레이션으로 Phase 2 핵심 차별화 시작 |

---

## 1. Overview

### 1.1 Purpose

Sprint 9는 Foundry-X를 **내부 프로토타입에서 외부 시연 가능한 실서비스**로 전환하는 스프린트예요:

- **F48 프로덕션 배포 (P0)**: Workers secrets + D1 migration remote + Pages deploy — 실제 URL에서 동작하는 서비스
- **F49 E2E 테스트 (P1)**: Playwright로 크리티컬 패스 자동 검증 — 배포 후 회귀 방지
- **F50 에이전트 오케스트레이션 (P1)**: mock → 실 Capability/Constraint 정의 + 브랜치 기반 작업 흐름
- **F51 옵저버빌리티 (P2)**: Smoke test + health check 강화 — 운영 가시성 확보

### 1.2 Background

- **Sprint 8 성과**: 서비스 레이어 9개 + SSE + NL→Spec + Wiki Git Sync (Match Rate 93%, 216 tests)
- **현재 한계**:
  - 프로덕션 미배포: Workers secrets 미설정, D1 migration remote 미적용, Pages deploy job 제거 상태
  - E2E 0건: Playwright/Cypress 미설정, 크리티컬 패스 자동 검증 없음
  - 에이전트 mock: hardcoded "Code Review Agent" / "Test Writer Agent", constraint enforcement 미구현
  - 모니터링 없음: 에러 추적, 배포 후 검증, 성능 대시보드 부재
- **KV namespace**: 실제 ID 설정 완료 (d84143e), wrangler.toml 반영됨

### 1.3 Prerequisites (Sprint 8 완료 항목)

| 항목 | 상태 | 근거 |
|------|:----:|------|
| 서비스 레이어 9개 | ✅ | github, kv-cache, spec-parser, health-calc, integrity-checker, freshness-checker, sse-manager, llm, wiki-sync |
| SSE 실시간 스트리밍 | ✅ | SSEManager D1 폴링, safeEnqueue, 3 이벤트 타입 |
| NL→Spec LLM 통합 | ✅ | Workers AI + Claude fallback, Zod 검증 |
| Wiki Git 동기화 | ✅ | pushToGit + pullFromGit, webhook HMAC |
| Production Site | ✅ | Route Groups, Digital Forge 디자인, Navbar + Footer |
| KV namespace ID | ✅ | 030b30d47a98485ea3af95b3347163d6 |
| D1 database ID | ✅ | 6338688e-b050-4835-98a2-7101f9215c76 |
| 216 tests passing | ✅ | CLI 106 + API 76 + Web 34 |

### 1.4 Sprint Scope

| F# | 제목 | Priority | 설명 |
|----|------|:--------:|------|
| F48 | 프로덕션 배포 파이프라인 완성 | P0 | Workers secrets + D1 migration remote + Pages deploy job 복원 + Runbook |
| F49 | E2E 테스트 인프라 + 크리티컬 패스 | P1 | Playwright setup + login→dashboard flow + API 통합 테스트 + CI 통합 |
| F50 | 에이전트 오케스트레이션 기초 | P1 | Real capability/constraint + 브랜치 기반 격리 + agent_sessions 실데이터 |
| F51 | 옵저버빌리티 + 배포 후 검증 | P2 | Smoke test + error tracking + health check 강화 |

---

## 2. Feature Specifications

### 2.1 F48: 프로덕션 배포 파이프라인 완성 (P0)

**목표**: Workers + Pages가 프로덕션 URL에서 정상 동작하고, 배포 프로세스가 문서화된다.

#### 2.1.1 Workers 배포 완성

| 작업 | 상세 |
|------|------|
| **Secrets 설정** | `wrangler secret put JWT_SECRET`, `GITHUB_TOKEN`, `WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` |
| **D1 Migration** | `wrangler d1 migrations apply foundry-x-db --remote` — 3개 마이그레이션 프로덕션 적용 |
| **배포 검증** | `wrangler deploy` → `curl https://foundry-x-api.ktds-axbd.workers.dev/health` |
| **환경 변수** | `wrangler.toml` vars 섹션: ENVIRONMENT=production |

#### 2.1.2 Pages 배포 복원

| 작업 | 상세 |
|------|------|
| **deploy.yml 복원** | Pages deploy job — `cloudflare/wrangler-action@v3` 또는 `cloudflare/pages-action@1` |
| **빌드 설정** | `next build && next export` → `out/` 디렉토리 |
| **_redirects** | API 프록시: `/api/*` → `https://foundry-x-api.ktds-axbd.workers.dev/api/:splat` |
| **Custom Domain** | fx.minu.best → Cloudflare Pages custom domain 설정 |

#### 2.1.3 배포 Runbook

배포 Runbook 문서를 `docs/guides/deployment-runbook.md`에 작성:
- 환경 설정 체크리스트 (secrets, KV, D1)
- 배포 순서 (D1 migration → Workers → Pages)
- 롤백 절차
- post-deploy 검증 항목

#### 2.1.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `.github/workflows/deploy.yml` | Pages deploy job 추가 |
| `packages/api/wrangler.toml` | ENVIRONMENT var 추가 |
| `docs/guides/deployment-runbook.md` | 신규 |

---

### 2.2 F49: E2E 테스트 인프라 + 크리티컬 패스 (P1)

**목표**: Playwright로 주요 사용자 플로우를 자동 검증하고, CI에서 매 PR마다 실행한다.

#### 2.2.1 Playwright 인프라 설정

| 작업 | 상세 |
|------|------|
| **설치** | `pnpm -F web add -D @playwright/test` + `npx playwright install --with-deps chromium` |
| **설정** | `packages/web/playwright.config.ts` — baseURL, webServer, projects |
| **CI 통합** | `.github/workflows/e2e.yml` — Playwright 실행, 아티팩트 업로드 |

#### 2.2.2 크리티컬 패스 E2E 시나리오

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| E1 | 랜딩 → 로그인 | 랜딩 렌더링, 로그인 폼 제출, JWT 발급 |
| E2 | 대시보드 진입 | 사이드바 렌더링, 최근 활동 표시 |
| E3 | 에이전트 목록 | AgentCard 렌더링, SSE 연결 상태 |
| E4 | Spec Generator | 자연어 입력 → 결과 렌더링 → 클립보드 복사 |
| E5 | Wiki CRUD | 페이지 생성 → 편집 → 삭제 |

#### 2.2.3 API 통합 테스트

기존 단위 테스트와 별도로 서비스 간 호출을 검증하는 통합 테스트:

| # | 시나리오 | 검증 항목 |
|---|---------|----------|
| I1 | Auth → Profile | 회원가입 → 로그인 → 프로필 조회 |
| I2 | Wiki → Git Sync | Wiki 생성 → Git push 트리거 확인 |
| I3 | Spec Generate → Save | NL 입력 → LLM 생성 → 결과 저장 |
| I4 | Agent → SSE | agent_sessions INSERT → SSE 이벤트 수신 |

#### 2.2.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/web/playwright.config.ts` | 신규 — Playwright 설정 |
| `packages/web/e2e/*.spec.ts` | 신규 — E2E 시나리오 5개 |
| `packages/api/src/__tests__/integration/` | 신규 — 통합 테스트 4개 |
| `.github/workflows/e2e.yml` | 신규 — E2E CI 워크플로우 |
| `packages/web/package.json` | devDependencies 추가 |

---

### 2.3 F50: 에이전트 오케스트레이션 기초 (P1)

**목표**: 에이전트가 실제 Git 리포에서 브랜치를 만들고 작업하며, Capability/Constraint가 서버에서 강제된다.

#### 2.3.1 Real Capability 정의

현재 mock 데이터를 실 정의로 교체:

```typescript
// packages/shared/src/agent.ts 확장
interface AgentCapabilityDefinition {
  id: string;
  name: string;
  description: string;
  tools: string[];           // 사용 가능한 도구 목록
  allowedPaths: string[];    // 접근 가능 파일 경로 패턴
  maxConcurrency: number;    // 동시 작업 수 제한
}

interface AgentConstraintRule {
  tier: 'always' | 'ask' | 'never';
  action: string;
  description: string;
  enforcementMode: 'block' | 'warn' | 'log';
}
```

#### 2.3.2 Constraint 강제 로직

API 미들웨어에서 에이전트 요청 시 Constraint를 검증:

| Tier | 동작 | 예시 |
|------|------|------|
| **Always** | 자동 허용 | specs/ 읽기, 테스트 실행, lint 실행 |
| **Ask** | 승인 대기 → SSE 알림 | 의존성 추가, 스키마 변경, 외부 API 호출 |
| **Never** | 즉시 차단 + 에러 반환 | main 직접 push, --no-verify, 인증정보 커밋 |

#### 2.3.3 브랜치 기반 격리 흐름

PRD §7.6에 정의된 에이전트 충돌 해결 전략을 구현:

```
1. 에이전트 작업 시작 → feature/{agent-name}/{task-id} 브랜치 생성
2. 작업 진행 → agent_sessions 상태 업데이트 (SSE로 실시간 전파)
3. 작업 완료 → PR 생성 (API를 통해)
4. SDD 검증 → lint + typecheck + test 자동 실행
5. 검증 통과 → 자동 merge 또는 리뷰어 승인 대기
6. 충돌 발생 → 에이전트 자동 rebase (최대 3회) → 실패 시 human escalation
```

#### 2.3.4 D1 스키마 확장

```sql
-- agent_capabilities 테이블
CREATE TABLE agent_capabilities (
  id TEXT PRIMARY KEY,
  agentName TEXT NOT NULL,
  capability TEXT NOT NULL,  -- JSON: AgentCapabilityDefinition
  createdAt TEXT DEFAULT (datetime('now'))
);

-- agent_constraints 테이블
CREATE TABLE agent_constraints (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK(tier IN ('always', 'ask', 'never')),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  enforcementMode TEXT DEFAULT 'block'
);

-- agent_tasks 테이블 (브랜치 기반 격리)
CREATE TABLE agent_tasks (
  id TEXT PRIMARY KEY,
  agentSessionId TEXT NOT NULL REFERENCES agent_sessions(id),
  branch TEXT NOT NULL,
  prNumber INTEGER,
  prStatus TEXT DEFAULT 'draft',
  sddVerified INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

#### 2.3.5 API 엔드포인트 추가

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agents/capabilities` | GET | 에이전트 Capability 목록 |
| `/agents/:id/tasks` | GET/POST | 에이전트 작업(브랜치) 관리 |
| `/agents/:id/constraints/check` | POST | Constraint 검증 (action → allow/deny) |
| `/agents/tasks/:taskId/pr` | POST | PR 생성 요청 |

#### 2.3.6 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `packages/shared/src/agent.ts` | Capability/Constraint 타입 확장 |
| `packages/api/src/routes/agent.ts` | 4 endpoints 추가 |
| `packages/api/src/services/agent-orchestrator.ts` | 신규 — 오케스트레이션 로직 |
| `packages/api/src/middleware/constraint-guard.ts` | 신규 — Constraint 강제 미들웨어 |
| `packages/api/src/db/migrations/0004_agent_orchestration.sql` | 신규 — 3 테이블 |
| `packages/api/src/schemas/agent.ts` | Zod 스키마 확장 |
| `packages/web/src/app/(app)/agents/page.tsx` | 실 Capability 표시 |

---

### 2.4 F51: 옵저버빌리티 + 배포 후 검증 (P2)

**목표**: 프로덕션 배포 후 자동 검증하고, 운영 중 이슈를 감지할 수 있는 기반을 구축한다.

#### 2.4.1 Smoke Test

배포 직후 자동 실행되는 경량 검증:

```bash
# scripts/smoke-test.sh
API_URL="https://foundry-x-api.ktds-axbd.workers.dev"
WEB_URL="https://fx.minu.best"

# API health
curl -sf "$API_URL/health" | jq '.status == "ok"'

# API auth flow
TOKEN=$(curl -sf "$API_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | jq -r '.token')

# API protected endpoint
curl -sf "$API_URL/api/requirements" -H "Authorization: Bearer $TOKEN" | jq '.length > 0'

# Web landing
curl -sf "$WEB_URL" | grep -q "Foundry-X"

# SSE endpoint
timeout 5 curl -sf "$API_URL/api/agents/stream" -H "Authorization: Bearer $TOKEN" || true
```

#### 2.4.2 Health Check 강화

현재 `/health`는 단순 OK 반환 → D1/KV/외부 서비스 상태까지 포함:

```json
{
  "status": "ok",
  "version": "0.9.0",
  "checks": {
    "d1": { "status": "ok", "latency": 12 },
    "kv": { "status": "ok", "latency": 5 },
    "github": { "status": "ok", "rateLimit": { "remaining": 4800 } }
  },
  "uptime": 3600
}
```

#### 2.4.3 Error Tracking

Workers 환경에서의 에러 추적:
- `console.error` → Cloudflare Workers Logs (기본)
- 구조화 로깅: `{ level, message, context, timestamp }` 포맷
- 에러율 임계치: 5분간 500 에러 10건 이상 시 알림 (Workers Analytics)

#### 2.4.4 파일 변경 예상

| 파일 | 변경 |
|------|------|
| `scripts/smoke-test.sh` | 신규 |
| `packages/api/src/routes/health.ts` | 상세 health check |
| `packages/api/src/services/logger.ts` | 신규 — 구조화 로깅 |
| `.github/workflows/deploy.yml` | post-deploy smoke test step |

---

## 3. Technical Architecture

### 3.1 새로운 컴포넌트

```
┌────────────────────────────────────────────────┐
│                   Sprint 9 추가                 │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐  ┌──────────────┐  ┌─────────┐  │
│  │ Playwright│  │ Agent        │  │ Smoke   │  │
│  │ E2E      │  │ Orchestrator │  │ Test    │  │
│  └────┬─────┘  └──────┬───────┘  └────┬────┘  │
│       │               │               │       │
│  ┌────▼───────────────▼───────────────▼────┐  │
│  │              API Server (Hono)           │  │
│  │  ┌─────────────┐  ┌──────────────────┐  │  │
│  │  │ Constraint  │  │ Structured       │  │  │
│  │  │ Guard MW    │  │ Logger           │  │  │
│  │  └─────────────┘  └──────────────────┘  │  │
│  └─────────────────────┬───────────────────┘  │
│                        │                       │
│  ┌─────────┐  ┌───────▼───────┐  ┌─────────┐  │
│  │ D1      │  │ D1 (+3 tables)│  │ KV      │  │
│  │ (기존6) │  │ capabilities  │  │ Cache   │  │
│  │         │  │ constraints   │  │         │  │
│  │         │  │ tasks         │  │         │  │
│  └─────────┘  └───────────────┘  └─────────┘  │
└────────────────────────────────────────────────┘
```

### 3.2 의존성 추가

| 패키지 | 목적 | 버전 |
|--------|------|------|
| `@playwright/test` | E2E 테스트 | latest |
| (기타 없음 — 기존 스택 활용) | | |

### 3.3 D1 스키마 변경

기존 6 테이블 + 3 테이블 추가:
- `agent_capabilities` — 에이전트 Capability 정의
- `agent_constraints` — 3-tier Constraint 규칙
- `agent_tasks` — 브랜치 기반 작업 추적

마이그레이션: `0004_agent_orchestration.sql`

---

## 4. Implementation Plan

### 4.1 구현 순서

```
Phase A: 프로덕션 배포 (F48) — P0, 먼저 완료
  A1. Workers secrets 설정 + D1 migration remote
  A2. Pages deploy job 복원
  A3. 배포 검증 + Runbook 작성

Phase B: E2E + 옵저버빌리티 (F49 + F51) — 병렬 가능
  B1. Playwright 인프라 설정
  B2. 크리티컬 패스 E2E 5개
  B3. API 통합 테스트 4개
  B4. Smoke test + health check 강화

Phase C: 에이전트 오케스트레이션 (F50) — Phase A 이후
  C1. D1 마이그레이션 (3 테이블)
  C2. Capability/Constraint 타입 + 서비스
  C3. Constraint Guard 미들웨어
  C4. 에이전트 API 4 endpoints
  C5. 웹 대시보드 에이전트 뷰 업데이트
```

### 4.2 예상 산출물

| 카테고리 | 파일 수 | 테스트 수 |
|---------|:-------:|:--------:|
| F48 배포 | ~3 | smoke test |
| F49 E2E | ~8 | 5 E2E + 4 통합 |
| F50 오케스트레이션 | ~8 | ~15 |
| F51 옵저버빌리티 | ~4 | ~5 |
| **합계** | ~23 | ~29 |

**Sprint 9 완료 후 예상 테스트**: 216 (기존) + ~29 = ~245 tests

### 4.3 Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (E2E) | `packages/web/playwright.config.ts`, `packages/web/e2e/`, `.github/workflows/e2e.yml` | `packages/api/`, `SPEC.md`, `CLAUDE.md` |
| W2 (Agent Orch) | `packages/api/src/services/agent-orchestrator.ts`, `packages/api/src/middleware/`, `packages/api/src/routes/agent.ts`, `packages/api/src/db/migrations/0004*` | `packages/web/`, `packages/cli/`, `SPEC.md` |
| Leader | F48 배포, F51 옵저버빌리티, SPEC 관리, 통합 검증 | — |

---

## 5. Risks & Mitigations

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | Pages deploy 토큰 권한 이슈 재발 | High | Medium | CLOUDFLARE_API_TOKEN 권한 확인 + 수동 배포 fallback |
| R2 | E2E가 CI에서 불안정 (flaky) | Medium | Medium | Playwright retry + `--retries 2` + screenshot 아티팩트 |
| R3 | Constraint enforcement가 기존 API 호환성 깨뜨림 | Medium | High | 초기에는 `enforcementMode: 'log'`로 시작 → 점진적 `block` 전환 |
| R4 | Agent orchestration 범위 초과 | High | Medium | Phase A(배포) 우선 완료 보장, F50은 기초만 — 실제 에이전트 실행은 Sprint 10 |
| R5 | D1 migration remote 적용 실패 | Low | High | `wrangler d1 migrations list --remote`로 사전 확인, `--command` fallback |

---

## 6. Success Criteria

| 항목 | 기준 |
|------|------|
| **F48 배포** | Workers + Pages 프로덕션 URL에서 health OK + 랜딩 페이지 렌더링 |
| **F49 E2E** | Playwright 5개 시나리오 CI 통과 + API 통합 테스트 4개 통과 |
| **F50 오케스트레이션** | Capability/Constraint CRUD + constraint check API 동작 + agent_tasks 테이블 |
| **F51 옵저버빌리티** | smoke-test.sh 자동 실행 + /health 상세 응답 |
| **전체** | typecheck ✅, build ✅, ~245 tests ✅, PDCA Match Rate ≥ 90% |

---

## 7. Out of Scope

Sprint 9에서 명시적으로 제외하는 항목:

| 항목 | 사유 | 이관 |
|------|------|------|
| 실제 에이전트 실행 (Claude Code/Codex 연동) | 오케스트레이션 "기초"만 — 실 연동은 별도 스프린트 | Sprint 10+ |
| 멀티테넌시 | Phase 3 범위 (PRD §8) | Phase 3 |
| 외부 도구 연동 (Jira, Slack) | Phase 3 범위 | Phase 3 |
| NL→Spec 고도화 (충돌 감지, 히스토리) | Sprint 9 범위 초과 | Sprint 10+ |
| npm publish foundry-x@0.9.0 | CLI 변경 없음, API/Web 중심 스프린트 | 변경 시 추가 |
