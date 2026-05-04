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

Phase 1~46 완료 + Phase 47 진행 (Sprint 1~335, F589 ✅). 상세: SPEC.md §5
- **Phase 37: Work Lifecycle Platform** ✅ (F516~F518, Sprint 273~275). PRD: `docs/specs/fx-work-lifecycle-platform/prd-final.md`
- **Phase 38: Dashboard Overhaul** ✅ (F519, Sprint 276 PR #543)
- **Phase 39: MSA Walking Skeleton** ✅ (F520~F523). F520/F521 Sprint 268, F522/F523 Sprint 277 PR #544. PRD: `docs/specs/fx-msa-roadmap/prd-final.md`
- **Phase 40: Agent Autonomy** ✅ (F524~F526, Sprint 278~279)
- **Phase 41: HyperFX Agent Stack** ✅ (F527~F530, Sprint 280~283). PRD: `docs/specs/fx-hyperfx-agent-stack/prd-final.md`
- **Phase 42: HyperFX Deep Integration** ✅ (F531~F533, Sprint 284~286). 발굴 Graph 실행 연동 + 스트리밍 E2E + MetaAgent 실전 검증
- **Phase 43: HyperFX Activation** ✅ (F534~F537, Sprint 287~289). Dogfood(KOAMI, S276)에서 확증된 3개 갭 해소 — DiagnosticCollector 훅 / Graph 정식 API+UI / MetaAgent 자동 진단
- **Phase 44: MSA 2차 분리 + Agent 품질 튜닝** 🔧 (F538~F542). F542 ✅ Sprint 290 (MetaAgent 프롬프트 강화 + Sonnet 4.6 + A/B + Rubric, Dogfood P2 PASS 6 proposals), F538~F541 📋 W+6+ 구체화. 관찰: C65 F536 auto-trigger 저장 누락
- **Phase 45: MSA 3rd Separation + SDD Triangle** ✅ (F560~F574). Batch 1 F560 ✅ Sprint 312, Batch 2 F561+F562 ✅ Sprint 313 / F563 ✅ Sprint 314 / F564+F569 ✅ Sprint 315 / F567+F568 ✅ Sprint 316 / F565 ✅ Sprint 317 (Batch 3 SDD Triangle CI, PR #684 Match 100%). Batch 4 F570 ✅ Sprint 318 (S312, PR #687 Match 97%). Batch 5 F572+F574 ✅ Sprint 319 (S313, PR #690 Match 100% + 3 hotfix). **Batch 6 완결**: F571 ✅ Sprint 320 (S314, PR #697 Match 97%, +6472/-9 56 files, autopilot 30분 완결). fx-agent Worker prod LIVE (gateway/agent 401 인증 보호 정상 응답). 잔여 7 routes(agent/streaming/orchestration/captured-engine/derived-engine/skill-registry/skill-metrics)는 Phase 46 deferred
- **Phase 46: Strangler 종결 + Dual-AI 진정 해소** ✅ (F553~F584, Sprint 321~331). F583 ✅ Sprint 330 (services/agent 0 도달, Phase 46 100% literal 종결). F584 ✅ Sprint 331 (services/model-router 정리, autopilot 7분 8초 최단). 16 sprint 연속 성공 (S306~S322): Match 95→100→100→97→98→100→97→97→98→97→100→95+100→97→98→100→98→100% (F560~F584). silent fail layer 1~5 종결 (C103+C104). dual_ai_reviews 누적 16건. v1.9.0 마일스톤 태그
- **Phase 47: Discovery 인프라 회복 + GAP 시리즈** 🔧 (F582~F589, Sprint 328~335). F582 ✅ Sprint 328 (GAP-4 Discovery 인프라 회복). F585 + F586 ✅ Sprint 332 (services/ 루트 agent 7 cleanup + GAP-2 output_tokens=0 fix). F587 ✅ Sprint 333 (services/ dead code 2 git rm + 도메인 이동 2). F588 ✅ Sprint 334 (work 도메인 본격 분리, routes 2 + services 2 → core/work/). F589 ✅ Sprint 335 (worktree-manager → core/harness/services/, 옵션 A 15회차, autopilot ~8분, services/ 27→26). **F586 P-m 진정 충족 ✅ (S326)**: 운영자 KOAMI Dogfood 1회 실행 → agent_run_metrics 125→134 (+9 stages output_tokens 1104~2313 정확 기록), GAP-2 진정 종결 확정. 19 세션 연속 성공 (S306~S326). 잔존: GAP-3 27 stale proposals 검토 / 모델 A/B Opus 4.7 vs Sonnet 4.6 / F590 pm-skills 4 files / F591 prd/prototype 7 files
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

## MSA 원칙 (Phase 43+)

> PRD: `docs/specs/fx-msa-roadmap-v2/prd-final.md` · ESLint 룰: `packages/api/src/eslint-rules/`

### 핵심 규칙 (F534 이후 모든 신규 코드 적용)

1. **`core/{domain}/` 전용** — 신규 파일은 `packages/api/src/core/{domain}/` 하위에만 추가. `routes/`, `services/` 루트 직접 추가 금지.
2. **도메인 간 import 금지** — `core/agent/*`에서 `core/discovery/*` 내부 import 차단. 예외: 상대방 도메인의 `types.ts`(contract) 파일만 허용.
3. **Hono sub-app 패턴** — `core/{domain}/routes/index.ts`에서 sub-app 구성 후, `app.ts`에는 `app.route('/api/{domain}', subApp)` 1줄만 등록.

### 자동 강제 (PR CI)
- `foundry-x-api/no-cross-domain-import` — 도메인 경계 위반 `error`
- `foundry-x-api/no-direct-route-register` — app.ts 직접 등록 `error`

### 예시

```typescript
// ❌ 금지: core/ontology/routes/extract.ts에서 discovery 내부 직접 import
import { discoveryService } from '../../discovery/services/discovery.service.js';

// ✅ 허용: types.ts (contract) import
import type { DiscoveryResult } from '../../discovery/types.js';

// ❌ 금지: app.ts 직접 등록
app.post('/api/ontology/extract', handler);

// ✅ 필수: sub-app mount
import { ontologyApp } from './core/ontology/routes/index.js';
app.route('/api/ontology', ontologyApp);
```

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
