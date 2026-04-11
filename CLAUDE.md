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

## Development Commands

```bash
pnpm install && turbo build    # 전체 빌드
turbo test / lint / typecheck  # 전체 검증
# 패키지별: cd packages/{cli|api|web} → pnpm test / pnpm typecheck / pnpm dev
# E2E: cd packages/web && pnpm e2e
```

## Current Phase

Phase 1~32 완료 (Sprint 1~248). Phase 32 Work Management 7/7 ✅ (F501~F507). Phase 32-E (F508 통합 정합성) 🔧 진행. 상세: SPEC.md §5
- 신규 backlog 대기 (📋 4건: F112/F117/F118/F245, 모두 장기)
- 수치: `/ax:daily-check` 또는 SPEC.md §2 (하드코딩 금지)

## Deployment

- **자동**: master push → `deploy.yml` (D1 migration + Workers deploy + smoke test)
- **수동 API**: `cd packages/api && npx wrangler d1 migrations apply foundry-x-db --remote && npx wrangler deploy`
- **수동 Web**: `cd packages/web && pnpm build && npx wrangler pages deploy dist --project-name=foundry-x-web`
- **긴급 migration**: `./scripts/d1-migrate-remote.sh`
- Workers: `foundry-x-api.ktds-axbd.workers.dev` / Pages: `fx.minu.best`
- Secrets: `wrangler secret put` — JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_*, OPENROUTER_API_KEY

## Key References

- 현행 PRD: `docs/specs/prd-v8-final.md` (v8)
- AX BD: `docs/specs/ax-bd-atoz/prd-final.md` + `docs/specs/axbd/`
- PRD 목록: `docs/specs/*/prd-final.md` (Phase별)
- 기술 결정: `docs/02-design/features/tech-stack-review.design.md`

## Gotchas

- CORS: `packages/api/src/app.ts` 미들웨어 필수, `VITE_API_URL`에 `/api` 포함 필수
- D1 migration 새 번호: `ls packages/api/src/db/migrations/*.sql | sort | tail -1`
- D1 중복 번호 존재 (0040/0075/0082 각 2개, remote 적용 완료)
- PostToolUse hook: .ts/.tsx 편집 시 eslint --fix (15s) + typecheck (60s) 자동 실행
