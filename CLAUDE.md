# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry-X(파운드리엑스)는 AX 사업개발 업무의 전체 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼이에요.
핵심 철학: **"Git이 진실, Foundry-X는 렌즈"** — 모든 명세/코드/테스트/결정 이력은 Git에 존재하고, Foundry-X는 이를 읽고 분석하고 동기화를 강제하는 레이어예요.

**현재 상태:** Sprint 51 완료 (181 endpoints, 84 services, 1104 API tests + Web 73 + ~55 E2E)
**패키지 버전:** cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0

## Architecture

### 핵심 5축
1. **하네스 구축** — 에이전트가 안정적으로 일할 수 있는 리포 환경 (CLAUDE.md, 린터, CI 등)
2. **SDD Triangle** — Spec(명세) ↔ Code ↔ Test 상시 동기화 (Plumb 엔진 기반)
3. **에이전트 오케스트레이션** — 병렬 작업, 충돌 해결 (Phase 2)
4. **지식 공유 (SSOT)** — Git 리포 = 단일 진실 공급원
5. **협업 워크스페이스** — 웹 대시보드 (Phase 2)

### Phase 1 (완료, v0.1.0~v0.5.0): CLI + Plumb
- CLI 3개 커맨드: `foundry-x init`, `foundry-x status`, `foundry-x sync`
- Ink TUI + 4개 Builder (동적 하네스 산출물)
- 176 테스트 (CLI 106 + API 43 + Web 27), Go 판정 완료 (2026-03-17)

### Phase 2 (완료, v0.6.0~v1.5.0): API Server + Web Dashboard
- packages/api: Hono API 서버 (61 endpoints, 29 services, 342 테스트)
- packages/web: Next.js 14 대시보드+랜딩 (12 pages, 48 테스트, shadcn/ui, Playwright 17 E2E)
- Sprint 6~17 완료 (상세: Current Phase 섹션 참조)

### Phase 3 (완료, v1.6.0~v2.0.0): 멀티테넌시 + 외부 도구 연동
- Sprint 18~25 완료 — 멀티테넌시, GitHub/Slack 연동, PlannerAgent, Jira, 모니터링, 워크플로우

### Phase 4 (완료, v2.1.0~): 서비스 통합
- Sprint 26 완료 — SSO Hub Token, BFF 프록시, 프론트엔드 통합(iframe), D1 엔티티 레지스트리
- 상세 이력: Current Phase 섹션 참조

### Tech Stack

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Node.js 20, Commander + Ink |
| SDD Engine | Python, Plumb (subprocess) |
| API Server | TypeScript, Hono, @hono/node-server |
| Web Dashboard | Next.js 14, React 18, Zustand |
| Git 연동 | simple-git + octokit |

### Plumb 2트랙 전략
- **Track A (즉시):** Plumb를 CLI subprocess로 래핑. `foundry-x sync` = `plumb review` + 메타데이터
- **Track B (대기):** Plumb 핵심 알고리즘을 TypeScript로 재구현 (전환 기준: Plumb 버그 장애 주 2회 이상)

## Repository Structure

모노리포 (pnpm workspace + Turborepo). 4개 패키지:

```
foundry-x/
├── packages/
│   ├── cli/                # foundry-x CLI (TypeScript)
│   │   └── src/
│   │       ├── harness/    # analyze, detect, discover, generate, merge-utils, verify
│   │       │   └── builders/  # 동적 산출물 builder (architecture, constitution, claude, agents)
│   │       ├── plumb/      # bridge, errors, types (Plumb subprocess 래퍼)
│   │       ├── services/   # config-manager, health-score, logger, harness-freshness
│   │       ├── ui/         # Ink TUI (React 18 + Ink 5)
│   │       │   ├── components/  # 순수 UI: Header, StatusBadge, HealthBar, ProgressStep, ErrorBox
│   │       │   ├── views/       # 로직 포함: StatusView, InitView, SyncView, StatusWatchView
│   │       │   ├── render.tsx   # 4-branch dispatcher (json/short/non-TTY/TTY)
│   │       │   └── types.ts     # DTO 타입
│   │       └── index.ts
│   ├── api/                # Hono API Server (Phase 2)
│   │   └── src/
│   │       ├── routes/     # 33개 (agent, audit, auth, automation-quality, biz-items, entities, feedback, freshness, github, governance, harness, health, inbox, integrity, jira, kpi, mcp, onboarding, org, profile, project-overview, proxy, reconciliation, requirements, slack, spec, sr, sso, token, webhook, webhook-registry, wiki, workflow)
│   │       ├── services/   # 84개 — 목록은 `ls packages/api/src/services/` 참조
│   │       ├── schemas/    # 33개 Zod 스키마 — 목록은 `ls packages/api/src/schemas/` 참조
│   │       └── index.ts
│   ├── web/                # Next.js 14 Dashboard + Landing (Phase 2)
│   │   └── src/
│   │       ├── app/(landing)/  # 랜딩 페이지 (Navbar + Footer)
│   │       ├── app/(app)/      # 대시보드 (Sidebar): dashboard, agents, architecture, projects, settings, spec-generator, tokens, wiki, workspace
│   │       ├── components/     # feature + landing + ui 컴포넌트
│   │       └── lib/            # api-client, sse-client
│   └── shared/             # 공유 타입 (types.ts, web.ts, agent.ts, plugin.ts)
├── docs/
│   ├── 01-plan/            # PLAN 문서
│   ├── 02-design/          # DSGN 문서
│   ├── 03-analysis/        # 갭 분석 문서
│   ├── 04-report/          # PDCA 완료 보고서
│   ├── specs/              # PRD v5, dev-transparency-spec, interview-log
│   ├── review/             # AI 검토 (round-1, round-2)
│   └── archive/            # 구버전 PRD (v1~v3)
├── package.json            # 루트 (pnpm workspace)
├── pnpm-workspace.yaml
└── turbo.json
```

