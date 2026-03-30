# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry-X(파운드리엑스)는 AX 사업개발 업무의 전체 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼이에요.
핵심 철학: **"Git이 진실, Foundry-X는 렌즈"** — 모든 명세/코드/테스트/결정 이력은 Git에 존재하고, Foundry-X는 이를 읽고 분석하고 동기화를 강제하는 레이어예요.

**현재 상태:** Phase 7 완료 (Sprint 81 완료, ~345 endpoints, 153 services, 2119 API + 149 CLI + 172 Web tests + ~59 E2E) — BD Pipeline E2E 통합
**패키지 버전:** cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0

## Architecture

### 핵심 5축
1. **하네스 구축** — 에이전트가 안정적으로 일할 수 있는 리포 환경 (CLAUDE.md, 린터, CI 등)
2. **SDD Triangle** — Spec(명세) ↔ Code ↔ Test 상시 동기화 (Plumb 엔진 기반)
3. **에이전트 오케스트레이션** — 병렬 작업, 충돌 해결 (Phase 2)
4. **지식 공유 (SSOT)** — Git 리포 = 단일 진실 공급원
5. **협업 워크스페이스** — 웹 대시보드 (Phase 2)

### Phase 1~5 (완료)
- Phase 1~4: CLI + API + Web + 멀티테넌시 + SSO — Phase 5: Agent Evolution + AX BD 통합 + TDD. 상세: SPEC.md §5

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
│   │       ├── routes/     # 63개 — 목록은 `ls packages/api/src/routes/` 참조
│   │       ├── services/   # 153개 — 목록은 `ls packages/api/src/services/` 참조
│   │       ├── schemas/    # 78개 Zod 스키마 — 목록은 `ls packages/api/src/schemas/` 참조
│   │       └── index.ts
│   ├── web/                # Next.js 14 Dashboard + Landing (Phase 2)
│   │   └── src/
│   │       ├── app/(landing)/  # 랜딩 페이지 (Navbar + Footer)
│   │       ├── app/(app)/      # 대시보드 (Sidebar): dashboard, agents, architecture, methodologies, projects, settings, spec-generator, tokens, wiki, workspace
│   │       ├── components/     # feature + landing + ui 컴포넌트
│   │       └── lib/            # api-client, sse-client
│   └── shared/             # 공유 타입 (types.ts, web.ts, agent.ts, plugin.ts, sso.ts)
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

### .claude/ 프로젝트 설정
- `.claude/hooks/` — PostToolUse 외부 스크립트 (post-edit-format.sh, post-edit-typecheck.sh, post-edit-test-warn.sh)
- `.claude/agents/` — 커스텀 에이전트 (deploy-verifier, spec-checker, build-validator)
- `.claude/skills/ax-bd-discovery/` — AX BD 2단계 발굴 프로세스 오케스트레이터 (v8.2)
- `.claude/skills/ai-biz/` — ai-biz 11종 서브스킬 (cost-model, feasibility-study 등)
- `.claude/skills/npm-release/` — npm 배포 스킬
- `.claude/skills/tdd/` — TDD 자동화 스킬 (Red→Green→Refactor)

## Key Documents

| 문서 | 용도 |
|------|------|
| `docs/specs/prd-v8-final.md` | 현행 PRD (권위 문서, v8: AI 에이전트 오케스트레이션 플랫폼) |
| `docs/specs/ax-bd-atoz/prd-final.md` | AX BD A-to-Z PRD (7단계 라이프사이클 + 시스템 통합) |
| `docs/specs/fx-bd-v1/prd-final.md` | BD Pipeline E2E 통합 PRD (Phase 7, 9 F-items) |
| `docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md` | AX BD Ideation MVP PRD (BMC + AI 에이전트) |
| `docs/specs/axbd/` | AX BD 프로세스 v8.2 참고자료 (ai-biz 플러그인 포함) |
| `docs/specs/FX-PLAN-012/` | Phase 6 Ecosystem Integration PRD |
| `docs/specs/dev-transparency-spec.md` | 개발 투명성 스펙 |
| `docs/02-design/features/tech-stack-review.design.md` | 기술 스택 결정 근거 |
| `docs/02-design/features/mcp-protocol.design.md` | MCP 프로토콜 설계 |

## Development Commands

```bash
# 모노리포 전체
pnpm install && turbo build      # 의존성 + 빌드
turbo test                        # 전체 테스트
turbo lint                        # 전체 린트
turbo typecheck                   # 전체 타입체크

# CLI 패키지 단독
cd packages/cli
pnpm test                         # vitest run (125 tests)
pnpm test -- --grep "Header"      # 특정 테스트 필터
pnpm lint                         # eslint src/ (flat config)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # tsx src/index.ts (개발 실행)

# API 패키지 단독
cd packages/api
pnpm test                         # vitest run (2119 tests)
pnpm test -- --grep "agent"       # 특정 테스트 필터
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # 로컬 서버 실행

# Web 패키지 단독
cd packages/web
pnpm test                         # vitest run (172 tests)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # Next.js dev server (localhost:3000)
pnpm e2e                          # Playwright E2E (17 specs, ~59 tests)
```

