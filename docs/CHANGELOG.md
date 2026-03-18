# Changelog

All notable changes to the Foundry-X project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

### 세션 33 (2026-03-18)
**Sprint 12 REQ 등록 — ouroboros 패턴 + Generative UI 리서치**:
- ✅ F59 등록 (FX-REQ-059, P1): ouroboros 패턴 차용 — Ambiguity Score + Socratic 질문법 + 3-stage Evaluation
- ✅ F60 등록 (FX-REQ-060, P1): Generative UI 도입 — CopilotKit useComponent 패턴, sandboxed iframe
- ✅ GitHub Issue #58, #59 생성 + Org Project 동기화
- ✅ SPEC.md v2.7 — Sprint 12 섹션 + Execution Plan 추가

---

## [0.11.0] - 2026-03-18

### Summary
**Sprint 11 완료** — SSE 실시간 이벤트(F55, 95%) + E2E 테스트 고도화(F56, 88%) + 배포 자동화(F57, 100%) + MCP 설계(F58, 91%). Overall Match Rate 93%, 14 신규 API 테스트 + 8 E2E specs (총 290 + 18 E2E).

### Added
- **F55 SSE 이벤트 완성** (Match Rate 95%)
  - SSEManager.pushEvent() — subscribers Pub/Sub + taskId 기반 dedup (60초 TTL)
  - agent.task.started/completed 이벤트 → `event: status` 래핑으로 SSEClient 호환
  - AgentOrchestrator SSEManager 옵셔널 주입 + executeTask() step 3.5/6.5 이벤트 발행
  - agents/page.tsx onStatus/onError 핸들러 + taskStates Map + SSE 연결 인디케이터
  - AgentCard taskStatus prop + running 상태 스피너
  - routes/agent.ts SSEManager 공유 인스턴스 (Workers isolate 싱글턴)
  - shared/agent.ts TaskStartedData/TaskCompletedData/AgentTaskStatus 타입
- **F56 E2E 테스트 고도화** (Match Rate 88%)
  - agent-execute.spec.ts: 에이전트 실행→결과, 비활성화, 에러 E2E 3건
  - conflict-resolution.spec.ts: 충돌 없음, 감지, 해결 E2E 3건
  - sse-lifecycle.spec.ts: SSE 연결 UI, 카드 상태 배지 E2E 2건
  - agent-execute-integration.test.ts: SSE 이벤트 발행 검증 API 통합 5건
  - conflict-resolution-integration.test.ts: generate→detect→resolve 흐름 4건
- **F57 프로덕션 배포 자동화** (Match Rate 100%)
  - wrangler.toml ENVIRONMENT=production var + staging 환경 분리
  - deploy.yml PR→staging 자동 배포 + master→production 자동 배포
  - smoke-test.sh 에이전트 runners + SSE 연결 검증 추가
- **F58 MCP 설계** (Match Rate 91%)
  - mcp-adapter.ts McpMessage/McpResponse 프로토콜 타입 + TASK_TYPE_TO_MCP_TOOL 매핑 상수
  - mcp-protocol.design.md MCP 1.0 프로토콜 연동 설계 문서 (FX-DSGN-012)
  - mcp-adapter.test.ts 매핑+타입 검증 2건

### Changed
- SSEManager: D1 폴링 + pushEvent() 하이브리드 모드 (기존 폴링은 fallback 유지)
- AgentOrchestrator: constructor에 SSEManager 옵셔널 주입 (하위 호환)
- agents/page.tsx: SSE 이벤트 기반 실시간 task 상태 UI (모달 콜백 → SSE 전환)

### PDCA
- Plan: FX-PLAN-011 | Design: FX-DSGN-011 | Analysis: FX-ANLS-011 | Report: FX-RPRT-013
- Agent Teams: W1(SSE Backend) + W2(E2E Tests) + Leader — 파일 충돌 0건
- Gap Analysis: 초기 88% → Iteration 1 → 93%

---

## [0.10.0] - 2026-03-18

### Summary
**Sprint 10 완료** — 프로덕션 실배포(F52, 97%) + 에이전트 실행 엔진(F53, 92%) + NL→Spec 충돌 감지(F54, 94%). Overall Match Rate 93%, 35 신규 테스트 추가 (총 276).

### Added
- **F52 프로덕션 실배포** (Match Rate 97%)
  - Cloudflare Workers secrets 4개 설정 (JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY)
  - D1 migration 0001~0004 remote 적용
  - Workers 배포 완료: https://foundry-x-api.ktds-axbd.workers.dev
  - Pages 배포 완료: https://fx.minu.best (커스텀 도메인)
  - smoke test 전체 통과 (health, auth, spec-generate, SSE)