## Key Documents

| 문서 | 용도 |
|------|------|
| `docs/specs/prd-v8-final.md` | 현행 PRD (권위 문서, v8: AI 에이전트 오케스트레이션 플랫폼 정체성 재정의) |
| `docs/specs/dev-transparency-spec.md` | 개발 투명성 스펙 |
| `docs/specs/interview-log.md` | 요구사항 인터뷰 종합 (Part 1-5) |
| `docs/02-design/features/tech-stack-review.design.md` | 기술 스택 결정 근거 |
| `docs/02-design/features/mcp-protocol.design.md` | MCP 프로토콜 설계 |
| `docs/01-plan/features/sprint-{N}.plan.md` | Sprint별 Plan (3~47, 대부분 `docs/archive/`로 이관) |
| `docs/02-design/features/sprint-{N}.design.md` | Sprint별 Design (3~47, 대부분 `docs/archive/`로 이관) |
| `docs/review/round-1/` | 1차 다중 AI 검토 (ChatGPT, Gemini, Claude, Grok) |
| `docs/review/round-2/` | 2차 검토 및 최종 착수 판정 |

## Development Commands

```bash
# 모노리포 전체
pnpm install && turbo build      # 의존성 + 빌드
turbo test                        # 전체 테스트
turbo lint                        # 전체 린트
turbo typecheck                   # 전체 타입체크

# CLI 패키지 단독
cd packages/cli
pnpm test                         # vitest run (131 tests)
pnpm test -- --grep "Header"      # 특정 테스트 필터
pnpm lint                         # eslint src/ (flat config)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # tsx src/index.ts (개발 실행)

# API 패키지 단독
cd packages/api
pnpm test                         # vitest run (1104 tests)
pnpm test -- --grep "agent"       # 특정 테스트 필터
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # 로컬 서버 실행

# Web 패키지 단독
cd packages/web
pnpm test                         # vitest run (73 tests)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # Next.js dev server (localhost:3000)
pnpm e2e                          # Playwright E2E (17 specs)
```

## Testing

- **Runner:** Vitest 3.x (`vitest.config.ts` in packages/cli)
- **UI 테스트:** ink-testing-library — `render()` → `lastFrame()` → assertion
- **Test Data:** `packages/cli/src/ui/__tests__/test-data.ts` — 중앙 fixture factory (`make*()` + spread override)
- **TSX 지원:** vitest.config에 `.test.tsx` 패턴 포함, tsconfig에 `jsx: "react-jsx"`
- **Mock 전략:** Ink 컴포넌트는 실제 렌더링, 외부 서비스만 mock
- **API 테스트:** Hono `app.request()` 직접 호출 방식, D1 mock은 in-memory SQLite
- **E2E 테스트:** Playwright (`packages/web/e2e/`), 17 specs, `pnpm e2e`로 실행

## Current Phase

- **Phase 1:** ✅ 완료 (Sprint 1~5, v0.5.0) — CLI + Plumb, Go 판정 2026-03-17
- **Phase 2:** ✅ 완료 (Sprint 6~17, v1.5.0) — API Server + Web Dashboard
- **Phase 3:** ✅ 완료 (Sprint 18~25, v2.0.0) — 멀티테넌시 + GitHub/Slack/Jira 연동
- **Phase 4:** ✅ Conditional Go (Sprint 26~31) — SSO + BFF + 엔티티 레지스트리 + 온보딩
- **Sprint 32~47:** ✅ Agent Evolution Track A 완결 + PRD v8 재정의 + Phase 5 준비
- **Sprint 48~51:** ✅ 현재 — SR 분류기 + 대시보드 IA 재설계 + 온보딩 플로우 + 사업 아이템 분류 Agent
  - 현재: 84 services, 181 endpoints, 1104 API tests, D1 54 테이블
  - PDCA 문서: `docs/archive/2026-03/` (Sprint 3~47 archived)
  - 상세 이력: MEMORY.md 또는 `git log --oneline` 참조

