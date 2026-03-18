# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry-X(파운드리엑스)는 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼이에요.
핵심 철학: **"Git이 진실, Foundry-X는 렌즈"** — 모든 명세/코드/테스트/결정 이력은 Git에 존재하고, Foundry-X는 이를 읽고 분석하고 동기화를 강제하는 레이어예요.

**현재 상태:** v1.2.0 — Phase 2 Sprint 14 완료 (MCP Resources+멀티 에이전트 동시 PR, Match Rate 92%, 429 tests + 20 E2E)

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

### Phase 2 (Sprint 14 완료): API Server + Web Dashboard
- packages/api: Hono API 서버 (50 endpoints OpenAPI, 19 services, 278 테스트)
- packages/web: Next.js 14 대시보드+랜딩 (9 pages, 45 테스트, shadcn/ui, Digital Forge, Playwright 20 E2E)
- Sprint 12 완료: ouroboros Ambiguity Score + Generative UI + MCP 실 구현 + 테스트 354건
- Sprint 13 완료: MCP Sampling/Prompts + 에이전트 자동 PR + v1.1.0 (388 tests)
- Sprint 14 완료: MCP Resources + 멀티 에이전트 동시 PR + v1.2.0 (429 tests)
- 다음 단계: Phase 3 (멀티테넌시 + 외부 도구 연동)

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
│   │       ├── routes/     # 12개: agent, auth, freshness, health, integrity, mcp, profile, requirements, spec, token, webhook, wiki
│   │       ├── services/   # 19개: github, kv-cache, spec-parser, health-calc, integrity-checker, freshness-checker, sse-manager, llm, wiki-sync, agent-orchestrator, agent-runner, claude-api-runner, conflict-detector, mcp-adapter, mcp-registry, mcp-runner, mcp-transport, execution-types, logger
│   │       ├── schemas/    # 12개 Zod 스키마
│   │       └── index.ts
│   ├── web/                # Next.js 14 Dashboard + Landing (Phase 2)
│   │   └── src/
│   │       ├── app/(landing)/  # 랜딩 페이지 (Navbar + Footer)
│   │       ├── app/(app)/      # 대시보드 (Sidebar): dashboard, agents, architecture, tokens, wiki, workspace, spec-generator
│   │       ├── components/     # feature + landing + ui 컴포넌트
│   │       └── lib/            # api-client, sse-client
│   └── shared/             # 공유 타입 (types.ts, web.ts, agent.ts)
├── docs/
│   ├── 01-plan/            # PLAN 문서
│   ├── 02-design/          # DSGN 문서
│   ├── 03-analysis/        # 갭 분석 문서
│   ├── 04-report/          # PDCA 완료 보고서
│   ├── specs/              # PRD v4, dev-transparency-spec, interview-log
│   ├── review/             # AI 검토 (round-1, round-2)
│   └── archive/            # 구버전 PRD (v1~v3)
├── package.json            # 루트 (pnpm workspace)
├── pnpm-workspace.yaml
└── turbo.json
```

## Key Documents

| 문서 | 용도 |
|------|------|
| `docs/specs/prd-v4.md` | 현행 PRD (권위 문서, v4: synthnoosh harness bootstrap 반영) |
| `docs/specs/dev-transparency-spec.md` | 개발 투명성 스펙 |
| `docs/specs/interview-log.md` | 요구사항 인터뷰 종합 (Part 1-5) |
| `docs/02-design/features/tech-stack-review.design.md` | 기술 스택 결정 근거 |
| `docs/02-design/features/mcp-protocol.design.md` | MCP 프로토콜 설계 |
| `docs/01-plan/features/sprint-{N}.plan.md` | Sprint별 Plan (3~14) |
| `docs/02-design/features/sprint-{N}.design.md` | Sprint별 Design (3~14) |
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
pnpm test                         # vitest run
pnpm test -- --grep "Header"      # 특정 테스트 필터
pnpm lint                         # eslint src/ (flat config)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # tsx src/index.ts (개발 실행)

# API 패키지 단독
cd packages/api
pnpm test                         # vitest run (203 tests)
pnpm test -- --grep "agent"       # 특정 테스트 필터
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # 로컬 서버 실행

# Web 패키지 단독
cd packages/web
pnpm test                         # vitest run (45 tests)
pnpm typecheck                    # tsc --noEmit
pnpm dev                          # Next.js dev server (localhost:3000)
pnpm e2e                          # Playwright E2E (20 specs)
```

## Testing

- **Runner:** Vitest 3.x (`vitest.config.ts` in packages/cli)
- **UI 테스트:** ink-testing-library — `render()` → `lastFrame()` → assertion
- **Test Data:** `packages/cli/src/ui/__tests__/test-data.ts` — 중앙 fixture factory (`make*()` + spread override)
- **TSX 지원:** vitest.config에 `.test.tsx` 패턴 포함, tsconfig에 `jsx: "react-jsx"`
- **Mock 전략:** Ink 컴포넌트는 실제 렌더링, 외부 서비스만 mock
- **API 테스트:** Hono `app.request()` 직접 호출 방식, D1 mock은 in-memory SQLite
- **E2E 테스트:** Playwright (`packages/web/e2e/`), 20 specs, `pnpm e2e`로 실행

## Current Phase

- **Phase 1:** ✅ 완료 — Go 판정 (2026-03-17), v0.5.0
  - Sprint 1~5 전체 완료, F-item 36/36 DONE, PDCA 93~97%
- **Phase 2:** ✅ 완료 (Sprint 6~14) — v1.2.0
  - Sprint 6~12: 인프라→OpenAPI→서비스→SSE→프로덕션→에이전트→MCP→ouroboros→GenUI (84%→93%)
  - Sprint 13: MCP Sampling/Prompts(91%) + 에이전트 자동 PR(93%), Agent Teams W1+W2, v1.1.0
  - Sprint 14: MCP Resources(92%) + 멀티 에이전트 동시 PR(92.5%), Agent Teams W1+W2×2, v1.2.0
  - 최종: 19 services, 50 endpoints, 429 tests (CLI 106 + API 278 + Web 45) + 20 E2E
  - PDCA 문서: `docs/archive/2026-03/sprint-{N}/` (Sprint 3~13 archived), Sprint 14 active

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

## 성공 지표 (구현 시 참고)

| 지표 | 목표 |
|------|------|
| CLI 주간 호출/사용자 | 10회+ |
| `--no-verify` 우회 비율 | < 20% |
| sync 후 수동 수정 파일 | 감소 추세 |
| 결정 승인율 | > 70% |