- **F53 에이전트 실연동** (Match Rate 92%)
  - AgentRunner interface + ClaudeApiRunner 구현 (taskType: code-review, code-generation, spec-analysis, test-generation)
  - createAgentRunner() factory: ANTHROPIC_API_KEY 유무 기반 runner 선택
  - MCP 어댑터 인터페이스 설계 (Sprint 11+ 구현 대비)
  - AgentOrchestrator.executeTask() 메서드 추가
  - 3 API endpoints: POST /agents/{id}/execute, GET /agents/runners, GET /agents/tasks/{taskId}/result
  - D1 migration 0005: agent_tasks 확장 + spec_conflicts 테이블
  - AgentExecuteModal + AgentTaskResult 대시보드 컴포넌트
  - 12 테스트 (ClaudeApiRunner 9 + MockRunner 3)
- **F54 NL→Spec 충돌 감지** (Match Rate 94%)
  - ConflictDetector 2-phase: Phase 1 규칙 기반(제목 유사도, 의존성, 우선순위, 범위) + Phase 2 LLM 보강
  - 4가지 충돌 유형: direct, dependency, priority, scope (severity: critical/warning/info)
  - Jaccard similarity + 불용어 제거 (영어/한국어)
  - 2 API endpoints: POST /spec/conflicts/resolve, GET /spec/existing
  - spec.ts 라우트 확장: POST /spec/generate에 conflicts 필드 추가
  - ConflictCard + ConflictResolver 대시보드 컴포넌트
  - type 한국어화 (직접 충돌, 의존성 충돌, 우선순위 충돌, 범위 충돌)
  - 10 테스트 (detect 5 + overlap 4 + existing 1)
- API 테스트 +35 (241→276), 합계 276 (CLI 106 + API 136 + Web 34)
- D1 테이블 +1 (9→10), API 엔드포인트 +5 (23→28)

### Changed
- OpenAPI info version: 0.9.0 → 0.10.0
- agent_sessions: project_id 컬럼 추가 (multi-project 대비)
- agent_tasks: task_type, result, tokens_used, duration_ms, runner_type 컬럼 추가
- wrangler.toml: 배포 환경 변수 확인 (ENVIRONMENT 추가 예정)

### Deferred to Sprint 11
- SSE agent.task.started/completed 이벤트 전파
- agents/page.tsx SSE task 이벤트 핸들링 (task.started → running 상태 업데이트)
- wrangler.toml ENVIRONMENT var 추가 (Low priority)
- resolve 핸들러 resolved_by userId 기록 (감사 추적용)

---

## [0.9.0] - 2026-03-18

### Summary
**Sprint 9 완료** — 프로덕션 배포 파이프라인(F48, 97%) + Playwright E2E(F49, 92%) + 에이전트 오케스트레이션 기초(F50, 91%) + 옵저버빌리티(F51, 95%). Overall Match Rate 94%.

### Added
- **F48 프로덕션 배포 파이프라인** (Match Rate 97%)
  - deploy.yml: Pages deploy job + smoke-test job 추가 (4-job CI/CD)
  - `scripts/smoke-test.sh`: 배포 후 자동 검증 5 checks (API health, requirements, agents, web landing, dashboard)
  - `docs/guides/deployment-runbook.md`: 8섹션 배포 가이드 (secrets, migration, rollback, troubleshooting)
- **F49 E2E 테스트 인프라** (Match Rate 92%)
  - Playwright config + 5 E2E specs (landing, auth-flow, dashboard, agents, spec-generator)
  - Auth fixture: JWT 기반 인증 테스트 헬퍼
  - API 통합 테스트 4개 (auth-profile, wiki-git, spec-generate, agent-sse)
  - `.github/workflows/e2e.yml`: PR 트리거 E2E CI
- **F50 에이전트 오케스트레이션 기초** (Match Rate 91%)
  - D1 migration 0004: agents, agent_capabilities, agent_constraints, agent_tasks 4테이블
  - 11 seed constraint rules (PRD §7.2-C Always/Ask/Never 기반)
  - AgentOrchestrator service: checkConstraint, listAgents, getCapabilities, createTask, listTasks
  - ConstraintGuard middleware: X-Agent-Id/X-Agent-Action 헤더 기반 제약 검증
  - 4 API endpoints: capabilities, tasks GET/POST, constraints/check
  - 6 orchestration 타입 (shared/agent.ts)