## Git Workflow

- **Branch Protection**: master에 직접 push 불가 — PR 필수 + 1명 Approve + Linear history
- **Merge 전략**: Squash merge (기본) + Auto-delete branches
- **Remote**: `https://github.com/KTDS-AXBD/Foundry-X.git` (HTTPS, PAT 인증)

## Design Decisions & Constraints

- **모노리포 (v3 확정)**: TS+Python 공존, Turborepo + Python 독립 빌드 단위. 안정화 후 분리 가능
- **Phase 1 Go 판정 완료**: 2026-03-17 Go 확정. Phase 2(API+Web) 착수
- **Phase 2 범위**: API Server(Hono) + Web Dashboard(Next.js) + DB(Cloudflare D1/SQLite) + 인증 + 에이전트 오케스트레이션
- **Git hook 우회 금지**: `--no-verify` 비율 < 20% 목표. hook 실패 시 human escalation
- **NL→Spec 변환**: ✅ 구현 완료 (Sprint 8, POST /spec/generate + 충돌 감지)
- **메타데이터 저장**: Phase 1은 DB 없이 `.foundry-x/` 디렉토리에 JSON 파일로 저장
- **status Triangle Health Score**: `foundry-x status`에 Spec↔Code↔Test 건강도 점수 표시 (Gemini 권고)
- **자동 커밋 절대 금지**: NL→Spec 변환 결과는 반드시 사람이 확인 후 커밋

## Deployment

```bash
# API 배포 (Workers)
cd packages/api && wrangler deploy             # 프로덕션 배포
wrangler d1 migrations apply --remote          # D1 마이그레이션 적용

# Web 배포 (Pages — GitHub 연동 자동 배포, 수동 시)
cd packages/web && npx @cloudflare/next-on-pages && wrangler pages deploy .vercel/output/static
```

- **Workers**: `foundry-x-api.ktds-axbd.workers.dev` (Hono, wrangler deploy)
- **Pages**: `fx.minu.best` (Next.js, CNAME → Cloudflare Pages)
- **D1**: 34개 마이그레이션 (`packages/api/src/db/migrations/`), `wrangler d1 migrations apply --remote`
- **CORS 주의**: Pages→Workers 크로스오리진 — `packages/api/src/app.ts`에 CORS 미들웨어 필수
- **API URL**: `NEXT_PUBLIC_API_URL` 환경변수 — Workers URL + `/api` 경로 포함 필수
- **Secrets**: `wrangler secret put` — JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

## Dev Tools (Track B — Agent Evolution)

### gstack 스킬 (F153)
`~/.claude/skills/gstack`에 설치된 역할 기반 AI 스킬 팩 (MIT, garrytan/gstack).
주요 스킬과 용도:

| 스킬 | 역할 | 언제 사용 |
|------|------|-----------|
| `/office-hours` | CEO/PM | 아이디어 검토, 문제 재정의 |
| `/plan-ceo-review` | CEO | 전략 수준 플랜 리뷰 |
| `/plan-eng-review` | Eng Manager | 아키텍처/실행 계획 리뷰 |
| `/review` | Code Reviewer | PR 리뷰 (diff 기반) |
| `/qa` | QA Lead | 브라우저 QA 테스트 + 버그 수정 |
| `/ship` | Release Engineer | PR 생성 + 테스트 + CHANGELOG |
| `/retro` | Eng Manager | 주간 개발 통계/회고 |
| `/codex` | Adversarial Reviewer | 독립적 2nd opinion |
| `/investigate` | Debugger | 체계적 디버깅 (근본 원인 분석) |
| `/design-review` | Designer | 시각적 QA (디자인 슬롭 검출) |

**bkit과의 역할 분담:** PDCA/세션/요구사항 관리는 bkit, 코드 품질/QA/설계 검토는 gstack. 배포는 bkit(Cloudflare 특화) 우선.

### claude-code-router (F154)
`npm install -g @musistudio/claude-code-router`로 설치된 멀티모델 라우팅 프록시.
설정: `~/.claude-code-router/config.json`

```bash
ccr start          # 프록시 서버 시작
ccr status         # 상태 확인
ccr model          # 모델 선택 UI
```

라우팅 룰: default→Sonnet, thinking→Sonnet, background→DeepSeek
프로바이더: OpenRouter(300+ 모델) + Anthropic Direct(Fallback)

### OpenRouter (F155)
API 키: `.dev.vars`의 `OPENROUTER_API_KEY` (환경변수 인터폴레이션으로 config.json에서 참조)

## 성공 지표 (구현 시 참고)

| 지표 | 목표 |
|------|------|
| CLI 주간 호출/사용자 | 10회+ |
| `--no-verify` 우회 비율 | < 20% |
| sync 후 수동 수정 파일 | 감소 추세 |
| 결정 승인율 | > 70% |
