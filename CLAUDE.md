# CLAUDE.md

## Project Overview

Foundry-X — AX 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼.
철학: **"Git이 진실, Foundry-X는 렌즈"** — 명세/코드/테스트/결정 이력은 Git에, Foundry-X는 읽기/분석/동기화 레이어.

## Architecture

모노리포 (pnpm workspace + Turborepo), 4개 패키지:
- **cli** — TypeScript, Commander + Ink 5 TUI (harness/, plumb/, services/, ui/)
- **api** — Hono + Cloudflare Workers + D1 (routes/, services/, schemas/)
- **web** — Vite 8 + React 18 + React Router 7 + Zustand (routes/, components/, lib/)
- **shared** — 공유 타입 (types, web, agent, plugin, sso, methodology, discovery-x, ax-bd, kg)

Plumb: Track A (CLI subprocess 래핑) 유지, Track B (TS 재구현) 대기 중.
멀티 에이전트: Claude Squad (cs v1.0.17) — 세션 lifecycle 표준 관리. `sprint N` → cs 자동 실행.

## Development Commands

```bash
pnpm install && turbo build    # 전체 빌드
turbo test / lint / typecheck  # 전체 검증
# 패키지별: cd packages/{cli|api|web} → pnpm test / pnpm typecheck / pnpm dev
# E2E: cd packages/web && pnpm e2e
```

## Current Phase

Phase 1~36 완료 (Sprint 1~268). 상세: SPEC.md §5
- **Phase 37: Work Lifecycle Platform** ✅ (F516~F518, Sprint 273~275). PRD: `docs/specs/fx-work-lifecycle-platform/prd-final.md`
- **Phase 38: Dashboard Overhaul** ✅ (F519, Sprint 276 PR #543)
- **Phase 39: MSA Walking Skeleton** ✅ (F520~F523). F520/F521 Sprint 268, F522/F523 Sprint 277 PR #544. PRD: `docs/specs/fx-msa-roadmap/prd-final.md`
- **Phase 40: Agent Autonomy** ✅ (F524~F526, Sprint 278~279)
- **Phase 41: HyperFX Agent Stack** ✅ (F527~F530, Sprint 280~283). PRD: `docs/specs/fx-hyperfx-agent-stack/prd-final.md`
- **Phase 42: HyperFX Deep Integration** 📋 (F531~F533, Sprint 284~286). 발굴 Graph 실행 연동 + 스트리밍 E2E + MetaAgent 실전 검증
- 장기 backlog 2건: F112, F117
- 수치: `/ax:daily-check` 또는 SPEC.md §2 (하드코딩 금지)

## Deployment

- **자동**: master push → `deploy.yml` (D1 migration + Workers deploy + smoke test)
- **수동 API**: `cd packages/api && npx wrangler d1 migrations apply foundry-x-db --remote && npx wrangler deploy`
- **수동 Web**: `cd packages/web && pnpm build && npx wrangler pages deploy dist --project-name=foundry-x-web`
- **긴급 migration**: `./scripts/d1-migrate-remote.sh`
- Workers: `foundry-x-api.ktds-axbd.workers.dev` / Pages: `fx.minu.best`
- Secrets: `wrangler secret put` — JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_*, OPENROUTER_API_KEY

## Skill 사용 가이드 (Layer 0 — 직접 호출 6개)

63개 스킬 중 사용자가 직접 호출하는 메인 진입점. 나머지는 자동 호출됨.

| 상황 | 호출 | 자동 연동 |
|------|------|----------|
| 세션 시작 | `/ax:session-start` | 컨텍스트 복원 |
| Feature 개발 | `/ax:sprint N` | plan→design→**TDD**→verify→gap→report→PR |
| 비Feature 작업 | `/ax:task start B/C/X` | WT, Issue, verify |
| 기획부터 시작 | `/ax:req-interview` | PRD, 3-AI 검토, SPEC 등록 |
| 오늘 뭐 할지 | `/ax:todo` | SPEC 스캔, Sprint 배정 → 즉시 실행 연동 |
| 세션 종료 | `/ax:session-end` | 커밋, push, 배포 |

> 세밀한 제어가 필요할 때만: `/tdd red`, `/bkit:pdca analyze`, `/ax:code-verify` 등

### Project Skills (`.claude/skills/`)

| 스킬 | 용도 |
|------|------|
| `/tdd` | TDD Red→Green→Refactor 사이클 오케스트레이터 |
| `/gstack` | Headless browser QA 테스트 + dogfooding |
| `/ai-biz` | AI 사업 분석 11종 서브스킬 |
| `/ax-bd-discovery` | AX BD 2단계 발굴 프로세스 |
| `/ax-bd-shaping` | AX BD 형상화 파이프라인 (Stage 3→4) |
| `/npm-release` | CLI npm 배포 자동화 |

## Key References

- 현행 PRD: `docs/specs/FX-SPEC-PRD-V8_foundry-x.md` (v8)
- AX BD: `docs/specs/ax-bd-atoz/prd-final.md` + `docs/specs/axbd/`
- PRD 목록: `docs/specs/*/prd-final.md` (Phase별)
- 기술 결정: `docs/02-design/features/tech-stack-review.design.md`

## Gotchas

- CORS: `packages/api/src/app.ts` 미들웨어 필수, `VITE_API_URL`에 `/api` 포함 필수
- D1 migration 새 번호: `ls packages/api/src/db/migrations/*.sql | sort | tail -1`
- D1 중복 번호 존재 (0040/0075/0082 각 2개, remote 적용 완료)
- PostToolUse hook: .ts/.tsx 편집 시 eslint --fix (15s) + typecheck (60s) 자동 실행