- **F51 옵저버빌리티** (Match Rate 95%)
  - `/health/detailed`: D1/KV/GitHub 인프라 상태 상세 체크
  - Logger service: 구조화 JSON 로깅 (level, message, context, timestamp, requestId)
  - DetailedHealth Zod schema
  - GitHubService.getRateLimit() 추가
- API 테스트 +25 (76→101), 합계 241 (CLI 106 + API 101 + Web 34)
- D1 테이블 +3 (6→9), API 엔드포인트 +4 (19→23)

### Changed
- OpenAPI info version: 0.8.0 → 0.9.0
- CLAUDE.md: Sprint 9 완료 상태 반영

---

## [0.8.0] - 2026-03-18

### Summary
**Sprint 8 완료** — 서비스 레이어 9개 도입(F41, 95%) + SSE D1 폴링(F44, 92%) + NL→Spec LLM 통합(F45, 96%) + Wiki Git 동기화(F46, 94%) + fx.minu.best 프로덕션 사이트(F47, 90%). Overall Match Rate 93%.

### Added
- **F41 API 실데이터 완성** (Match Rate 95%)
  - `services/` 디렉토리 신설: 9개 서비스 클래스 (github, kv-cache, spec-parser, health-calc, integrity-checker, freshness-checker, sse-manager, llm, wiki-sync)
  - requirements/health/integrity/freshness 라우트 → 서비스 호출 + mock fallback 패턴
  - env.ts: CACHE(KV), AI(Workers AI), ANTHROPIC_API_KEY, WEBHOOK_SECRET 바인딩
- **F44 SSE 실시간 통신** (Match Rate 92%)
  - SSEManager: D1 agent_sessions 폴링, 3 이벤트 타입 (activity/status/error)
  - Web SSEClient: auto-reconnect, disposed guard
- **F45 NL→Spec 변환** (Match Rate 96%)
  - LLMService: Workers AI (Llama 3.1) + Claude fallback
  - `POST /api/spec/generate` + schemas/spec.ts
  - Web spec-generator 페이지: 입력 폼 + 결과 미리보기 + 클립보드 복사
- **F46 Wiki Git 동기화** (Match Rate 94%)
  - WikiSyncService: pushToGit + pullFromGit
  - Webhook 라우트: HMAC-SHA256 검증 + master branch 필터
  - wiki.ts waitUntil Git push 통합
- **F47 Production Site Design** (Match Rate 90%)
  - Next.js Route Groups: `(landing)/` + `(app)/` 레이아웃 분리
  - 랜딩 페이지 6섹션: Hero, Features, How It Works, Testimonials, Pricing, CTA
  - Digital Forge 디자인: Syne + Plus Jakarta Sans + JetBrains Mono, amber 액센트
  - Navbar (스크롤 반응형 + 모바일 드로어) + Footer (3컬럼)
  - Cloudflare Pages wrangler.toml + _redirects 프록시
- D1 마이그레이션: wiki_pages slug UNIQUE index, agent_sessions progress 컬럼
- API 테스트 +33 (43→76), Web 테스트 +7 (27→34), 합계 216

### Changed
- Dashboard 경로: `/` → `/dashboard` (Route Groups 분리)
- Sidebar 로고: `span` → `Link href="/dashboard"`
- API 서비스 패턴: 라우트 인라인 로직 → 서비스 계층 DI

### Fixed (세션 #25 코드 리뷰)
- Webhook: 더블 바디 소비 수정 (ReadableStream 한 번만 읽기)
- SSEManager: safeEnqueue 가드로 타이머 누수 및 enqueue-after-close 방지
- requirements: GET에서 statusOverrides 적용 (PUT no-op 문제)
- LLMService: Claude model ID 수정 (claude-haiku-4-5-20250714)
- WikiSyncService: slug 경로 순회 방지 ([\w-]+ 검증)
- KVCacheService: JSON.parse 실패 시 null 반환 (cache miss fallback)
- spec route: 생성자 dead try/catch 제거

---

## [0.7.0] - 2026-03-17

### Summary
**Sprint 7 완료** — OpenAPI 3.1 전환(F38, 98%) + D1 실데이터 연동(F41, 72%) + shadcn/ui(F42, 95%) + 테스트 강화(F43, 90%). Agent Teams 병렬 실행. Overall Match Rate 89%.

### Added
- **F38 OpenAPI 전환** (Match Rate 98%)
  - OpenAPIHono + createRoute: 9개 라우트 17 endpoints 전환
  - Zod 스키마 10파일 21개 (`packages/api/src/schemas/`)
  - `app.doc("/api/openapi.json")` 자동 스펙 생성
  - validationHook: Zod 에러 → `{ error: "message" }` 정규화