## Testing

- **Runner:** Vitest 3.x (`vitest.config.ts` in packages/cli)
- **UI 테스트:** ink-testing-library — `render()` → `lastFrame()` → assertion
- **Test Data:** `packages/cli/src/ui/__tests__/test-data.ts` — 중앙 fixture factory (`make*()` + spread override)
- **TSX 지원:** vitest.config에 `.test.tsx` 패턴 포함, tsconfig에 `jsx: "react-jsx"`
- **Mock 전략:** Ink 컴포넌트는 실제 렌더링, 외부 서비스만 mock
- **API 테스트:** Hono `app.request()` 직접 호출 방식, D1 mock은 in-memory SQLite
- **E2E 테스트:** Playwright (`packages/web/e2e/`), 17 specs, `pnpm e2e`로 실행
- **ESLint 커스텀 룰 3종** (packages/api): `no-direct-db-in-route`, `require-zod-schema`, `no-orphan-plumb-import`

## Current Phase

- **Phase 1~5:** ✅ 완료 (Sprint 1~74) — CLI + API + Web + 멀티테넌시 + SSO + Agent Evolution + AX BD 통합 + TDD 자동화
- **Phase 6:** ✅ 완료 (Sprint 75~78) — Ecosystem Integration (BMAD/OpenSpec 벤치마킹)
- **Phase 7:** ✅ 완료 (Sprint 79~81) — BD Pipeline End-to-End 통합 (FX-BD-V1)
- **현재 수치:** ~153 services, ~345 endpoints, 2119 API tests + CLI 149 + Web 172, D1 0001~0074
- **Phase 이력 상세:** SPEC.md §5 참조 | Sprint별 Plan/Design: `docs/01-plan/`, `docs/02-design/`, `docs/archive/`

## Git Workflow

- **Branch Protection**: master에 직접 push 불가 — PR 필수 + 1명 Approve + Linear history
- **Merge 전략**: Squash merge (기본) + Auto-delete branches
- **Remote**: `https://github.com/KTDS-AXBD/Foundry-X.git` (HTTPS, PAT 인증)
- **Sprint Worktree**: `sprint N` bash 명령으로 WT 탭 생성 → Sprint 탭에서 코드 작업 → Master에서 `/ax-sprint merge N`

## Design Decisions & Constraints

- **모노리포 (v3 확정)**: TS+Python 공존, Turborepo + Python 독립 빌드 단위. 안정화 후 분리 가능
- **Git hook 우회 금지**: `--no-verify` 비율 < 20% 목표. hook 실패 시 human escalation
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
- **D1**: 0001~0065 마이그레이션 (`packages/api/src/db/migrations/`), `wrangler d1 migrations apply --remote`
- **Secrets**: `wrangler secret put` — JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

## Dev Tools (Track B — Agent Evolution)

- **gstack**: `/qa`, `/review`, `/ship`, `/investigate` 등 10개 역할 스킬 — QA/코드리뷰/배포용
- **bkit**: PDCA/세션/요구사항 관리 — 배포는 bkit(Cloudflare 특화) 우선
- **claude-code-router**: `ccr start` 멀티모델 프록시 (OpenRouter + Anthropic Direct)

## Gotchas

- **Zone.Identifier**: WSL 환경에서 Windows 파일 복사 시 생성 — `.gitignore`에 `*:Zone.Identifier` 추가 권장
- **CORS**: Pages→Workers 크로스오리진 — `packages/api/src/app.ts` CORS 미들웨어 필수
- **API URL**: `NEXT_PUBLIC_API_URL`에 `/api` 경로 포함 필수 (빠뜨리면 404)
- **D1 migrations**: 로컬 적용 후 `--remote` 반드시 별도 실행 (누락하면 프로덕션 500)
- **PostToolUse hook**: .ts/.tsx 편집 시 자동 eslint --fix + typecheck 실행 (15s/60s timeout)
- **git add**: 절대 `git add .` 금지 — 멀티 pane 환경에서 다른 세션 변경 포함 위험
- **D1 migration 0040 중복**: `0040_prd_reviews.sql`과 `0040_sixhats_debates.sql` 공존 — 새 마이그레이션은 0061부터

## 성공 지표 (구현 시 참고)

| 지표 | 목표 |
|------|------|
| CLI 주간 호출/사용자 | 10회+ |
| `--no-verify` 우회 비율 | < 20% |
| sync 후 수동 수정 파일 | 감소 추세 |
| 결정 승인율 | > 70% |