- **F41 D1 실데이터 연동** (Match Rate 72%)
  - auth/wiki/token/agent 라우트 D1 전환
  - data-reader.ts 제거, env.ts 추가
  - requirements는 mock 유지 (Sprint 8 잔여)

- **F42 shadcn/ui 디자인 시스템** (Match Rate 95%)
  - shadcn/ui 9개 컴포넌트, 다크모드, 반응형 사이드바
  - globals.css + theme-provider + theme-toggle

- **F43 테스트 스위트 강화** (Match Rate 90%)
  - D1 mock 인프라 (better-sqlite3 MockD1Database shim)
  - auth.test.ts (8), middleware.test.ts (7) 신규
  - Web 컴포넌트 테스트 21개로 확장

- **D1 프로덕션 배포 검증** (Session 19)
  - D1 `foundry-x-db` 생성 (APAC/ICN)
  - Workers 배포: `https://foundry-x-api.ktds-axbd.workers.dev`

### Changed
- deploy.yml: deploy-web 잡 제거 (Pages 토큰 권한 미확보, 나중에 재추가)
- 176/176 테스트 pass (CLI 106 + API 43 + Web 27)
- CHANGELOG.md 통합: 세션 기반 + 릴리스 기반 → 릴리스 단위 통합본

### Notes
- PDCA: Agent Teams(W1:API + W2:Web) 병렬, 1회 iteration (76%→89%)
- SPEC.md v1.8→v1.9: Sprint 7 완료 + Sprint 8 계획

---

## [0.6.0] - 2026-03-17

### Summary
**Phase 2 Sprint 6 완료** — Cloudflare 인프라 기반 구축 (F37 배포 + F39 D1 스키마 + F40 JWT 인증 + RBAC). F38 OpenAPI는 복잡도 증가로 Sprint 7 이관. 전체 Match Rate 84% (F37+F39+F40 범위 96%).

### Added
- **Cloudflare Workers 배포 파이프라인** (F37, 92%)
  - `wrangler.toml` — D1 바인딩 + env 설정
  - `.github/workflows/deploy.yml` — CI/CD (typecheck/lint/test/deploy)
  - `src/index.ts` — Workers entry point (`export default app`)
  - Hono + Workers 네이티브 지원

- **D1 데이터베이스** (F39, 97%)
  - `src/db/schema.ts` — Drizzle ORM 스키마 (6 테이블)
    - `users` (인증 + RBAC), `projects` (Git 리포 연결)
    - `wiki_pages` (Wiki CRUD), `token_usage` (AI 비용 추적)
    - `agent_sessions` (에이전트 작업), `refresh_tokens` (JWT 회전)
  - `src/db/migrations/0001_initial.sql` — 초기 DDL (6 테이블 + 6 인덱스)
  - `src/db/seed.sql` — 샘플 데이터 (admin + Foundry-X 프로젝트)

- **JWT 인증 + RBAC** (F40, 100%)
  - `src/routes/auth.ts` — auth 라우트 (signup/login/refresh)
  - `src/middleware/auth.ts` — JWT 검증 + Access Token 1h / Refresh Token 7d
  - `src/middleware/rbac.ts` — admin / member / viewer 3등급
  - `src/utils/crypto.ts` — PBKDF2 비밀번호 해싱 (Web Crypto API)

- **API 인증 적용**
  - GET 엔드포인트: `viewer` 역할
  - POST/PUT/DELETE: `member` 역할
  - Public: /api/health, /api/auth/*, /api/docs, /api/openapi.json

- **Swagger UI**
  - `/api/docs` — Swagger UI, `/api/openapi.json` — OpenAPI 3.1 spec

- **DB 관리 스크립트**: db:migrate:local, db:migrate:remote, db:seed:local

### Changed
- 개발 워크플로우: `turbo dev` → `wrangler dev` (D1 로컬 포함)
- `app.use("/api/*", authMiddleware)` — 전역 JWT 검증
- `@hono/node-server` → devDependencies 이동
- .gitignore: .js 빌드 아티팩트 + .next/ 추가

### Fixed
- wiki/requirements 라우트에 RBAC 미들웨어 누락 수정
- authMiddleware 전역 미적용 해소

### Removed
- 프로토타입 mock auth routes (auth.ts로 통합)

### Notes
- PDCA: Plan→Design→Do(Agent Teams ×2)→Check(61%)→Iterate ×2(84%)→Report
- 145/145 테스트 pass (CLI 106 + API 39)

---

## [0.5.0] - 2026-03-17

### Summary
**Phase 1 MVP 완료** — Sprint 5 Part A (F26~F31) + Go 판정. CLI v0.5.0, 36/36 F-items DONE, PDCA 93~97%.

### Added
- **API 서버** — packages/api: Hono, 8 routes, 15 endpoints, data-reader 서비스
- **웹 대시보드** — packages/web: Next.js 14, 6 pages, 7 Feature 컴포넌트
  - F26 대시보드: SDD Triangle + Sprint + Harness Health 위젯
  - F27 Wiki: CRUD + D3 소유권 마커 보호
  - F28 아키텍처 뷰: ModuleMap + Diagram + Roadmap + Requirements 4탭
  - F29 워크스페이스: ToDo + Messages + Settings (localStorage)
  - F30 Agent 투명성: AgentCard 3소스 통합 + SSE EventSource
  - F31 Token 관리: Summary + 모델/Agent별 비용 테이블
- **공유 타입** — packages/shared: web.ts(6) + agent.ts(9) = 15 신규 타입
- **테스트 강화** — API 38테스트 + Web 18테스트 (vitest + @testing-library/react)

### Changed
- app.ts 분리: index.ts에서 Hono app 생성을 분리 (테스트 가능)
- CLI 버전 범프: 0.4.0 → 0.5.0
- requirements 파서: 5컬럼 SPEC 형식 + 이모지 상태 파싱
- Workers types 호환: @cloudflare/workers-types Response.json() 오버라이드

### Notes
- Phase 1 Go 판정 완료 (2026-03-17) — Tech Debt 0건
- 모노리포 4 패키지: cli + shared + api + web
- 162테스트 pass, typecheck ✅, build ✅
- 참고: [Sprint 5 Part B 보고서](04-report/features/sprint-5-part-b.report.md)

---

## [0.4.0] - 2026-03-17

### Summary
**Sprint 5 Part B** — 하네스 산출물 동적 생성 (F32~F36), Builder 패턴. PDCA 93%.

### Added
- Builder 패턴: architecture / constitution / claude / agents 4개 builder
- RepoProfile.scripts 필드 + discover.ts scripts 감지
- generate.ts builder 통합 (builder 있으면 동적, 없으면 템플릿)
- verify.ts 강화: 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증
- harness-freshness.ts: 하네스 문서 신선도 검사 (status 통합)
- CLAUDE.md 품질 감사 (78→91점, Grade B→A)
- Claude Code settings.json: permissions 17 allow + 4 deny
- PreToolUse hook: .env/credentials/lock 파일 보호
- PostToolUse hook: .ts/.tsx 편집 시 auto-typecheck

### Notes
- 22파일 106테스트, typecheck/lint/build 전부 통과

---

## [0.3.1] - 2026-03-16

### Added
- Ink TUI components: Header, StatusBadge, HealthBar, ProgressStep, ErrorBox (F15)
- View components: StatusView, InitView, SyncView (F16-F18)
- render.tsx — TTY/non-TTY 4-branch dispatcher (F20)
- eslint flat config + typescript-eslint (F19, TD-02 resolved)
- GitHub templates: issue + PR templates (F21)
- Sprint 3 PDCA documents (plan, design, analysis, report)

### Changed
- Commands refactored: runStatus/runInit/runSync logic extraction
- npm published: foundry-x@0.3.1

### Fixed
- CLI --version 하드코딩 → 0.3.1 반영

---

## [0.2.0] - 2026-03-16

### Added
- `foundry-x init` — harness detect → generate pipeline (F6)
- `foundry-x sync` — PlumbBridge review integration (F7)
- `foundry-x status` — Triangle Health Score display (F8)
- Harness templates: default (8), kt-ds-sr (4), lint (3) (F9)
- Verification scripts: verify-harness.sh, check-sync.sh (F10)
- npm publish: foundry-x@0.1.1, `npx foundry-x init` support (F11)
- ADR-000: v3 monorepo supersedes legacy multi-repo (F12)
- Internal contracts: Plumb output format (FX-SPEC-002), error handling (FX-SPEC-003) (F13, F14)
- Governance standards compliance (GOV-004/005/007/010)

---

## [0.1.0] - 2026-03-16

### Added
- Monorepo scaffolding: pnpm workspace + Turborepo (F1)
- Shared types module: packages/shared (F2)
- Harness modules: detect, discover, analyze, generate, verify, merge-utils (F3)
- PlumbBridge subprocess wrapper: bridge, errors, types (F4)
- Services: config-manager, health-score, logger (F5)
- Test suite: 8 files, 35 tests (vitest)
