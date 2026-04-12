## §5 기능 항목 (F-items)

### Sprint 1 — 완료 (v0.1.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F1 | 모노리포 scaffolding (FX-REQ-001, P1) | v0.1 | ✅ | pnpm workspace + Turborepo |
| F2 | 공유 타입 모듈 (FX-REQ-002, P1) | v0.1 | ✅ | packages/shared (types.ts) |
| F3 | Harness 모듈 (FX-REQ-003, P1) | v0.1 | ✅ | detect, discover, analyze, generate, verify, merge-utils |
| F4 | PlumbBridge subprocess 래퍼 (FX-REQ-004, P1) | v0.1 | ✅ | bridge, errors, types |
| F5 | Services 모듈 (FX-REQ-005, P1) | v0.1 | ✅ | config-manager, health-score, logger |

### Sprint 2 — 완료 (v0.2.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F6 | init 커맨드 구현 (FX-REQ-006, P1) | v0.2 | ✅ | harness pipeline 통합 |
| F7 | sync 커맨드 구현 (FX-REQ-007, P1) | v0.2 | ✅ | PlumbBridge 연동 |
| F8 | status 커맨드 구현 (FX-REQ-008, P1) | v0.2 | ✅ | Triangle Health Score 포함 |
| F9 | 하네스 템플릿 생성 (FX-REQ-009, P1) | v0.2 | ✅ | default + kt-ds-sr + lint |
| F10 | 검증 스크립트 (FX-REQ-010, P2) | v0.2 | ✅ | verify-harness.sh, check-sync.sh |
| F11 | npm publish + 온보딩 (FX-REQ-011, P1) | v0.2 | ✅ | foundry-x@0.1.1, npx init ✅ |

### 완료 (v0.2.0 이후)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F12 | ADR-000 작성 (FX-REQ-012, P2) | v0.2 | ✅ | docs/adr/ADR-000.md |
| F13 | .plumb 출력 + decisions.jsonl 내부 계약 (FX-REQ-013, P2) | v0.2 | ✅ | FX-SPEC-002 |
| F14 | subprocess 오류 처리 계약 (FX-REQ-014, P2) | v0.2 | ✅ | FX-SPEC-003 |

### Sprint 3 — 완료 (v0.3.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F15 | Ink TUI 공통 컴포넌트 (FX-REQ-015, P1) | v0.3 | ✅ | ui/components/ 5개 + ui/render.tsx |
| F16 | status 커맨드 Ink TUI 전환 (FX-REQ-016, P1) | v0.3 | ✅ | StatusView.tsx + runStatus() |
| F17 | init 커맨드 Ink TUI 전환 (FX-REQ-017, P1) | v0.3 | ✅ | InitView.tsx + runInit() |
| F18 | sync 커맨드 Ink TUI 전환 (FX-REQ-018, P1) | v0.3 | ✅ | SyncView.tsx + runSync() |
| F19 | eslint flat config 설정 (FX-REQ-019, P1) | v0.3 | ✅ | TD-02 해소 완료 |
| F20 | non-TTY 폴백 (FX-REQ-020, P2) | v0.3 | ✅ | render.tsx 4-branch dispatch |
| F21 | 프로젝트 관리 점검 및 개선 (FX-REQ-021, P0) | v0.3 | ✅ | GitHub Projects 보드 + Branch Protection + PR/Issue 템플릿 + 온보딩 가이드 (PDCA 90%) |

### Sprint 4 — 완료 (v0.4.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F22 | ink-testing-library 도입 + vitest TSX 설정 (FX-REQ-022, P1) | v0.4 | ✅ | vitest .test.tsx + test-data factory |
| F23 | 공통 컴포넌트 단위 테스트 (FX-REQ-023, P1) | v0.4 | ✅ | 5개 컴포넌트 24 tests |
| F24 | View + render.tsx 통합 테스트 (FX-REQ-024, P1) | v0.4 | ✅ | 3 View + render 12 tests |
| F25 | status --watch 실시간 모니터링 (FX-REQ-025, P1) | v0.4 | ✅ | StatusWatchView + fs.watch + debounce |

### Sprint 5 — Frontend Design + 하네스 확장 (v0.5.0)

**Part A: Frontend Design**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F26 | 팀 정보 공유 대시보드 (FX-REQ-026, P1) | v0.5 | ✅ | Next.js 대시보드 — SDD Triangle + Sprint + Harness Health (PDCA ~90%) |
| F27 | Human Readable Document + Wiki (FX-REQ-027, P1) | v0.5 | ✅ | Wiki CRUD + D3 소유권 마커 보호 (PDCA ~90%) |
| F28 | 아키텍처 뷰 (FX-REQ-028, P1) | v0.5 | ✅ | 4탭: ModuleMap, Diagram, Roadmap, Requirements (PDCA ~90%) |
| F29 | 개인 워크스페이스 (FX-REQ-029, P1) | v0.5 | ✅ | ToDo + Messages + Settings, shared 타입 사용 (PDCA ~90%) |
| F30 | Agent 투명성 뷰 (FX-REQ-030, P1) | v0.5 | ✅ | AgentCard 3소스 통합 + SSE EventSource (PDCA ~90%) |
| F31 | Token/비용 관리 (FX-REQ-031, P1) | v0.5 | ✅ | Summary + 모델/Agent별 비용 테이블 (PDCA ~90%) |

**Part B: 하네스 산출물 확장**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F32 | 동적 ARCHITECTURE.md 생성 (FX-REQ-032, P1) | v0.5 | ✅ | RepoProfile 기반 모듈 맵·레이어·진입점 (PDCA 93%) |
| F33 | 동적 CONSTITUTION.md 생성 (FX-REQ-033, P1) | v0.5 | ✅ | 스택별 Always/Ask/Never 경계 규칙 (Node/Python/Go/Java) |
| F34 | 동적 CLAUDE.md + AGENTS.md 생성 (FX-REQ-034, P1) | v0.5 | ✅ | 빌드/테스트/린트 커맨드 자동 감지 + scripts 필드 |
| F35 | verify.ts 강화 (FX-REQ-035, P1) | v0.5 | ✅ | 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증 |
| F36 | 하네스 신선도 검사 (FX-REQ-036, P2) | v0.5 | ✅ | status에서 하네스 문서 갱신 시점 비교 |

### Phase 2 — API Server + Web Dashboard + 인프라

**Sprint 6 — 인프라 + 인증 (v0.6.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F37 | Cloudflare 배포 파이프라인 (FX-REQ-037, P0) | v0.6 | ✅ | Workers + Pages + D1 + deploy.yml, Match 92% |
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 (FX-REQ-038, P1) | v0.7 | ✅ | createRoute 17 endpoints + Zod 21스키마, Match 98% |
| F39 | D1 스키마 + Drizzle ORM (FX-REQ-039, P1) | v0.6 | ✅ | 6테이블 + 마이그레이션 + seed, Match 97% |
| F40 | JWT 인증 + RBAC 미들웨어 (FX-REQ-040, P1) | v0.6 | ✅ | signup/login/refresh + RBAC 적용, Match 100% |

**Sprint 7 — API 실데이터 + OpenAPI (v0.7.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 (FX-REQ-038, P1) | v0.7 | ✅ | createRoute 17 endpoints + Zod 21스키마, Match 98% |
| F41 | API 엔드포인트 실데이터 연결 (FX-REQ-041, P1) | v0.7 | ✅ | D1 실데이터 전환, Match 72% |
| F42 | shadcn/ui + 웹 컴포넌트 고도화 (FX-REQ-042, P1) | v0.7 | ✅ | shadcn/ui + 다크모드 + 반응형, Match 95% |
| F43 | API + Web 테스트 스위트 (FX-REQ-043, P1) | v0.7 | ✅ | D1 mock + auth/middleware 테스트 176건, Match 90% |

**Sprint 8 — API 완성 + 핵심 기능 (v0.8.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F44 | SSE 실시간 통신 (FX-REQ-044, P1) | v0.8 | ✅ | SSEManager D1 폴링, 3 이벤트 타입, Match 92% |
| F45 | NL→Spec 변환 (FX-REQ-045, P0) | v0.8 | ✅ | LLMService(Workers AI+Claude), Zod 검증, Match 96% |
| F46 | Wiki Git 동기화 (FX-REQ-046, P2) | v0.8 | ✅ | WikiSyncService 양방향, webhook HMAC, Match 94% |
| F47 | Production Site Design — fx.minu.best 랜딩+대시보드 통합 (FX-REQ-047, P1) | v0.8 | ✅ | Route Groups + Digital Forge 디자인, Match 90% |

**Sprint 9 — 프로덕션 배포 + E2E + 에이전트 오케스트레이션 (v0.9.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F48 | 프로덕션 배포 파이프라인 완성 (FX-REQ-048, P0) | v0.9 | ✅ | deploy.yml Pages job + smoke-test.sh + deployment-runbook.md, Match 97% |
| F49 | E2E 테스트 인프라 + 크리티컬 패스 (FX-REQ-049, P1) | v0.9 | ✅ | Playwright config + 5 E2E specs + auth fixture + e2e.yml CI, Match 92% |
| F50 | 에이전트 오케스트레이션 기초 (FX-REQ-050, P1) | v0.9 | ✅ | 0004 migration + agent-orchestrator + constraint-guard + 13 tests, Match 91% |
| F51 | 옵저버빌리티 + 배포 후 검증 (FX-REQ-051, P2) | v0.9 | ✅ | health.ts 상세 + logger.ts + health schema 확장, Match 95% |

**Sprint 10 — 에이전트 실연동 + NL→Spec 충돌 감지 (v0.10.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F52 | 프로덕션 실배포 실행 (FX-REQ-052, P0) | v0.10 | ✅ | Workers secrets + D1 migration remote + deploy + smoke test 검증, Match 97% |
| F53 | 에이전트 실연동 — Claude API + MCP 어댑터 인터페이스 (FX-REQ-053, P0) | v0.10 | ✅ | AgentRunner + ClaudeApiRunner + MCP 어댑터 + 21 tests, Match 92% |
| F54 | NL→Spec 충돌 감지 + 사용자 선택 (FX-REQ-054, P1) | v0.10 | ✅ | ConflictDetector 2-phase + 충돌 UI + 14 tests, Match 94% |

**Sprint 11 — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 (v0.11.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F55 | SSE 이벤트 완성 — 에이전트 작업 실시간 전파 (FX-REQ-055, P1) | v0.11 | ✅ | SSEManager pushEvent + 대시보드 실시간 UI, Match 95% |
| F56 | E2E 테스트 고도화 — 에이전트+충돌 흐름 (FX-REQ-056, P1) | v0.11 | ✅ | Playwright 8 E2E + API 통합 9건, Match 88% |
| F57 | 프로덕션 배포 자동화 — CI/CD 파이프라인 (FX-REQ-057, P2) | v0.11 | ✅ | staging 환경 분리 + PR 트리거 + smoke-test 강화, Match 100% |
| F58 | MCP 실 구현 설계 — McpAgentRunner 계획 (FX-REQ-058, P2) | v0.11 | ✅ | MCP 프로토콜 타입 + 설계 문서 + 매핑 상수, Match 91% |

**Sprint 12 — ouroboros 패턴 + Generative UI + MCP 구현 + v1.0 준비 (v0.12.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F59 | ouroboros 패턴 차용 — Ambiguity Score + Socratic 질문법 + 3-stage Evaluation (FX-REQ-059, P1) | v0.12 | ✅ | ax-14 Ambiguity Score + plan-plus Ontological Q + gap-detector Semantic, Match 100% |
| F60 | Generative UI 패턴 도입 — 에이전트 결과 인터랙티브 렌더링 (FX-REQ-060, P1) | v0.12 | ✅ | UIHint + DynamicRenderer + SectionRenderer + WidgetRenderer, Match 95% |
| F61 | MCP 실 구현 — McpAgentRunner + SseTransport (FX-REQ-061, P1) | v0.12 | ✅ | SseTransport + HttpTransport + McpRunner + Registry + 5 endpoints + UI, Match 95% |
| F62 | v1.0.0 릴리스 준비 — 안정화 + 문서 + 배포 (FX-REQ-062, P1) | v1.0 | ✅ | D1 migration remote + version bump + git tag + 릴리스 |
| F63 | 테스트 커버리지 강화 — E2E + API 통합 보강 (FX-REQ-063, P2) | v0.12 | ✅ | MCP 통합 8건 + E2E 2건 + SSE 헬퍼, Match 85% |

**Sprint 13 — MCP Sampling/Prompts + 에이전트 자동 PR (v1.1.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F64 | MCP Sampling + Prompts 확장 — 양방향 MCP 통합 완성 (FX-REQ-064, P1) | v1.1 | ✅ | SamplingHandler + PromptsClient + 4 endpoints + UI 브라우저, Match 91% |
| F65 | 에이전트 자동 PR 파이프라인 — branch→PR→review→merge 전체 자동화 (FX-REQ-065, P0) | v1.1 | ✅ | PrPipelineService + ReviewerAgent + 7-gate auto-merge + 4 endpoints, Match 93% |
| F66 | v1.1.0 릴리스 + 안정화 (FX-REQ-066, P2) | v1.1 | ✅ | version bump + CHANGELOG + SPEC v3.1 + git tag (D1 remote: 별도 적용) |

**Sprint 14 — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 (v1.2.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F67 | MCP Resources + Notifications — 파일/데이터 리소스 발견·읽기·구독 (FX-REQ-067, P1) | v1.2 | ✅ | McpResourcesClient + 4 endpoints + Resources 브라우저 UI, Match 92% |
| F68 | 멀티 에이전트 동시 PR + 충돌 해결 — Merge Queue + 파일 충돌 감지 (FX-REQ-068, P0) | v1.2 | ✅ | MergeQueueService + 병렬 실행 + 순차 merge + 5 endpoints, Match 92.5% |
| F69 | v1.2.0 릴리스 + Phase 3 기반 구축 — 멀티테넌시 설계 + 로드맵 (FX-REQ-069, P2) | v1.2 | ✅ | v1.3.0 릴리스에서 배포 완료, 멀티테넌시 설계는 Sprint 16+ |

**Sprint 15 — PlannerAgent + 에이전트 inbox 통신 + git worktree 격리 (v1.3.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F70 | PlannerAgent 도입 — 태스크 실행 전 코드베이스 리서치 + 계획 수립 + 인간 승인 (FX-REQ-070, P1) | v1.3 | ✅ | PlannerAgent 6 메서드 + API 3 endpoints + Orchestrator 통합, Match 92% |
| F71 | 에이전트 간 inbox 통신 — Leader/Worker 비동기 메시지 큐 + SSE 이벤트 (FX-REQ-071, P1) | v1.3 | ✅ | AgentInbox 4 메서드 + inbox 라우트 3 endpoints + SSE, Match 90% |
| F72 | git worktree 격리 — 에이전트별 독립 worktree 자동 할당 + WorktreeManager (FX-REQ-072, P2) | v1.3 | ✅ | WorktreeManager gitExecutor DI + D1 + executeTaskIsolated, Match 92% |
| F73 | 제품 포지셔닝 재점검 — 기존 서비스(Discovery-X·AXIS DS·AI Foundry) 연동 계획 + 정체성 재정립 (FX-REQ-073, P0) | v1.3 | ✅ | Plan §5에 반영, C1/C2/C3 연동 경로 확정 |

**Sprint 16 — PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 (v1.4.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F75 | PlannerAgent LLM 실 연동 — Mock→Claude API 전환 + JSON 파싱 + 폴백 (FX-REQ-075, P1) | v1.4 | ✅ | analyzeCodebase() + 3단계 폴백 + 313 tests, Match 92% |
| F76 | AgentInboxPanel UI + AgentPlanCard shared import 정리 (FX-REQ-076, P1) | v1.4 | ✅ | AgentInboxPanel 161 LOC + Plans 탭 실 렌더링 + api-client 6함수, Match 91% |
| F77 | v1.4.0 프로덕션 배포 + D1 migration 0009 remote (FX-REQ-077, P2) | v1.4 | ✅ | D1 22테이블 확인 + CI/CD deploy 성공 + v1.4.0 bump |

### 단독 작업 — 프로젝트 소개 페이지 개편

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F74 | 프로젝트 소개 페이지 전면 개편 — 정체성 재정립 + 아키텍처/로드맵/블루프린트 (FX-REQ-074, P1) | v1.4 | ✅ | 7섹션 전면 재작성, AXIS DS 토큰 연동, smoke-test 수정 포함 |

**Sprint 17 — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 (v1.5.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F80 | AI Foundry MCP 연동 — 설계 문서 + 서비스 등록 흐름 + 외부 MCP 호출 경로 (FX-REQ-080, P1) | v1.5 | ✅ | McpServerRegistry.createServerPreset("ai-foundry") + PRESET_CONFIGS + externalTool type, Match 100% |
| F81 | AgentInboxPanel 스레드 뷰 — parentMessageId 기반 대화 맥락 UI + 스레드 라우트 (FX-REQ-081, P1) | v1.5 | ✅ | GET /agents/inbox/:parentMessageId/thread + viewMode(flat/threaded) + groupByThread(), Match 100% |
| F82 | PlannerAgent → Orchestrator 실 연동 — createPlanAndWait 승인 대기 + executePlan 라이프사이클 (FX-REQ-082, P1) | v1.5 | ✅ | createPlanAndWait() 폴링 + executePlan() lifecycle + D1 migration 0010 + Plan API 2 endpoints, Match 97% |

**Sprint 18 — 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 (v1.6.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F83 | 멀티테넌시 기초 — Organizations + tenant_id + RLS 미들웨어 (FX-REQ-083, P0) | v1.6 | ✅ | organizations + org_members + tenantGuard + JWT orgId + D1 migration 0011~0012, Match 93% |
| F84 | GitHub 양방향 동기화 — Issues/PR 실시간 연동 (FX-REQ-084, P1) | v1.6 | ✅ | GitHubSyncService + webhook 확장 + Octokit 인증 + 17 tests, Match 95% |
| F85 | Slack 통합 — 에이전트 알림 + 슬래시 커맨드 (FX-REQ-085, P1) | v1.6 | ✅ | SlackService + Block Kit + /foundry-x 커맨드 + SSE→Slack 브릿지 + 12 tests, Match 90% |
| F86 | Sprint 18 통합 + v1.6.0 릴리스 (FX-REQ-086, P2) | v1.6 | ✅ | D1 0011~0012 remote 적용 완료 + Workers 배포 완료 |

**Sprint 19 — AgentInbox 스레드 답장 (v1.7.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F87 | ThreadReplyForm UI — 스레드 상세 뷰 + 답장 폼 + getInboxThread 연동 (FX-REQ-087, P1) | v1.7 | ✅ | MessageItem 분리 + ThreadReplyForm + ThreadDetailView, Match 100% |
| F88 | 스레드 답장 API 보강 — 답장 알림 + 읽음 처리 확장 + mock-d1 보완 (FX-REQ-088, P1) | v1.7 | ✅ | ackThread() + SSE thread_reply + 라우트 1개, Match 100% |
| F89 | 스레드 통합 테스트 + E2E — API 라우트 테스트 + Playwright 스레드 흐름 (FX-REQ-089, P2) | v1.7 | ✅ | mock-d1 보완 + inbox-routes 10건 + E2E 4건, Match 100% |

### 단독 작업 — Production E2E + AXIS Design System 리디자인

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F78 | Production 사이트 E2E 테스트 — fx.minu.best smoke + 크리티컬 패스 검증 (FX-REQ-078, P1) | v1.4 | ✅ | playwright.prod.config + 2 E2E specs, Match Rate 94% |
| F79 | UI/UX 전면 리디자인 — AXIS Design System 연동 (FX-REQ-079, P1) | v1.4 | ✅ | forge→axis 전환 완료, 잔존 0건, Match Rate 96% |

### 단독 작업 — PlannerAgent 외부 도구 프롬프트 연동

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F90 | PlannerAgent gatherExternalToolInfo() 프롬프트 연동 — MCP 도구 정보 수집 + LLM 프롬프트 주입 (FX-REQ-090, P2) | v1.5+ | ✅ | Match Rate 96%, 363 tests, PDCA FX-RPRT-021 |

### 단독 작업 — executePlan() repoUrl 연동

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F91 | executePlan() repoUrl 실제 리포 URL 연동 — options 파라미터 + 라우트 조회 (FX-REQ-091, P2) | v1.5+ | ✅ | FX-PLAN-022, 366 tests |


### 미배정 — Phase 3 잔여

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F92 | 멀티테넌시 고도화 — org 전환 UI, org별 격리 강화, 초대/권한 관리 (FX-REQ-092, P1) | v1.8+ | ✅ | Match Rate 90% |
| F93 | GitHub 양방향 동기화 고도화 — PR 자동 리뷰 실 연동, Issue→Task 자동 생성 (FX-REQ-093, P1) | v1.8.0 | ✅ | Sprint 21, Match Rate 93% |
| F94 | Slack 고도화 — Interactive 메시지 (승인/거절 버튼), 채널별 알림 설정 (FX-REQ-094, P2) | v1.8+ | ✅ | Sprint 22, Match Rate 99% |
| F95 | PlannerAgent 고도화 — 실 LLM 기반 코드베이스 분석 정확도 개선 (FX-REQ-095, P2) | v1.8+ | ✅ | Sprint 22, Match Rate 91% |
| F96 | v1.7.0 프로덕션 배포 — Sprint 19 코드 + D1 migration remote 적용 (FX-REQ-096, P0) | v1.7 | ✅ | Workers 50e9c494 배포 완료 |
| F97 | 테스트 커버리지 확장 — E2E (멀티테넌시, GitHub/Slack 흐름) (FX-REQ-097, P2) | v1.8+ | ✅ | Sprint 23, Match Rate 92% |

### Phase 3 Sprint 0 — 기술 스택 점검 (통합 착수 전 필수, PRD v5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F98 | 기술 스택 점검 스프린트 — Discovery-X/AI Foundry/AXIS DS 호환성 분석 + 매트릭스 작성 (FX-REQ-098, P0) | v2.1 | ✅ | Sprint 25, Match 100%, Kill→Go |

### Phase 3-B — 기술 기반 완성 (PRD v5 G-items)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F99 | Git↔D1 Reconciliation Job — Cron Trigger 기반 자동 정합성 복구 (FX-REQ-099, P1) | v2.0 | ✅ | Sprint 27, Match 94%, Cron 6h + ReconciliationService |
| F100 | KPI 측정 인프라 — CLI 호출/대시보드 사용 로깅 + 분석 대시보드 (FX-REQ-100, P0) | v2.0 | ✅ | Sprint 27, Match 94%, KpiLogger + /analytics 대시보드 |
| F119 | Foundry-X 정체성 및 소개 페이지 업데이트 — PRD v5 기반 서비스 소개·로드맵·버전 관리 (FX-REQ-119, P0) | v2.0 | ✅ | F74 후속, Match Rate 98% |
| F101 | 에이전트 hook 실패 자동 수정 루프 — 최대 2회 시도 + human escalation (FX-REQ-101, P1) | v2.0 | ✅ | Sprint 27, Match 94%, AutoFixService LLM 2-retry |
| F102 | 에이전트 자동 rebase — 최대 3회 시도 + human escalation + 상태 복구 (FX-REQ-102, P1) | v2.2 | ✅ | Sprint 28, Match 93%, AutoRebaseService 3-retry |
| F103 | Semantic Linting 실효성 — 커스텀 ESLint 룰에 수정 코드 예시 포함 (FX-REQ-103, P2) | v2.2 | ✅ | Sprint 28, Match 95%, 3룰 hasSuggestions |

### Phase 3-C — AXIS DS UI 전환 (PRD v5 통합 Step 1)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F104 | AXIS DS UI 전환 — shadcn/ui → AXIS DS 컴포넌트 + 디자인 토큰 통합 (FX-REQ-104, P1) | v2.1 | ✅ | Sprint 25, Match 95%, 11 컴포넌트 전환 |

### Phase 3-D — Plumb Track B 판정

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F105 | Plumb Track B 판정 — Track A 실사용 데이터 기반 전환 판단 (FX-REQ-105, P2) | v2.2 | ✅ | Sprint 28, Stay Track A, ADR-001, 재판정 2026-09 |

### Phase 4-A — 프론트엔드 통합 (PRD v5 통합 Step 2)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F106 | 프론트엔드 통합 — Discovery-X/AI Foundry UI를 Foundry-X 서브 라우트로 통합 (FX-REQ-106, P1) | v2.1 | ✅ | Sprint 26, iframe+postMessage SSO, Match 85% |
| F107 | 멀티 프로젝트 대시보드 — 크로스 프로젝트 건강도 + 에이전트 활동 요약 (FX-REQ-107, P1) | v2.0 | ✅ | Sprint 24 (구 F98), Match 100% |

### Phase 4-B — 인증/테넌시 통합 (PRD v5 통합 Step 3)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F108 | 인증 SSO 통합 — 단일 로그인으로 3개 서비스 접근 + Org별 서비스 권한 (FX-REQ-108, P1) | v2.1 | ✅ | Sprint 26, Hub Token+org_services, Match 100% |

### Phase 4-C — API 통합 (PRD v5 통합 Step 4)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F109 | API BFF→통합 — Foundry-X Workers가 서비스 API 프록시 → 모듈 통합 (FX-REQ-109, P1) | v2.1 | ✅ | Sprint 26, Service Bindings+HTTP 폴백, Match 94% |
| F110 | Webhook 일반화 + Jira 연동 — WebhookRegistry + JiraAdapter 양방향 동기화 (FX-REQ-110, P2) | v2.0 | ✅ | Sprint 24 (구 F99), Match 95% |

### Phase 4-D — 데이터 통합 (PRD v5 통합 Step 5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F111 | D1 스키마 통합 — 크로스 서비스 쿼리 + Discovery-X→Foundry-X 메타데이터 연결 (FX-REQ-111, P1) | v2.1 | ✅ | Sprint 26, entity_registry+links, Match 95% |

### Phase 4-E — 외부 연동 + 온보딩

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F112 | GitLab API 지원 — octokit + GitLab API 두 플랫폼 추상화 (FX-REQ-112, P3) | v3.0+ | 📋 | **X5 재평가: DEFER**. F117 외부 파일럿 선행 필요, 타겟 고객사 GitLab 요구 발생 시 재평가. [[FX-PLAN-X5]] |
| F113 | 모니터링 + 옵저버빌리티 — Workers Analytics + 에러 트래킹 + 알림 (FX-REQ-113, P2) | v2.0 | ✅ | Sprint 24 (구 F100), Match 90% |
| F114 | 실사용자 온보딩 — 내부 5명 강제 온보딩 + 주간 피드백 + 교육 자료 (FX-REQ-114, P0) | v2.3 | ✅ | Sprint 29, F120~F122 기술 기반 완료, 프로세스 진행 중 |
| F120 | 온보딩 가이드 UI — /getting-started 페이지 + 인터랙티브 투어 + FAQ (FX-REQ-120, P0) | v2.3 | ✅ | Sprint 29, Match 88%, 기능카드5+FAQ5+NPS폼 |
| F121 | 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + 피드백 대시보드 위젯 (FX-REQ-121, P0) | v2.3 | ✅ | Sprint 29, Match 100%, POST+GET feedback+NpsSummaryWidget |
| F122 | 온보딩 체크리스트 — 사용자별 진행률 추적 + 완료 알림 + KPI 연동 (FX-REQ-122, P1) | v2.3 | ✅ | Sprint 29, Match 97%, GET+PATCH progress+KpiLogger 연동 |
| F115 | 에이전트 워크플로우 빌더 — 파이프라인 에디터 + 템플릿 (FX-REQ-115, P2) | v2.0 | ✅ | Sprint 24 (구 F101), Match 90% |

### Sprint 30 — 프로덕션 배포 동기화 + Phase 4 Go 판정 + 품질 강화 (v2.4.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F123 | 프로덕션 배포 동기화 — D1 0018 remote + Workers v2.2.0 배포 + smoke test (FX-REQ-123, P0) | v2.4 | ✅ | Sprint 30, Workers v2.2.0 배포 완료, Match 100% |
| F124 | 프론트엔드 통합 개선 — F106 잔여(85%→) 네비게이션 일관성 + 데이터 공유 강화 (FX-REQ-124, P1) | v2.4 | ✅ | Sprint 30, postMessage 6종+Skeleton+ErrorBoundary, Match 86% |
| F125 | Phase 4 Go 판정 준비 — KPI 대시보드(K7/K8/K9) 추적 UI + Go 판정 문서 (FX-REQ-125, P1) | v2.4 | ✅ | Sprint 30, Conditional Go, Match 100% |
| F126 | Harness Evolution Rules 자동 감지 — 위반 감지 + 경고 알림 (FX-REQ-126, P2) | v2.4 | ✅ | Sprint 30, 4규칙+2ep+SSE, Match 88% |
| F127 | PRD↔구현 정합성 갱신 — MVP 체크리스트 + codegen-core 재활용 판정 (FX-REQ-127, P2) | v2.4 | ✅ | Sprint 30, MVP 6/6 ✅+codegen 보류, Match 100% |
| F128 | E2E 테스트 보강 + 에러 핸들링 — Phase 4 통합 경로 E2E + API 에러 응답 표준화 (FX-REQ-128, P1) | v2.4 | ✅ | Sprint 30, ErrorResponse+E2E 4시나리오, Match 72%→ |

### Sprint 31 — 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 (v2.5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F129 | 프로덕션 완전 동기화 — D1 0018~0019 remote + Workers v2.4.0 배포 + smoke test (FX-REQ-129, P0) | v2.5 | ✅ | Sprint 31, Workers fe2f72a7, Match 100% |
| F130 | SPEC/문서 정합성 보정 — §1/§2/§3 갱신 + Execution Plan 체크박스 + MEMORY 동기화 (FX-REQ-130, P0) | v2.5 | ✅ | Sprint 31, drift 9건→0건, Match 95% |
| F131 | Phase 4 잔여 Match Rate 보강 — F128 E2E 72%→90%+ / F124 FX_NAVIGATE 연결 86%→90%+ (FX-REQ-131, P1) | v2.5 | ✅ | Sprint 31, E2E +6, router.push 연결, Match 90% |
| F132 | 온보딩 킥오프 체크리스트 — 시나리오 5종 + 프로세스 문서 + 킥오프 준비 (FX-REQ-132, P1) | v2.5 | ✅ | Sprint 31, S1~S5 + Go/Kill 기준, Match 95% |
| F133 | 로그인/회원가입 UI + 사이드바 인증 — /login 페이지 + auth-store + fetchApi 401 수정 (FX-REQ-133, P0) | v2.5 | ✅ | 소급 등록, 세션 #73 |

### Sprint 32 — PRD v5 완전성 점검 + Phase 4→5 전환 로드맵

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F156 | PRD v5 완전성 점검 — G1~G12 갭 + Phase 3~4 F-item 완료 검증 + Phase 5 미착수 분류 (FX-REQ-156, P0) | Sprint 32 | ✅ | 거버넌스, G 9/12완료+1진행+2수요대기 |
| F157 | Phase 4→5 전환 로드맵 — 온보딩 4주 추적 계획 + Phase 5 착수 기준 + Layer 1~4 실행 순서 (FX-REQ-157, P0) | Sprint 32 | ✅ | 거버넌스, Track A/B + KT DS SR 로드맵 |

### Sprint 33 — Agent Evolution Track B: 개발 도구 도입

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F153 | gstack 스킬 설치 — /review, /qa, /ship 등 개발 도구 도입 (FX-REQ-153, P0) | Sprint 33 | ✅ | 25개 스킬 인식, Match Rate 94% |
| F154 | claude-code-router 설정 — 로컬 프록시 멀티모델 라우팅 (FX-REQ-154, P1) | Sprint 33 | ✅ | ccr + config.json, OpenRouter+Anthropic |
| F155 | OpenRouter API 키 발급 — 개발/테스트용 계정 + API 키 확보 (FX-REQ-155, P0) | Sprint 33 | ✅ | .dev.vars 저장, 하드코딩 0건 |

### Phase 5 — 고객 파일럿

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F116 | KT DS SR 시나리오 구체화 — 첫 타겟 SR 유형 정의 + 워크플로우 설계 (FX-REQ-116, P1) | Sprint 44 | ✅ | PRD v5 Q4 해소, Match Rate 95%, [[FX-RPRT-044]] |
| F117 | 외부 고객사 파일럿 — SR 자동화 성공 사례 기반 제안 + 데모 (FX-REQ-117, P1) | Phase 5c | 🔧 | **X5 재평가: UPGRADE**. 내부 기술 준비 완료(F116 ✅ + F121~F122 ✅ + F166 ✅ + F170~F174 ✅). 비즈니스 선결: 타겟 외부 고객사 지명 대기. [[FX-PLAN-X5]] |
| F118 | 모노리포→멀티리포 분리 검토 — 고객 배포 요구에 따라 판단 (FX-REQ-118, P3) | — | 🗑️ | **X5 재평가: ARCHIVE**. AX-BD MSA Restructuring(FX-DSGN-MSA-001 v4, Phase 20 Sprint 179~188)에 rationale 흡수 — 중복 제거. [[FX-PLAN-X5]] |
| F134 | 프로젝트 버전 관리 점검 — SemVer 원칙 조사 + 현행 체계 개선 기획 (FX-REQ-134, P1) | Sprint 32 | ✅ | Governance, Pre-Production 버전 정책 정비, Match Rate 96% |

### Phase 5 — Agent Evolution (멀티모델 + 역할 에이전트 진화)

> PRD: `docs/specs/agent-evolution/prd-final.md` | 판정: Conditional (보안/인력/Phase4 조건부)

#### Track A: 플랫폼 기능

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F135 | OpenRouter 게이트웨이 통합 — OpenRouterRunner 구현, 단일 API 키로 300+ 모델 접근 (FX-REQ-135, P0) | Sprint 34 | ✅ | Agent Evolution A1, OpenRouterRunner+prompt-utils+3-way 팩토리, Match Rate 97% |
| F136 | 태스크별 모델 라우팅 — task_type별 최적 모델 자동 선택, D1 routing rules 테이블 (FX-REQ-136, P0) | Sprint 36 | ✅ | Agent Evolution A2, ModelRouter + createRoutedRunner, Match Rate 96% |
| F137 | Evaluator-Optimizer 패턴 — 생성→평가→개선 루프, 최대 반복+품질 임계값 (FX-REQ-137, P0) | Sprint 36 | ✅ | Agent Evolution A3, EvaluatorOptimizer + 3종 EvaluationCriteria, Match Rate 96% |
| F138 | ArchitectAgent — 설계 문서 검토 + 아키텍처 판단 + 의존성 분석 (FX-REQ-138, P0) | Sprint 37 | ✅ | Agent Evolution A4, 3메서드+20 tests, Match Rate 95% |
| F139 | TestAgent — 변경 코드 기반 테스트 자동 생성 + 커버리지 분석 (FX-REQ-139, P0) | Sprint 37 | ✅ | Agent Evolution A5, 3메서드+28 tests, Match Rate 95% |
| F140 | SecurityAgent — OWASP Top 10 보안 취약점 스캔 + PR diff 분석 (FX-REQ-140, P1) | Sprint 38 | ✅ | Agent Evolution A6, scan+prDiff+owasp 3메서드+16 tests, Match Rate 97% |
| F141 | QAAgent 브라우저 테스트 — Playwright/Chromium 실제 UI 테스트 실행 (FX-REQ-141, P1) | Sprint 38 | ✅ | Agent Evolution A7, browserTest+acceptance+regression 3메서드+15 tests, Match Rate 97% |
| F142 | Sprint 워크플로우 템플릿 — Think→Plan→Build→Review→Test→Ship→Reflect DAG (FX-REQ-142, P1) | Sprint 35 | ✅ | 3종 템플릿+3종 조건+SprintContext, Match 96% |
| F143 | 모델 비용/품질 대시보드 — 에이전트별 토큰 사용량, 비용, 품질 점수 시각화 (FX-REQ-143, P1) | Sprint 35+43 | ✅ | API: Sprint 35, UI: Sprint 43 (TokensPage Model Quality 탭+히트맵, 16 tests, 95%) |
| F144 | Fallback 체인 — 모델 응답 실패 시 자동 대체 모델 전환 (FX-REQ-144, P1) | Sprint 39 | ✅ | Agent Evolution A10, FallbackChainService+D1 0023+20 tests, Match Rate 93% |
| F145 | InfraAgent — 샌드박스 환경에서 인프라 변경 시뮬레이션 + IaC 출력 (FX-REQ-145, P2) | Sprint 40 | ✅ | Agent Evolution A11, InfraAgent 3메서드+InfraPrompts, Match Rate 91% |
| F146 | 에이전트 역할 커스터마이징 — 사용자 정의 역할(프롬프트/도구/모델) (FX-REQ-146, P2) | Sprint 41 | ✅ | Agent Evolution A12, CustomRoleManager+D1 0024+systemPromptOverride, Match Rate 94% |
| F147 | 멀티모델 앙상블 투표 — 3~5개 모델 병렬 처리 + 결과 종합 (FX-REQ-147, P2) | Sprint 41 | ✅ | Agent Evolution A13, EnsembleVoting+3종 전략+Promise.allSettled, Match Rate 94% |
| F148 | 에이전트 자기 평가 — 자기 반성 루프 (FX-REQ-148, P2) | Sprint 40 | ✅ | Agent Evolution A14, AgentSelfReflection+enhanceWithReflection, Match Rate 91% |
| F149 | 프라이빗 프롬프트 게이트웨이 — 코드 요약/추상화만 LLM 전송, 보안 근본 차단 (FX-REQ-149, P1) | Sprint 39 | ✅ | Agent Evolution A15, PromptGatewayService+4종 기본규칙+코드 추상화, Match Rate 93% |
| F150 | AI-휴먼 하이브리드 피드백 루프 — 자동화 실패 시 즉시 피드백 수집+학습 (FX-REQ-150, P1) | Sprint 39 | ✅ | Agent Evolution A16, AgentFeedbackLoopService+프롬프트 힌트 학습, Match Rate 93% |
| F151 | 자동화 품질 리포터 — 주간 자동화 품질 리포트 자율 생성 (FX-REQ-151, P2) | Sprint 42 | ✅ | Agent Evolution A17, AutomationQualityReporter+D1 0025+24 tests, Match Rate 97% |
| F152 | 에이전트 마켓플레이스 — 역할/프롬프트 공유 내부 마켓 (FX-REQ-152, P2) | Sprint 42 | ✅ | Agent Evolution A18, AgentMarketplace+D1 0026+24 tests, Match Rate 97% |

### Sprint 45 — KPI 자동 수집 인프라 (Phase 5 온보딩 데이터 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F158 | 웹 대시보드 페이지뷰 자동 추적 — Next.js 라우트 변경 시 page_view 이벤트 자동 전송 (FX-REQ-158, P0) | Sprint 45 | ✅ | useKpiTracker + 300ms throttle, Match 97% |
| F159 | CLI 호출 자동 KPI 로깅 — init/status/sync 실행 시 cli_invoke 이벤트 자동 전송 (FX-REQ-159, P1) | Sprint 45 | ✅ | KpiReporter + AbortController 3s, Match 97% |
| F160 | K7/K8/K11 자동 집계 Cron — 일별 KPI 스냅샷 + kpi_snapshots D1 테이블 (FX-REQ-160, P0) | Sprint 45 | ✅ | generateDailySnapshot + D1 0028, Match 97% |
| F161 | KPI 대시보드 실데이터 연결 — F125 KPI UI에 자동 수집 데이터 바인딩 (FX-REQ-161, P1) | Sprint 45 | ✅ | GET /kpi/snapshot-trend + api-client, Match 97% |

#### Track B: 개발 도구 도입

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F153 | gstack 스킬 설치 — /review, /qa, /ship 등 개발 도구 도입 (FX-REQ-153, P0) | Sprint 33 | ✅ | Agent Evolution B1, 세션 #78 완료 |
| F154 | claude-code-router 설정 — 로컬 프록시 멀티모델 라우팅 (FX-REQ-154, P1) | Sprint 33 | ✅ | Agent Evolution B2, 세션 #78 완료 |
| F155 | OpenRouter API 키 발급 — 개발/테스트용 계정 + API 키 확보 (FX-REQ-155, P0) | Sprint 33 | ✅ | Agent Evolution B3, 세션 #78 완료 |

### Phase 5 — 고객 파일럿 + 수주 (PRD v8 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F162 | Azure 마이그레이션 PoC — 핵심 모듈 3개(에이전트 오케스트레이션, 웹 대시보드, Git 연동) Azure 환경 구동 검증 (FX-REQ-162, P0) | Sprint 46 | ✅ | PRD v8 Conditional 조건 #2, Workers→Functions+D1→SQL 검증 |
| F163 | SI 파트너 R&R 확정 — 커스터마이징/운영/보안 역할 분담 정의 (FX-REQ-163, P0) | Sprint 46 | ✅ | PRD v8 Conditional 조건 #1, 외부 파트너 범위 확정 |
| F164 | 고객사 커스터마이징 범위 정의 — 배포/인증/스키마 커스텀 범위 확정 + 플러그인 시스템 설계 + 표준 템플릿 (FX-REQ-164, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #3, Q12 해소 |
| F165 | AI 생성 코드 법적/윤리적 정책 수립 — 저작권, 오픈소스 라이선스, 감사 로그 API (FX-REQ-165, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #5, Q13 해소 |
| F166 | 외부 AI API 데이터 거버넌스 정책 — 데이터 반출 제한, PII 마스킹 미들웨어, KT DS 보안 체크리스트 (FX-REQ-166, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #5, Q14 해소 |
| F167 | ML 하이브리드 SR 분류기 — 규칙 기반 오분류 데이터 수집 후 ML 모델 결합 (FX-REQ-167, P1) | Sprint 48 | ✅ | Phase 5b, F116 규칙 기반 확장, Match Rate 95% |
| F168 | SR 관리 전용 대시보드 UI — SR 분류/워크플로우 상태 시각화 (FX-REQ-168, P2) | Sprint 48 | ✅ | Phase 5 고객 파일럿, Match Rate 95% |
| F169 | 고객 데모 환경 구축 — 엔드투엔드 SR 자동 처리 시나리오 데모 배포 (Azure/Cloudflare) (FX-REQ-169, P0) | Sprint 46 | ✅ | Phase 5 수주 필수, 외부 접근 가능 데모 |
| F170 | Adoption KPI 대시보드 — 온보딩 팀 현황 API + Analytics UI + 시드 데이터 6명 (FX-REQ-170, P0) | Sprint 48 | ✅ | F114 Adoption 데이터 가시성 확보, Conditional #4 기술 준비 완료 |
| F171 | 대시보드 IA 재설계 — 업무 동선 중심 메뉴 구조 재편 + 중복 메뉴 통합 + 역할별 랜딩 (FX-REQ-171, P0) | Sprint 49 | ✅ | 10→6그룹 재편, 숨겨진 페이지 3개 노출, Match 95% |
| F172 | 인터랙티브 온보딩 투어 — 첫 로그인 가이드 + 스텝별 툴팁 + 업무별 퀵스타트 (FX-REQ-172, P1) | Sprint 49 | ✅ | 순수 React 자체 구현(SVG spotlight + axis-glass), 6스텝 투어 |
| F173 | 팀원 셀프 온보딩 플로우 — 초대 링크 복사 + 비밀번호 설정 페이지 + 자동 로그인 + 투어 자동 시작 (FX-REQ-173, P0) | Sprint 50 | ✅ | Phase 5 Conditional #4 실질 해소, Match Rate 100% |
| F174 | 인앱 피드백 위젯 — 전역 플로팅 피드백 + 컨텍스트 자동 첨부 + 주간 사용 요약 API (FX-REQ-174, P1) | Sprint 50 | ✅ | 전역 피드백 + weekly-summary API, Match Rate 100% |
| ~~F175~~ | ~~사업 아이템 분류 Agent~~ → F182로 대체 (FX-REQ-175) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F176~~ | ~~유형별 분석 파이프라인~~ → F182+F184로 대체 (FX-REQ-176) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F177~~ | ~~발굴 결과 패키징~~ → F185로 대체 (FX-REQ-177) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F178~~ | ~~AI 멀티 페르소나 사전 평가~~ → F187로 대체 (FX-REQ-178) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| F179 | 사업 아이템 수집 채널 통합 — Agent 자동 수집 + Field-driven + IDEA Portal 연계 (FX-REQ-179, P1) | Sprint 57 | ✅ | 1단계 수집 자동화 |
| F180 | 사업계획서 초안 자동 생성 — Discovery-X 발굴 결과 기반 B2B 사업계획서 초안 (FX-REQ-180, P2) | Sprint 58 | ✅ | 3단계 형상화 |
| F181 | Prototype 자동 생성 — 디자인시스템 기반 사업 아이템 데모 Prototype 자동 생성 (FX-REQ-181, P2) | Sprint 58 | ✅ | 3단계 형상화, 손해사정 Prototype 참고 |
| F182 | 5시작점 분류 + 경로 안내 — 아이디어/시장·타겟/고객문제/기술/기존서비스 시작점 식별 + 분석 경로 매핑 (FX-REQ-182, P0) | Sprint 52 | ✅ | Match Rate 97%, 28 tests, 3 endpoints, 3 Web 컴포넌트 |
| F183 | Discovery 9기준 체크리스트 + 예외처리 — 9개 완료기준 충족 관리 + 미달성 시 재분석/루프백 (FX-REQ-183, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #3+#6 |
| F184 | pm-skills 실행 가이드 + 컨텍스트 관리 — 18개 스킬 단계별 안내 + 분석 데이터 흐름 자동화 (FX-REQ-184, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #4+#7 |
| F185 | PRD 자동 생성 — Discovery 9기준 충족 시 분석 결과→PRD 템플릿 자동 매핑 (FX-REQ-185, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #5 |
| F186 | 다중 AI 검토 파이프라인 — PRD를 ChatGPT/Gemini/DeepSeek API로 자동 검토 + 스코어카드 (FX-REQ-186, P1) | Sprint 55 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #1, ax-req-interview 연동 |
| F187 | 멀티 페르소나 사전 평가 — KT DS 8개 역할 에이전트 AI 평가 + 레이더 차트 + G/K/R 판정 (FX-REQ-187, P1) | Sprint 55 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #2, BDP-001 2-9 |
| F188 | Six Hats 토론 — PRD에 대한 6모자 관점 20턴 토론 자동 수행 (FX-REQ-188, P2) | Sprint 56 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #3 |
| F189 | Discovery 진행률 대시보드 — 9개 기준 달성 현황 시각화 (FX-REQ-189, P2) | Sprint 56 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #4 |
| F190 | 시장/트렌드 데이터 자동 연동 — 외부 시장·경쟁사·트렌드 데이터 API 연동 + 자동 요약 (FX-REQ-190, P2) | Sprint 57 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #5 |

### Phase 5c — 방법론 플러그인 아키텍처 (BDP 6단계 메가 프로세스 위 다중 방법론 지원)

> 배경: AX BD팀은 상황/목표별 최적 방법론을 커스텀한다. 초기 3개 방법론(BDP, pm-skills, 추가1)을 지원하고 이후 추가/수정에 대응.
> 원칙: 메가 프로세스(BDP 6단계: 수집→발굴→형상화→검증→제품화→GTM)는 불변. 방법론이 커스텀하는 구간은 **분석 파이프라인 + 검증 기준**.

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F191 | 방법론 레지스트리 + 라우터 — MethodologyModule 인터페이스 정의 + DB 등록 + 아이템 특성 기반 방법론 자동 추천 (FX-REQ-191, P0) | Sprint 59 | ✅ | 메가 프로세스 공통 레이어, matchScore() 기반 추천 |
| F192 | BDP 방법론 모듈화 — 기존 BDP 서비스(ItemClassifier/StartingPoint/DiscoveryCriteria/AnalysisContext/PrdGenerator)를 MethodologyModule 구현으로 리팩토링 (FX-REQ-192, P0) | Sprint 59 | ✅ | 기존 코드 래핑, 기능 변경 없음 |
| F193 | pm-skills 방법론 모듈 — pm-skills 전용 분석 파이프라인 + 스킬 실행 가이드 + 검증 기준 세트 구현 (FX-REQ-193, P1) | Sprint 60 | ✅ | 10개 내부 스킬 기반 파이프라인, HITL 방식 |
| F194 | pm-skills 검증 기준 설계 — 18개 스킬 구조에 맞는 완료 기준 세트 (BDP 9기준과 독립, 스킬별 산출물 기반 체크) (FX-REQ-194, P0) | Sprint 60 | ✅ | OST 완성도, BMC 충족도 등 스킬 특화 기준, F193과 동일 Worker |
| F195 | 방법론 관리 UI — 등록된 방법론 목록 + 아이템별 방법론 선택/변경 + 진행률 통합 뷰 (FX-REQ-195, P1) | Sprint 60 | ✅ | F191 레지스트리 API 기반 독립 UI 구현 |

### Phase 5d — AX BD Ideation MVP (PRD v1.4 Phase 1, BMC 에디터 + AI 에이전트)

> 배경: AX BD팀의 사업개발 라이프사이클을 AI 에이전트와 함께 수행할 수 있는 조직 협업 플랫폼을 Foundry-X 위에 구축.
> 핵심: BMC(비즈니스 모델 캔버스) 에디터 + BMCAgent/InsightAgent 2종 + 아이디어 관리. Git SSOT 원칙 유지.
> PRD: `docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md` (FX-PLAN-AX-BD-001)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F197 | BMC 캔버스 CRUD — 9개 블록 생성·수정·저장, Git 커밋 대기 상태 관리, 동시 편집 충돌 안내 (FX-REQ-AX-001, P0) | Sprint 61 | ✅ | BE: ax-bd routes+services+D1, FE: BMC 에디터 UI. D1 ax_bmcs+ax_bmc_blocks |
| F198 | 아이디어 등록 및 태그 — 제목·설명·태그 등록, Git+D1 하이브리드 저장, 태그 필터링 (FX-REQ-AX-007, P0) | Sprint 61 | ✅ | BE: ideas CRUD+webhook 동기화, FE: 아이디어 목록+등록 UI. D1 ax_ideas |
| F199 | BMC 초안 자동 생성 (BMCAgent) — 아이디어 한 줄 입력→9개 블록 초안 생성, PromptGateway 마스킹 필수 (FX-REQ-AX-004, P0) | Sprint 62 | ✅ | claude-sonnet-4-6, Rate Limit 분당 5회, F149 경유, X-Gateway-Processed 헤더 검증 |
| F200 | BMC 버전 히스토리 조회 — Git 커밋 단위 변경 이력 조회 + 특정 버전 복원 (FX-REQ-AX-002, P1) | Sprint 62 | ✅ | Git log 기반, 복원 시 새 커밋 생성. 재배치B: 63→62 (F197만 의존, F199와 병렬) |
| F201 | BMC 블록 인사이트 추천 — 블록 편집 중 BMCAgent가 개선 제안 3개 사이드패널 표시 (FX-REQ-AX-005, P1) | Sprint 65 | ✅ | 5초 디바운스, 20자 이상 트리거, F199 BMCAgent 재사용 |
| F202 | 시장 키워드 요약 (InsightAgent) — 키워드 기반 웹 검색 시장 동향 요약, 비동기 Job+SSE (FX-REQ-AX-006, P1) | Sprint 65 | ✅ | web_search MCP, Rate Limit 분당 3회, F149 경유, BMC 붙여넣기 연동 |
| F203 | 아이디어-BMC 연결 — 아이디어→BMC 생성/기존 BMC 연결, 양방향 링크 Git 커밋 (FX-REQ-AX-008, P1) | Sprint 64 | ✅ | F197+F198 선행 필수, meta.json 양방향 링크. 재배치B: 63→64 (62/63과 병렬 가능) |
| F204 | BMC 댓글 및 협업 — 블록별 댓글, @멘션 알림, D1 전용 저장 (FX-REQ-AX-003, P1) | Sprint 64 | ✅ | D1 ax_bmc_comments, Git 커밋 대상 아님, 통합 테스트 포함 |

### 인프라 개선

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F196 | Sprint Worktree UX 개선 — tmux 3pane→1pane 간소화 + ccw 커맨드로 초기 실행 자동화 (FX-REQ-196, P0) | — | ✅ | 세션 #117 완료: 1pane+ccw+ccw-auto+suppressTitle+sprint-done kill+post-session+merge-monitor |
| F211 | Sprint 자동화 파이프라인 — autopilot(WT PDCA 전사이클) + pipeline(Master 배치 오케스트레이션) + signal/checkpoint/merge-gate (FX-REQ-203, P0) | — | ✅ | 세션 #117: ax-sprint-autopilot+ax-sprint-pipeline 스킬, ccw-auto, sprint-post-session, sprint-merge-monitor, 36 tests GREEN |

### 소통 및 전략

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F205 | Foundry-X 소개 상시 최신화 — README.md + Homepage 재구성 (1차 독자: AX BD팀, 2차: 타부서/의사결정권자). "무엇을 하고, 왜 만들었고, 어떻게 활용하는가"에 명쾌히 답할 수 있어야 함 (FX-REQ-197, P1) | Sprint 66 | ✅ | Improvement, GitHub README + fx.minu.best Landing Section 재설계 |
| F206 | AX 사업개발 A-to-Z 기능 정의 — Discovery-X/AI Foundry 통합 또는 MSA 연동 설계 + 평가관리 프레임워크 등 AI 하네스 필요 구성요소 정리 (FX-REQ-198, P0) | — | ✅ | prd-final 확정 (docs/specs/ax-bd-atoz/prd-final.md), 하위 F207~F210 도출 |

### Phase 5e — AX BD A-to-Z 하위 기능 (F206 prd-final 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F207 | 평가관리 프레임워크 MVP — KPI 입력/현황판/Go-Kill 판단/이력 관리 + 포트폴리오 대시보드 (FX-REQ-199, P0) | Sprint 65 | ✅ | 7단계 평가 핵심, D1 ax_evaluations+ax_kpis, 독립 구현 가능 |
| F208 | Discovery-X API 인터페이스 계약 — 수집 데이터 스키마/인증/Rate Limit/Fallback 정의 + OpenAPI spec (FX-REQ-200, P1) | Sprint 66 | ✅ | F179(수집 채널)과 별개, 연동 계약 문서 + 타입 정의 |
| F209 | AI Foundry 기능 흡수 — 프로토타입/PoC 모듈을 Foundry-X 내부 서비스로 이관 설계 + 마이그레이션 (FX-REQ-201, P1) | Sprint 67 | ✅ | F181(Prototype)과 연계, 제품화 단계 통합 |
| F210 | 비밀번호 재설정 — Password Reset 이메일 플로우 + 토큰 관리 (FX-REQ-202, P2) | Sprint 67 | ✅ | 인증 기능 보완, D1 password_reset_tokens |

### Phase 5f — AX BD 사업개발 체계 수립 (프로세스 v8.2 풀 통합)

> 참고자료: `docs/specs/axbd/` (7개 파일 — HTML 대시보드 3, MD 3, ai-biz 플러그인 1)
> 반영 요청: 정원(5유형+하위분석+9Discovery), 민원(AX프레임워크), 경임(Agent출발Case), 팀장(사업성평가)
> 프레임워크 헷징: AI가 유형별 강도(핵심/보통/간소)에 따라 자동 선별, HITL 원칙으로 담당자 최종 판단

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F212 | AX BD Discovery 스킬 체계 통합 — ai-biz 11스킬 CC전환 + ax-bd-discovery 오케스트레이터 skill(2-0~2-10 단계관리, 5유형 I/M/P/T/S 강도 라우팅) + AI/경영전략 16 프레임워크 프롬프트 내장. Cowork 플러그인 병행 유지 (FX-REQ-204, P0) | Sprint 68 | ✅ | ai-biz 11 CC skills + ax-bd-discovery 오케스트레이터(198줄+refs 365줄) + sf-lint/scan/deploy 완료. 81 active 스킬 카탈로그 |
| F213 | Foundry-X API v8.2 확장 — 5유형 분류(I/M/P/T/S) 엔드포인트 + 단계별 사업성 체크포인트 CRUD + 누적 트래픽 라이트 집계 + Commit Gate 플로우. D1 ax_discovery_items 확장 (FX-REQ-205, P1) | Sprint 69 | ✅ | Phase 5b BDP 자동화 기반 확장, discovery_type ENUM 추가, ax_viability_checkpoints 테이블 |
| F214 | Web Discovery 대시보드 — 2-0~2-10 프로세스 시각화 + 유형별 분기 경로 표시 + 사업성 신호등 이력 + 멀티페르소나 평가 결과 뷰 (FX-REQ-206, P1) | Sprint 70 | ✅ | 01_AX사업개발_프로세스설명.html 참고, 02_AI멀티페르소나평가.html 참고, 03_발굴단계완료(안).html 산출물 포맷 참고 |
| F215 | AX BD 스킬 팀 가이드 — Getting Started 페이지 확장: Cowork 설치(pm-skills+ai-biz)+CC 스킬 사용법(ax-bd-discovery+ai-biz 11종)+프로세스 v8.2 흐름 시각화+팀 FAQ/트러블슈팅. 1차 독자: AX BD팀 전원 (FX-REQ-207, P0) | Sprint 71 | ✅ | 4섹션+5컴포넌트(CoworkSetupGuide,SkillReferenceTable,ProcessLifecycleFlow,TeamFaqSection) + 테스트. PR #209 |
| F216 | Test Agent 리서치 — Foundry-X 6종 Agent(Architect/Test/Security/QA/Infra/Planner) 실활용 점검 + Anthropic Code Review Agent·Test Agent 벤치마크 + TDD/테스트자동화 전략 도출 (FX-REQ-208, P1) | — | ✅ | 리서치 REQ. 6종 중 PlannerAgent만 활용 중, 나머지 5종 Web UI/Orchestrator 미연동 확인. 보고서: FX-ANLS-015 |
| F217 | TestAgent 활성화 — F139 TestAgent Web UI 연동(Agent Dashboard 호출 UI) + Sprint 작업 후 TestAgent API 자동 트리거 워크플로우 + Orchestrator 통합 (FX-REQ-209, P1) | Sprint 72 | ✅ | PR #212. TestAgentPanel+CoverageGapView+TestGenerationResult 3컴포넌트, api-client TestAgent 메서드 |
| F218 | Agent SDK Test Agent PoC — Anthropic Agent SDK 기반 테스트 파일 자동 생성+실행 PoC. 내부 TestAgent(LLM 프롬프트) vs Agent SDK(도구 실행) 비교 평가 (FX-REQ-210, P2) | Sprint 73 | ✅ | PR #211. tools/test-agent-poc/ 독립 PoC (index.ts+types.ts+utils.ts+3 agent prompts) |
| F219 | TDD 자동화 CC Skill — Red→Green→Refactor 사이클 자동화 Skill 구현. Superpowers 패턴 참고(테스트 먼저→구현→검증) + Sprint 워크플로우 통합 (FX-REQ-211, P2) | Sprint 74 | ✅ | PR #210. .claude/skills/tdd/ (SKILL.md+examples+refs 3phase) + post-edit-test-warn.sh hook |
| **Phase 6 — Ecosystem Integration (BMAD/OpenSpec)** | | | | PRD: FX-PLAN-012 |
| F220 | Brownfield-first Init 강화 — `foundry-x init` 시 기존 코드베이스 자동 스캔(tech stack/파일 구조/기존 스펙) → `project-context.md` + `ARCHITECTURE.md` 초안 생성. OpenSpec 참고 (FX-REQ-212, P0) | Sprint 75 | ✅ | discover.ts 확장, RepoProfile 타입 확장. PR #213 |
| F221 | Agent-as-Code 선언적 정의 레이어 — BMAD `.agent.yaml` 패턴 참고, 에이전트를 YAML/JSON 선언적 정의. `custom_agent_roles` D1 스키마 확장(persona/dependencies/customization/menu) (FX-REQ-213, P1) | Sprint 76 | ✅ | D1 0061 + YAML→에이전트 로더. PR #214 |
| F222 | Structured Changes Directory — OpenSpec `changes/` 패턴 도입. 변경별 proposal/design/tasks/spec-delta 묶음 관리 + `foundry-x sync` Δspec 자동 감지 + Triangle Health Score 반영 (FX-REQ-214, P1) | Sprint 75 | ✅ | changes-parser/scanner + Δspec penalty. PR #213 |
| F223 | 문서 Sharding 자동화 — BMAD `shard-doc` 참고, 대형 PRD를 에이전트별 관련 섹션만 참조하도록 자동 분할. 에이전트 컨텍스트 윈도우 최적화 (FX-REQ-215, P2) | Sprint 76 | ✅ | D1 0062 + shard-doc 서비스. PR #214 |
| F224 | [Ref] SM→Dev 컨텍스트 전달 구조 — BMAD Story 파일 기반 컨텍스트 전달 방식 참고. Sprint 워크플로우(F142)에 적용 검토 (FX-REQ-216, P3) | Sprint 77 | ✅ | context-passthrough 서비스+라우트. PR #216 |
| F225 | [Ref] 슬래시 커맨드 UX — OpenSpec `/opsx:` 커맨드 패턴 참고. Phase 2 MCP/IDE 통합 시 커맨드 UX 설계 반영 (FX-REQ-217, P3) | Sprint 77 | ✅ | command-registry 서비스+라우트. PR #216 |
| F226 | [Ref] Party Mode (다중 에이전트 세션) — BMAD 자유형 토론 방식 참고. Ensemble Voting(F147) 보완적 적용 검토 (FX-REQ-218, P3) | Sprint 77 | ✅ | party-session 서비스+라우트+D1 0063. PR #216 |
| F227 | [Ref] Spec Library 구조 — OpenSpec 기능 단위 스펙 조직 방식 참고. Wiki 동기화(F46) 개선 시 적용 검토 (FX-REQ-219, P3) | Sprint 77 | ✅ | spec-library 서비스+라우트+D1 0064. PR #216 |
| F228 | [Ref] Expansion Packs 모델 — BMAD 도메인 확장 패키징/배포 방식 참고. Agent Marketplace(F152) 개선 시 적용 (FX-REQ-220, P3) | Sprint 77 | ✅ | expansion-pack 서비스+라우트+D1 0065. PR #216 |
| F229 | [Watch] Agent Spec 표준 — Oracle Open Agent Specification. Phase 3+ 에이전트 이식성 관점 장기 관찰. YAML/JSON 내보내기 포맷 검토 (FX-REQ-221, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 2026-09. F221 에이전트 정의 90% 호환, 워크플로우 레이어 GAP |
| F230 | [Watch] Scale-Adaptive Intelligence — BMAD 프로젝트 규모별 자동 조절 패턴. Phase 2+ 멀티스케일 지원 시 참고 (FX-REQ-222, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 Phase 2 시작 시. 적응 메커니즘 전무가 핵심 GAP |
| F231 | [Watch] Multi-repo Workspace — OpenSpec 조직 전체 복수 저장소 확장. 모노리포 넘어선 확장 시 필요 (FX-REQ-223, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 2026 하반기. 단일 리포 전제가 핵심 GAP |
| **Phase 7 — BD Pipeline End-to-End 통합 (FX-BD-V1)** | | | | PRD: docs/specs/fx-bd-v1/prd-final.md |
| F232 | 파이프라인 통합 대시보드 — 칸반/파이프라인 뷰 전환, 아이템별 단계·진행률·다음 액션 조회. D1 pipeline_stages 테이블 (FX-REQ-224, P0) | Sprint 79 | ✅ | PR #217 |
| F233 | 산출물 공유 시스템 — 인증 기반 공유 링크 생성 + 만료 설정 + 리뷰 요청 + 인앱/이메일 알림. D1 share_links + notifications (FX-REQ-225, P0) | Sprint 79 | ✅ | PR #217 |
| F234 | BDP 편집/버전관리 — 사업계획서 마크다운 에디터 + 버전 히스토리 + diff 뷰 + 최종본 잠금. D1 bdp_versions (FX-REQ-226, P0) | Sprint 80 | ✅ | PR #218 |
| F235 | ORB/PRB 게이트 준비 — 산출물 자동 수집 → 게이트 문서 패키지 구성 → ZIP 다운로드. D1 gate_packages (FX-REQ-227, P0) | Sprint 80 | ✅ | PR #218 |
| F236 | Offering Pack 생성 — 영업/제안용 번들(사업제안서+데모링크+기술검증+가격). D1 offering_packs (FX-REQ-228, P0) | Sprint 81 | ✅ | PR #219 |
| F237 | 사업제안서 자동 생성 — 사업계획서(BDP)에서 게이트 제출용 요약본 LLM 자동 추출 (FX-REQ-229, P1) | Sprint 80 | ✅ | PR #218 |
| F238 | MVP 추적 + 자동화 — MVP 상태(In Dev/Testing/Released) 추적 + PoC 배포 자동화 파이프라인. D1 mvp_tracking (FX-REQ-230, P1) | Sprint 81 | ✅ | PR #219 |
| F239 | 단계별 의사결정 워크플로 — Go/Hold/Drop 버튼 + 팀장 승인/반려 + 코멘트 + 이력 + 자동 단계 전환. D1 decisions (FX-REQ-231, P0) | Sprint 79 | ✅ | PR #217 |
| F240 | IR Bottom-up 채널 — 사내 현장(엔지니어/영업) 제안 전용 등록 폼 → biz-item 자동 변환 (FX-REQ-232, P2) | Sprint 81 | ✅ | PR #219 |
| **Phase 8 — IA 구조 개선 + 신규 사업 Prototyping** | | | | |
| F241 | 사이드바 프로세스 6단계 재구조화 — AX BD 프로세스(수집→발굴→형상화→검증→제품화→GTM) 기반 그룹 재배치 + 누락 4페이지 통합 (FX-REQ-233, P0) | Sprint 82 | ✅ | 커밋 1e1dabd |
| F242 | ProcessStageGuide 컴포넌트 — 경로 자동 감지 온보딩 가이드 + layout.tsx 전역 적용 (FX-REQ-234, P0) | Sprint 83 | ✅ | 커밋 1e1dabd |
| F243 | 대시보드 프로세스 파이프라인 진행률 뷰 + 퀵 액션 (FX-REQ-235, P1) | Sprint 84 | ✅ | 커밋 1e1dabd |
| F244 | AXIS DS 색상 뱃지 + 활성 단계 border 하이라이트 (FX-REQ-236, P1) | Sprint 84 | ✅ | 커밋 1e1dabd |
| F245 | GIVC Ontology 기반 산업 공급망 인과 예측 엔진 PoC — 한국기계산업진흥회 chatGIVC 고도화 제안. Ontology+KG로 데이터 사일로(무역/산업/R&D/EWS/GIVC) 연결, 4대 시나리오(이벤트 연쇄/대체 공급처/EWS 영향/리스크맵) Prototype. Palantir 방식 벤치마크 (FX-REQ-237, P2) | Sprint 92~108 | ✅ | **X5 재평가: CLOSE (drift 보정)**. F255(S92 PR #229)+F256(S93 PR #230)+F272(S101)+F279(S108 D1 0082) 분해 실행 완료. Round 0→1 CONVERGED 0.82→0.89. 잔여 3개 시나리오는 수주 성공 시 BD Pipeline에서 재정의. 피치덱: docs/specs/GIVC/koami_pitch_v0.1_260327.html. [[FX-PLAN-X5]] |
| F246 | Next.js → Vite + React Router 전환 — 빌드 인프라 교체. 빌드 메모리 750MB→369MB, 빌드 시간 22초→1초. SWC 바이너리 276MB 제거, 42곳 import 치환, 환경변수 9파일 (FX-REQ-238, P1) | Sprint 85 | ✅ | PR #223 |
| F247 | Vite 전환 검증 + 배포 — unit 207 pass, CI typecheck 통과, Cloudflare Pages dist/ 배포 (FX-REQ-239, P1) | Sprint 85 | ✅ | PR #223 |
| F248 | ProtectedRoute 인증 가드 — AppLayout 하위 36개 라우트에 미인증 접근 차단 + /login 리다이렉트. auth-store isHydrated 상태 추가, 비동기 hydration 완료 대기 (FX-REQ-240, P0) | Sprint 86 | ✅ | router.tsx + ProtectedRoute.tsx + auth-store.ts |
| F249 | E2E 인증 fixture 키 통일 — fx-token→token 4곳 수정 (auth.ts/org.ts/slack-config.spec.ts). 앱 코드와 테스트 localStorage 키 정합성 확보 (FX-REQ-241, P1) | Sprint 86 | ✅ | e2e/fixtures/ + e2e/slack-config.spec.ts |
| F250 | 로그인 E2E 테스트 보강 — 2→7개 시나리오 (미인증 리다이렉트 3, 폼 렌더링 1, 공개 페이지 접근 2, 만료 토큰 1) (FX-REQ-242, P1) | Sprint 86 | ✅ | e2e/auth-flow.spec.ts |
| **Phase 9 — 팀 온보딩 + 신규 사업 Prototyping** | | | | |
| F251 | 팀 계정 일괄 생성 + Org 초대 — AX BD팀 7명 + 공용계정 1개 = 8계정. Bulk Signup API + admin-service (FX-REQ-243, P0) | Sprint 87 | ✅ | PR #224, Match 97% |
| F252 | 온보딩 가이드 + 사용법 투어 고도화 — 역할별 투어 분기(admin 11/member 8스텝) + AdminQuickGuide + MemberQuickStart (FX-REQ-244, P1) | Sprint 87 | ✅ | PR #224, Match 97% |
| F253 | 팀 데이터 공유 — Org-scope 공유 뷰 (아이디어/BMC/인사이트/Discovery). org-shared route/service + team-shared 페이지 (FX-REQ-245, P0) | Sprint 88 | ✅ | PR #226 |
| F254 | NPS 피드백 수집 — 7일 주기 NPS 팝업 + 팀별 집계 대시보드. nps route/service + NpsSurveyTrigger + nps-dashboard (FX-REQ-246, P1) | Sprint 88 | ✅ | PR #226 |
| F255 | GIVC Ontology PoC 1차 — 산업 공급망 지식그래프 스키마 설계 + 샘플 데이터 로드 + 기본 질의 API (FX-REQ-247, P2) | Sprint 92 | ✅ | PR #229. Property Graph 3-테이블 + 16 API + KG 탐색기 |
| F256 | GIVC PoC 2차 — 4대 시나리오(이벤트 연쇄/대체 공급처/EWS 영향/리스크맵) 중 1개 MVP 구현 (FX-REQ-248, P2) | Sprint 93 | ✅ | PR #230. KgScenarioService + 핫스팟 감지 + 프리셋 3개 |
| F257 | 추가 BD 아이템 탐색 — Discovery 파이프라인으로 신규 사업 아이템 1~2건 발굴 + 사업성 체크포인트 통과 (FX-REQ-249, P2) | Sprint 93 | ✅ | PR #230. ontology 2탭 구조 (Explorer+Scenario) |
| **BD 스킬 통합 — AX BD 프로세스 v8.2 + 공용 스킬 체계를 Foundry-X 웹에 풀스택 반영** | | | | 참조: docs/specs/axbd-skill/ |
| F258 | BD 프로세스 가이드 UI — 2-0~2-10 단계별 프로세스 설명 + 유형별(I/M/P/T/S) 강도 매핑 테이블 + 사업성 체크포인트 가이드. /ax-bd/discovery 페이지 확장 (FX-REQ-250, P0) | Sprint 89 | ✅ | PR #225 |
| F259 | BD 스킬 카탈로그 UI — 76개 스킬 + 36개 커맨드 검색·필터·카테고리 뷰. 단계별 추천 스킬 하이라이트 + 스킬 상세(설명/입력/산출물) 팝업 (FX-REQ-251, P0) | Sprint 89 | ✅ | PR #225 |
| F260 | BD 스킬 실행 엔진 — 웹에서 스킬 선택 → API 호출 → Anthropic LLM 실행 → 산출물 반환. skill-execution.md 프레임워크 정의를 서버 측 프롬프트로 변환 (FX-REQ-252, P0) | Sprint 90 | ✅ | PR #227 |
| F261 | BD 산출물 저장 + 버전 관리 — 스킬 실행 결과를 biz-item별 산출물로 D1 저장 + 버전 히스토리. 2-0~2-10 단계별 산출물 연결 (FX-REQ-253, P0) | Sprint 90 | ✅ | PR #227. D1 0075 마이그레이션 |
| F262 | BD 프로세스 진행 추적 — biz-item별 현재 단계(2-0~2-10) + 사업성 신호등(Go/Pivot/Drop 누적) + Commit Gate 상태. 파이프라인 대시보드 연동 (FX-REQ-254, P0) | Sprint 91 | ✅ | PR #228 |
| **발굴 프로세스 UX 개선 — 위저드 UI + Help Agent + 온보딩 + HITL로 실사용 전환** | | | | 참조: docs/specs/fx-discovery-ux/prd-final.md |
| F263 | 발굴 프로세스 단계별 안내 UI — 위저드/스텝퍼 재구성 + biz-item별 진행 추적 (FX-REQ-255, P0) | Sprint 94 | ✅ | DiscoveryWizard + WizardStepper + StepDetail + D1 0077 |
| F264 | Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 안내 (FX-REQ-256, P0) | Sprint 95 | ✅ | Match 99%. openrouter-service + help-agent-service + D1 0078 |
| F265 | 발굴 온보딩 투어 개선 — 인터랙티브 3~5스텝 가이드 (FX-REQ-257, P0) | Sprint 94 | ✅ | DiscoveryTour 5스텝 |
| F266 | HITL 인터랙션 + 결과물 확인 — 인라인 패널 (승인/수정/재생성/거부) (FX-REQ-258, P0) | Sprint 96 | ✅ | Match 100%. hitl-review-service + HitlReviewPanel + D1 0078 |
| **BD 팀 공용 스킬 배포 — Claude Code 네이티브 스킬셋 GitHub 리포 공유** | | | | |
| F267 | BD 팀 공용 스킬 GitHub 배포 준비 — CLAUDE_AXBD 폴더 정리(76 skills + 36 commands + rules), 기존 axbd/ 리소스 통합, ax-bd-discovery 스킬 참조 갱신, README 배포 가이드 + 설치 가이드 UI 전면 재작성 (FX-REQ-259, P1) | Sprint 98 | ✅ | CLAUDE_AXBD + CoworkSetupGuide 3환경 |
| **Claude Code 개발 환경 Plugin 전환 — ax-config를 팀 공유 가능한 Plugin으로 변환** | | | | |
| F268 | ax-config Plugin 전환 — Command/Skill 중복 정리(20개), ax-config Git 정비, Plugin 형식 변환(plugin.json+marketplace), 팀 설치 가이드 (FX-REQ-260, P1) | Sprint 99 | ✅ | KTDS-AXBD/ax-plugin repo + 20 skills + `claude plugin install ax@ax-marketplace` |
| **발굴 UX 2차 정비 — IA 구조 + 페이지 중복 정리 + 플로팅 버튼 충돌 해소** | | | | |
| F269 | 발굴 IA & Page 정리 — (1) 데모 시나리오를 발굴 밖으로 이동 (2) 중복 메뉴 통합(프로세스 가이드↔Discovery 프로세스, 진행 추적↔진행률, Ontology·스킬카탈로그 위치 재조정) (3) FeedbackWidget↔HelpAgentChat 플로팅 버튼 겹침 해소 (FX-REQ-261, P0) | Sprint 100 | ✅ | Match 97%. 메뉴 10→3 + 탭 통합 3페이지 + HelpAgent Sheet 패널 |
| **Phase 10 — O-G-D Agent Loop (Harness × GAN)** | | | | |
| F270 | O-G-D 에이전트 정의 — ogd-orchestrator/generator/discriminator .md 3개 에이전트 파일 생성. Harness 규격 준수 (FX-REQ-262, P1) | Sprint 101 | ✅ | 3 agents (opus+sonnet×2) |
| F271 | BD 발굴 Rubric + References — ogd-rubric-bd.md(7항목) + ogd-convergence.md + ogd-mode-collapse.md 생성. 산업 템플릿 오버라이드 지원 (FX-REQ-263, P1) | Sprint 101 | ✅ | 7항목 Rubric + 3 references |
| F272 | O-G-D 독립 루프 검증 — _workspace/ 구조 + ogd-state.yaml 상태 관리 + 에러 핸들링 + 실제 BD 아이템 데모 실행 (FX-REQ-264, P0) | Sprint 101 | ✅ | GIVC chatGIVC 고도화 데모. Round 0→1 CONVERGED (0.82→0.89). 에러 0건. PRD v1.2 최적화 반영(R-25 search-cache + R-26 max_searches) |
| F273 | ax-bd-discovery v8.2 O-G-D 통합 — 2-5 Commit Gate 필수 적용 + 2-3/2-7 선택적. SKILL.md 수정 + references/ 추가 (FX-REQ-265, P1) | Sprint 102 | ✅ | Match 100%. SKILL.md O-G-D 섹션 + ogd-commit-gate.md + ogd-stage-rubrics.md (PR #231) |
| **Phase 10 — Skill Evolution (OpenSpace 내재화)** | | | | |
| F274 | Track A: 스킬 실행 메트릭 수집 — D1 skill_executions/skill_versions/skill_lineage/skill_audit_log 4테이블 + F143 대시보드 연동 + 감사 로그 (FX-REQ-266, P0) | Sprint 103 | ✅ | Match 100%. D1 0080 4테이블 + API 5 endpoints + 21 tests (PR #232) |
| F275 | Track D: 스킬 레지스트리 — ax-marketplace 확장(메타데이터: success_rate/token_cost/lineage) + 시맨틱 검색 + 버전 추적 + 안전성 검사 (FX-REQ-267, P0) | Sprint 104 | ✅ | Match 99%. D1 0081 2테이블 + API 8 endpoints + 40 tests (PR #233) |
| F276 | Track C: DERIVED 엔진 — BD 7단계 반복 성공 패턴 자동 추출 + 새 스킬 생성 + HITL 승인 (FX-REQ-268, P0) | Sprint 105 | ✅ | Match 100%. D1 0082 3테이블 + API 8 endpoints + 40 tests (PR #236) |
| F277 | Track C: CAPTURED 엔진 — 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성 + F191 방법론 레지스트리 연동 (FX-REQ-269, P1) | Sprint 106 | ✅ | Match 100%. D1 0083 3테이블 + API 8 endpoints + 35 tests (PR #237) |
| F278 | Track E: BD ROI 벤치마크 — Cold Start vs Warm Run 비교 + BD_ROI 공식 + F262 사업성 신호등 달러 환산 (FX-REQ-270, P1) | Sprint 107 | ✅ | Match 99%. D1 0084 2테이블 + API 8 endpoints + 39 tests (PR #241) |
| **Phase 10 — BD 데모 데이터 (Production Showcase)** | | | | |
| F279 | BD 데모 시딩 마이그레이션 — D1 0082: 2개 아이디어(헬스케어AI+GIVC) × 18테이블 104 rows INSERT. pipeline_stages 7단계 이력 + discovery_stages 11단계 + viability_checkpoints + commit_gates (FX-REQ-271, P0) | Sprint 108 | ✅ | Match 100%. D1 0082 104 rows + API 2311 pass (PR #234) |
| F280 | BD 산출물 콘텐츠 생성 — bd_artifacts 16건 상세 output_text(시장조사/경쟁분석/BMC/PRD/MVP 등 한글 1~3p). O-G-D 데모 결과물 직접 활용 + BMC 9블록 + BDP v1~v2 + Offering Pack items (FX-REQ-272, P0) | Sprint 108 | ✅ | Match 100%. 16건 한글 콘텐츠 1383줄 SQL (PR #234) |
| F281 | 데모 데이터 E2E 검증 — Production 배포 + 6단계 워크쓰루(수집→GTM) + 산출물 상세 Markdown 렌더링 확인 + UI 빈화면/깨짐 수정 (FX-REQ-273, P1) | Sprint 109 | ✅ | Match 100%. react-markdown+remark-gfm, API 7 tests + E2E 6 specs (PR #238) |
| **Phase 10 — BD 형상화 파이프라인 (Stage 3→4 자동화)** | | | | |
| F282 | BD 형상화 Phase A — 입력 점검 & 갭 분석 (체크리스트 10항목 + 갭 처리 전략 + ax-bd-shaping 스킬 메인) (FX-REQ-274, P0) | Sprint 110 | ✅ | PR #235, Match 100% |
| F283 | BD 형상화 Phase B+C — req-interview 연동 + O-G-D 형상화 루프 (Rubric 5차원 + shaping-orchestrator/generator/discriminator 3 에이전트 + 수렴 0.85) (FX-REQ-275, P0) | Sprint 110 | ✅ | PR #235, Match 100% |
| F284 | BD 형상�� Phase D — 다중 AI 모델 교차 검토 + Six Hats 토�� (OpenRouter 3모델 + 6색 모자 + 합의 매트릭스 + six-hats-moderator 에이��트) (FX-REQ-276, P1) | Sprint 111 | ✅ | PR #239, Match 100% |
| F285 | BD 형상화 Phase E — 전���가 AI ���르소나 리뷰 (TA/AA/CA/DA/QA 5종 에��전트 + 교차 영향 분석 + 통합 리뷰 보고서 + Fan-out/Fan-in) (FX-REQ-277, P1) | Sprint 111 | ✅ | PR #239, Match 100% |
| F286 | BD 형상화 Phase F — HITL 게시 & 편집 + 자동 모드 (Web PRD 에디터 + 섹션별 승인/수정/반려 + AI 자가 리뷰 3 페르소나 + auto-reviewer 에이전트) (FX-REQ-278, P1) | Sprint 112 | ✅ | PR #240, auto-reviewer + Web 에디터 + E2E |
| F287 | BD 형상화 D1 스키마 + Git 병행 저장 + 통합 E2E (shaping_runs/phase_logs/expert_reviews/six_hats 4테이블 + docs/shaping/ 산출물 + E2E 테스트) (FX-REQ-279, P0) | Sprint 112 | ✅ | PR #240, D1 0084 + API 13ep + 28 tests |

### Phase 11 — IA 대개편 (Figma v0.92 정합 + Role-based UX)

> 기준 문서: `docs/specs/IA-renewal_v2/FX-IA-Change-Plan-v1.1.docx` (13개 Figma 갭 G1~G13 + 온보딩/관리자/불필요메뉴 3건)

#### Phase 11-A: IA 구조 기반

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F288 | Role-based sidebar visibility + Admin 전용 메뉴 분리 — NavItem.visibility 속성 추가, auth-store role 기반 필터링. Member: BD 6단계+설정(개인) / Admin: 전체. F252 역할 분기 패턴 재활용 (FX-REQ-280, P1) | Sprint 113 | ✅ | PR #242, Match 92%. sidebar.tsx + 14 tests |
| F289 | 사이드바 리브랜딩 + 메뉴 재배치 — ideas→Field 수집, F240→IDEA Portal, multi-persona를 4단계→2단계 발굴 이동, spec-generator를 형상화 PRD로 흡수. 온보딩 완료 시 시작하기 조건부 숨김 (FX-REQ-281, P1) | Sprint 113 | ✅ | PR #242, 리브랜딩 3건 + 조건부 노출 |
| F290 | Route namespace 마이그레이션 — flat 경로를 6단계 계층 구조로 전환 (/collection/*, /discovery/*, /shaping/*, /validation/*, /product/*, /gtm/*) + 16건 redirect + ProcessStageGuide 경로 매핑 갱신 (FX-REQ-282, P1) | Sprint 114 | ✅ | PR #243, Match 100%. 22경로 + 16 redirect + 30파일 + 287 tests |

#### Phase 11-B: 프로세스 기능 확장

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F291 | Discovery-X Agent 자동 수집 — 시장/뉴스/기술 트렌드 Agent 기반 자동 수집 + 1단계 수집에 배치 (FX-REQ-283, P2) | Sprint 115 | ✅ | PR #244, Match 100%. D1 0085 + API 3ep + Web 1p |
| F292 | 사업계획서 HITL 고도화 — F180 기존 BDP 초안에 HITL 패널 + 멀티 템플릿 지원 추가. 섹션별 승인/수정/반려 (FX-REQ-284, P2) | Sprint 118 | ✅ | PR #249, D1 0088 + HITL 공유 컴포넌트 + Web |
| F293 | 초도 미팅용 Offering — 3단계 형상화에 고객 미팅용 자료 자동 생성 페이지 신규 (FX-REQ-285, P2) | Sprint 119 | ✅ | PR #247, D1 0089 + API 3ep + Web 1p |
| F294 | 2-tier 검증 + Pre-PRB 분리 — 본부 검증→전사 검증 순차 워크플로 + F235 ORB/PRB 게이트에서 Pre-PRB 분리. F239 의사결정을 2-tier 확장 (FX-REQ-286, P2) | Sprint 116 | ✅ | PR #245, D1 0086 + API + Web 2p |
| F295 | 전문가 인터뷰/미팅 관리 — 4단계 검증 내 오프라인 활동(전문가 인터뷰, 유관부서 미팅) 기록 + 일정 관리 (FX-REQ-287, P2) | Sprint 116 | ✅ | PR #245, 미팅 CRUD + Web 1p |
| F296 | 통합 평가 결과서 생성 — 2단계 발굴 스킬 결과(2-1~2-8) 종합 보고서 자동 생성 + F261 산출물 연동 (FX-REQ-288, P2) | Sprint 117 | ✅ | PR #246, D1 0087 + API 3ep + Web 1p |

#### Phase 11-C: 고도화 + GTM

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F297 | Prototype HITL 고도화 — F181 기존 Prototype 생성에 HITL 패널 추가 + 다중 프레임워크 지원 (FX-REQ-289, P3) | Sprint 118 | ✅ | PR #249, HITL 공유 컴포넌트 + /shaping/prototype |
| F298 | PoC 관리 분리 — MVP 추적(F238)과 별도로 PoC 전용 진행 추적 + 성과 측정 (FX-REQ-290, P3) | Sprint 120 | ✅ | PR #248, D1 0090 + API 5ep + Web 1p |
| F299 | 대고객 선제안 GTM — 6단계 GTM에 고객 선제안 워크플로 + 제안서 자동 생성 (FX-REQ-291, P4) | Sprint 121 | ✅ | PR #252, D1 0088 + API 11ep + Web 2p + 52 tests. Match 98% |

### 인프라/품질 — E2E 테스트 관리

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F300 | E2E 테스트 종합 정비 — 실패 16건 수정 + API-only 5 spec 삭제 + redirect 검증 16건 + uncovered 8p 확대 + waitForTimeout 제거 + fixture 정리 (FX-REQ-292, P1) | Sprint 122 | ✅ | 세션 #185. 158→161 tests, 85.4%→100% pass. 31 specs, 153 pass / 0 fail / 6 skip |
| F302 | E2E 상세 페이지 커버리지 확장 — 파라미터(:id) 상세 페이지 8건 E2E 추가 + mock factory 패턴 도입 + skip 6건 재활성화 검토 (FX-REQ-294, P2) | Sprint 124 | ✅ | PR #259. mock-factory 11종 + detail-pages 10건. Match 95%. 169→179 tests. Skip 5건 유지(UI 미완/flaky) |

### BD 산출물 접근성 — UX 동선 연결

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F301 | BD 산출물 UX 연결성 개선 — discovery-detail 산출물 섹션 추가 + Pipeline 카드 드릴다운 + MVP 카드 biz_item 역링크 (FX-REQ-293, P2) | Sprint 123 | ✅ | 세션 #186 Prod 점검 결과. Phase 1: discovery-detail.tsx에 ArtifactList+ProcessProgress 삽입. Phase 2: pipeline.tsx 카드 클릭→상세. Phase 3: mvp-tracking 역링크. F300과 병렬 가능 |

### Phase 12 — Skill Unification (3개 스킬 시스템 통합)

> PRD: `docs/specs/fx-skill-unify/prd-final.md`
> 목표: skill-framework CLI + Foundry-X API skill_registry + ax-marketplace를 유기적으로 연결
> 배치: 3배치 안정형 — B1(S125 F303+F304 병렬) → B2(S126 F305 + S127 F306 병렬) → B3(S128 F307+F308 병렬)

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F303 | SkillCatalog API 전환 — Web bd-skills.ts → skill_registry API 호출 + 실시간 검색/필터/메트릭 표시 (FX-REQ-295, P0) | Sprint 125 | ✅ | D1 해소. api-client 4메서드 + hooks 3개 + SkillCatalog/Card/DetailSheet/ProcessGuide 전환. PR #260 |
| F304 | 벌크 레지스트리 API + sf-scan 연동 — POST /api/skills/registry/bulk + sf-scan --api-register 옵션 (FX-REQ-296, P0) | Sprint 125 | ✅ | D2 해소. bulkUpsert 50건 배치 + sf-scan-register.sh. PR #260 |
| F305 | 스킬 실행 메트릭 수집 — usage-tracker.sh → POST /api/skills/metrics/record + CC 훅 연동 (FX-REQ-297, P0) | Sprint 126 | ✅ | D4 해소. POST 라우트 + usage-tracker-hook.sh + 26 tests. PR #261 |
| F306 | DERIVED/CAPTURED → SKILL.md 자동 생성 + Deploy API + marketplace 등록 플로우 (FX-REQ-298, P0) | Sprint 127 | ✅ | D3 해소. SkillMdGenerator + Deploy API + D1 0089 + Review 연동. PR #262 |
| F307 | SkillEnrichedView 대시보드 + 진화 계보 시각화 — registry+metrics+lineage 통합 뷰 (FX-REQ-299, P1) | Sprint 128 | ✅ | EnrichedViewPage + MetricsCards + LineageTree + VersionHistory. PR #263 |
| F308 | Skill Unification 통합 QA + 데모 데이터 + Production 배포 (FX-REQ-300, P1) | Sprint 128 | ✅ | E2E 2파일 + skill-demo-seed.sh. PR #263 |

### 비주얼 협업 도구 통합 (FX-PLAN-013, Phase A+B)

> PRD: `docs/specs/FX-PLAN-013-visual-collab-prd.docx` (v1.2, Dry-run 2차 완료)
> Phase A(Marker.io) 즉시 실행 + Phase B(TinaCMS) 조건부 실행. Marker.io 계정: ktds.axbd@gmail.com, 14일 Free Trial.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F309 | Marker.io 비주얼 피드백 통합 — MarkerWidget.tsx + VITE_MARKER_PROJECT_ID 환경변수 + GitHub Issues 연동(visual-feedback 라벨) + 팀 온보딩 가이드 (FX-REQ-301, P1) | Sprint 129 | ✅ | PR #257, Match 100%. deploy.yml VITE_MARKER_PROJECT_ID secret 주입 추가. fx.minu.best 위젯 동작 확인 |
| F310 | TinaCMS 호환성 PoC — feat/tinacms-poc 브랜치에서 Vite 8 + React Router 7 충돌 검증 + /admin 라우팅 + pnpm build/typecheck/e2e 전체 통과 확인 (FX-REQ-302, P2) | Sprint 130 | ✅ | PR #258, Match 100%. **Go 판정** — G1~G5 전체 PASS. F311 착수 가능 |
| F311 | TinaCMS 인라인 에디팅 본구현 — tina/config.ts + content/ 디렉터리 구조화 + useTina hook 컴포넌트 연결 + /admin 3중 방어(_redirects+RR7+Vite) + TinaCloud 권한 설정 + CF Pages 배포 (FX-REQ-303, P3) | Sprint 131 | ✅ | PR #264, Match 100%. TinaCloud 설정 완료. fx.minu.best/admin 프로덕션 동작 확인 ✅ |
| F312 | 형상화 자동 전환 + Phase A~F 자동 실행 — 2-10 최종보고서 완료 시 형상화 Phase A~F 자동 파이프라인 트리거 + 발굴 산출물 전달 (FX-REQ-304, P0) | Sprint 132 | ✅ | PR #266. discovery-pipeline-service + shaping-orchestrator |
| F313 | 파이프라인 상태 머신 + 실패/예외 관리 — 이벤트 기반 상태 머신 오케스트레이션 + 재시도/건너뛰기/중단 옵션 + 에러 표준화 (FX-REQ-305, P0) | Sprint 132 | ✅ | PR #266. pipeline-state-machine + error-handler. 44 tests |
| F314 | 발굴 연속 스킬 파이프라인 + HITL 체크포인트 — 2-0~2-10 자동 순차 실행 + 사업성 체크포인트(Commit Gate) 사용자 승인 UI (FX-REQ-306, P1) | Sprint 133 | ✅ | PR #267. runner+checkpoint+route 4EP+Web 2컴포넌트. 26 tests |
| F315 | 상태 모니터링 + 알림 + 권한 제어 — 파이프라인 진행 대시보드 + 실시간 알림 + HITL 승인 권한 관리 (FX-REQ-307, P1) | Sprint 134 | ✅ | PR #269. monitoring+notification+permission 3서비스. 20 tests |
| F316 | Discovery E2E 테스트 — 위저드 전체 흐름 + 아이템 상세 + 스킬 실행 + HITL 리뷰 E2E (FX-REQ-308, P2) | Sprint 135 | ✅ | PR #268. 3spec 10건 E2E + mock-factory 확장. Match 100% |
| F317 | 데이터 백업/복구 + 운영 계획 — 산출물 백업 + 복구 시나리오 + 운영 정책 + Hotfix 체계 (FX-REQ-309, P2) | Sprint 136 | ✅ | PR #270. backup-restore + cron + ops-guide. 10 tests |
| F318 | 팀 도구 가이드 페이지 + Help Agent 연동 — /tools-guide 정적 라우트(Marker.io+TinaCMS 사용법) + 사이드바 메뉴 + Help Agent LOCAL_PATTERNS 4건 + 시스템 프롬프트 도구 지식 추가 (FX-REQ-310, P2) | — | ✅ | 세션 #192. 코드 직접 구현 (Sprint 없이) |

### Marker.io 피드백 자동화 + TinaCMS 네비게이션 (FX-PLAN-014)

> Marker.io 피드백 → Agent 자동 처리 E2E 파이프라인 + TinaCMS 사이드바/랜딩 동적 메뉴 관리

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F319 | Marker.io 피드백 Webhook 수신 + D1 큐 — GitHub Issue webhook → Workers API endpoint + D1 feedback_queue 테이블(상태 머신: pending→processing→done/failed) + visual-feedback 라벨 필터링 (FX-REQ-311, P1) | Sprint 137 | ✅ | PR #271. D1 0094 + webhook extension + 4 API endpoints. 12 tests |
| F320 | 피드백 자동 처리 Agent + PR 생성 — WSL 큐 소비자 스크립트 + Claude Code CLI Agent 연동 + Issue 분석→코드수정→테스트→PR 자동 생성 + 관리자 GitHub Review 알림 (FX-REQ-312, P1) | Sprint 137 | ✅ | PR #271. feedback-consumer.sh + feedback-agent-prompt.md |
| F321 | TinaCMS 네비게이션 동적 관리 — navigation TinaCMS collection + 사이드바 메뉴 순서/표시 content 파일 기반 렌더링 + 랜딩 페이지 섹션 순서 CMS 관리 (FX-REQ-313, P2) | Sprint 138 | ✅ | PR #272. navigation collection + sidebar.json + navigation-loader.ts + Section Registry 패턴 |

### Phase 13: IA 재설계 v1.3 — 액션 중심 메뉴 재설계 + 탭 통합

> FX-IA-Change-Plan-v1.3.docx 기반. Member 메뉴 25→12개(52% 축소), 탭 통합 3건, 버전관리 패턴 전 산출물 적용. TBD 항목(수집/GTM) 제외.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F322 | 사이드바 구조 재설계 — 25→12 메뉴 축소, processGroups 전면 재구성, 수집 TBD 접기, 하단 고정(위키+설정), Admin 역할 분리 7메뉴 (FX-REQ-314, P0) | Sprint 139 | ✅ | PR #273. Match 98%. 8 files +464/-175. sidebar.json+sidebar.tsx+router.tsx+tina/config.ts |
| F323 | 대시보드 ToDo List + 업무 가이드 — 파이프라인 현황 + 아이템별 단계 표시 + 체크리스트 + 의사결정 대기 알림 + 4단계 검증·제품화·개발 가이드 (FX-REQ-315, P1) | Sprint 141 | ✅ | PR #275. Match 100%. TodoSection(207L)+WorkGuideSection(112L) |
| F324 | 발굴 탭 통합 — 3탭(대시보드/프로세스/BMC) + 멀티 페르소나 프로세스 내 통합 + 평가 결과서 + 스킬카탈로그→위키 이동 (FX-REQ-316, P1) | Sprint 141 | ✅ | PR #275. Match 100%. discovery-unified.tsx(61L) 3탭 래퍼 |
| F325 | 형상화 재구성 + 버전관리 패턴 — 사업기획서/Offering/PRD/Prototype 4메뉴 + 전 산출물 초안→피드백→버전 업데이트→비교 (FX-REQ-317, P2) | Sprint 142 | ✅ | PR #276. VersionBadge(90L)+형상화 4라우트 수정+validation-unified(70L) |
| F326 | 검증 탭 통합 + 산출물 공유 — 4탭(인터뷰·미팅/본부/전사/임원) + Go/Hold/Drop 의사결정 + 공유 메뉴 (FX-REQ-318, P2) | Sprint 142 | ✅ | PR #276. validation-unified.tsx 4탭+임원 placeholder |
| F327 | 제품화 탭 통합 + Offering Pack — MVP/PoC 2탭 + Offering Pack 버전관리 (FX-REQ-319, P3) | Sprint 143 | ✅ | PR #278. product-unified.tsx(49L) 2탭 래퍼 |
| F328 | 시작하기 통합 + 공통 메뉴 정리 — 5영역(온보딩+스킬가이드+Cowork+데모+도구가이드) + 팀공유→산출물 흡수 (FX-REQ-320, P3) | Sprint 143 | ✅ | PR #278. getting-started.tsx 5영역 HubCard 확장 |
| **Blueprint 랜딩 페이지 비주얼 전환 — 설계도 메타포 디자인** | | | | |
| F329 | Blueprint 랜딩 페이지 전면 전환 — landing.tsx 7개 섹션 설계도 스타일 리디자인 (플로우차트 Process, 시스템 다이어그램 Architecture, Gantt Roadmap, 회로도 Agents), bp-* CSS 적용, 다크 모드, 반응형 유지 (FX-REQ-321, P2) | Sprint 145 | ✅ | PR #274. 독립 트랙. bp-* CSS + landing.tsx 7섹션 리디자인 |
| **ECC 반영 — Harness Rules & Git Guard** | | | | |
| F330 | rules/ 5종 신규 작성 — coding-style, git-workflow, testing, security, sdd-triangle (CLAUDE.md에서 추출, CC 자동 로딩) (FX-REQ-322, P1) | Sprint 146 | ✅ | PR #277. Match 100%. 5파일 97줄 (coding-style 22 + git-workflow 17 + testing 22 + security 16 + sdd-triangle 20) |
| F331 | PreToolUse git guard — --no-verify, git add ., force push, reset --hard 차단 (pre-bash-guard.sh + settings.json) (FX-REQ-323, P2) | Sprint 146 | ✅ | PR #277. Match 100%. pre-bash-guard.sh 31줄 + settings.json Bash 매처 추가 |
| **랜딩 페이지 콘텐츠 리뉴얼** | | | | |
| F332 | 랜딩 콘텐츠 리뉴얼 — BDP 6+1단계 수정, 3대 차별점(BDP+AI에이전트+오케스트레이션), 에이전트 3그룹(발굴/형상화/실행), 아키텍처→시스템 구성도 1장, 생태계→오픈소스 연계, 로드맵 축소, Stats 사용자 중심, 히어로 직설형 메시지. Blueprint 시각화 강화 (FX-REQ-324, P1) | Sprint 147 | ✅ | PR #279. Match 100%. ~8분 autopilot |

### Phase 14: Agent Orchestration Infrastructure — 2계층 루프 아키텍처 + 상태머신 + 텔레메트리

> ECC × Optio × GAN × OpenSpace 교차 분석 기반. 기존 O-G-D/Skill(Phase 10) 위에 TaskState + Event Bus + Orchestration Loop 인프라 레이어 추가. Additive 전략 (기존 API 변경 없음). 근거: `docs/specs/FX-Unified-Integration-Plan.md` (GAN R2 CONDITIONAL_PASS, Score 0.78)

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| **Foundation (점진적 전달 — 매 Sprint마다 동작하는 결과물)** | | | | |
| F333 | TaskState Machine — TaskState enum(10상태) + D1 task_states 마이그레이션 + API 2건(GET/POST /tasks/:id/state\|transition) + TransitionGuard 기본 구현 + ~50 단위 테스트. GAN 잔여이슈 N7(Agent→Task 연결) 해결 포함. ~620 LOC (FX-REQ-325, P0) | Sprint 148 | ✅ | PR #284. Match 100%. 15파일 2189줄. ~16분 autopilot |
| F334 | Hook Layer + Event Bus — hooks.json 4종 + shell scripts 4종 + HookResultProcessor(exit code→TaskEvent 변환) + TaskEvent 타입 + Event Bus(이벤트 정규화+라우팅) + FEEDBACK_LOOP_TRIGGERS 매핑 + D1 execution_events + ~45 테스트. GAN 잔여이슈 N2(Event소스), N6(Hook환경) 해결 포함. ~1090 LOC (FX-REQ-326, P0) | Sprint 149 | ✅ | PR #286. Match 100%. 20파일 2265줄. 47 tests. ~20분 autopilot |
| F335 | Orchestration Loop — 3모드(retry/adversarial/fix) OrchestrationLoop 구현 + FeedbackLoopContext(진입/탈출 관리) + AgentAdapter 인터페이스 + 텔레메트리 수집 미들웨어(Event Bus 구독→D1) + E2E 통합 테스트(Hook→Event→Transition→Loop→Telemetry) ~35건. GAN 잔여이슈 N1(FeedbackContext), N4(Guard서비스), N5(수렴기준) 해결 포함. ~1150 LOC (FX-REQ-327, P0) | Sprint 150 | ✅ | PR #287. Match 100%. 16파일 2518줄. 31 tests. ~16분 autopilot |
| **Feature (기존 에이전트 통합 + 관측성)** | | | | |
| F336 | Agent Adapter 통합 — 기존 에이전트(deploy-verifier, spec-checker, build-validator 등)를 AgentAdapter 인터페이스로 래핑 + Discriminator 역할 태깅(YAML frontmatter role 추가) + handleFeedback() 점진적 추가. 기존 동작 100% 보존, 인터페이스만 추가 (FX-REQ-328, P1) | Sprint 151 | ✅ | PR #290. Match 100%. 36파일 1760줄. 27 tests. ~28분 autopilot |
| F337 | Orchestration Dashboard — 태스크 상태 뷰(Kanban, 상태머신 시각화) + 루프 이력 뷰(라운드별 품질 점수 추이) + 텔레메트리 대시보드(태스크/스킬/라운드별 비용) (FX-REQ-329, P1) | Sprint 152 | ✅ | PR #289. Match 98%. Kanban+LoopHistory+Telemetry 3뷰 + E2E |
| F338 | SPA 라우팅 404 해결 — _redirects catch-all 미동작 근본 원인 분석 + wrangler.toml 연관 확인 + Cloudflare Pages 라우팅 설정 정비 (FX-REQ-330, P1) | Sprint 153 | ✅ | PR #285, deploy.yml 검증 강화로 해소 |
| F339 | Marker.io Capture Failed 해결 — 브라우저 확장 프로그램 충돌 원인 분석 + 시크릿 모드 테스트 + 대안 스크린샷 방식 검토 (FX-REQ-331, P1) | Sprint 153 | ✅ | PR #285, Marker.io 위젯 재설정 |
| F340 | JWT 토큰 갱신 — feedback-consumer 장기 토큰 또는 자동 갱신 메커니즘 구현 (FX-REQ-332, P1) | Sprint 153 | ✅ | PR #285, Webhook Secret 기반 갱신 |
| F341 | TinaCMS Navigation 컬렉션 표시 — admin에서 Navigation 미표시 원인 분석 + JSON collection 지원 확인 + 설정 보정 (FX-REQ-333, P1) | Sprint 153 | ✅ | PR #285, tina-lock 재빌드로 해소 |

### Phase 15: Discovery UI/UX 고도화 v2 — 멀티 페르소나 평가 + 9탭 리포트 + 팀 검토

> 발굴 Wizard 뼈대(Phase 9) 위에 결과물 시각화(멀티 페르소나 평가, 9탭 리포트)와 의사결정(팀 검토 Go/Hold/Drop) 레이어 추가. 발굴→형상화 End-to-End 완결. PRD: `docs/specs/fx-discovery-ui-v2/prd-final.md`. Phase 14(Agent Orchestration)와 독립 병렬 진행.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| **Sprint 154 — DB 스키마 + 강도 라우팅 + output_json POC** | | | | |
| F342 | DB 스키마 확장 — D1 마이그레이션 4건(0098~0101): ax_persona_configs + ax_persona_evals + ax_discovery_reports + ax_team_reviews + API 3 서비스 + Zod 스키마 (FX-REQ-334, P0) | Sprint 154 | ✅ | PR #288. Foundation |
| F343 | 유형별 강도 라우팅 UI — IntensityIndicator + IntensityMatrix + 5유형×7단계 시각화 + output_json 렌더링 POC (FX-REQ-335, P0) | Sprint 154 | ✅ | PR #288. F342 선행 |
| **Sprint 155 — AI 멀티 페르소나 평가 (핵심)** | | | | |
| F344 | 멀티 페르소나 평가 UI — PersonaCardGrid + WeightSliderPanel(8축) + ContextEditor + BriefingInput + recharts (FX-REQ-336, P0) | Sprint 155 | ✅ | PR #291. 8 페르소나 × 8축 |
| F345 | 멀티 페르소나 평가 엔진 — POST /ax-bd/persona-eval(Claude SSE) + EvalProgress + EvalResults + 데모 모드 + Rate Limiting (FX-REQ-337, P0) | Sprint 155 | ✅ | PR #291. green/keep/red verdict |
| **Sprint 156 — 발굴 완료 리포트 (9탭 중 4탭 선 구현)** | | | | |
| F346 | 리포트 공통 컴포넌트 + 프레임 — StepHeader + InsightBox + MetricCard + NextStepBox + HITLBadge + 9탭 프레임 + GET /discovery-report/:itemId (FX-REQ-338, P0) | Sprint 156 | ✅ | PR #292. Gap 96% |
| F347 | 리포트 탭 4종 — ReferenceAnalysisTab + MarketValidationTab + CompetitiveLandscapeTab + OpportunityIdeationTab (FX-REQ-339, P0) | Sprint 156 | ✅ | PR #292. 차트 포함 |
| **Sprint 157 — 나머지 탭 + 팀 검토 + Export** | | | | |
| F348 | 리포트 탭 5종 완성 — 2-5~2-9 (FX-REQ-340, P1) | Sprint 157 | ✅ | PR #293. Match 94% |
| F349 | 팀 검토 & Handoff — TeamReviewPanel + ExecutiveSummary + decide API + HandoffChecklist (FX-REQ-341, P0) | Sprint 157 | ✅ | PR #293. Go/Hold/Drop 투표 |
| F350 | 리포트 공유 + PDF Export — ShareReportButton + ExportPdfButton + html2canvas (FX-REQ-342, P1) | Sprint 157 | ✅ | PR #293 |
| **Phase 16 — Prototype Auto-Gen (PRD→Prototype 자동 생성)** | | | | PRD: `docs/specs/prototype-auto-gen/prd-final.md` |
| **Sprint 158 — Foundation + Builder Server** | | | | |
| F351 | React SPA 템플릿 + Builder Server 스캐폴딩 (FX-REQ-343, P0) | Sprint 158 | ✅ | Phase 16 Foundation. PR #294 | Phase 16 Foundation. Phase 15 독립 |
| F352 | Claude Code CLI `--bare` 모드 서버 실행 검증 — E2E PoC: PRD입력→CLI실행→빌드→Pages배포→URL반환. Haiku 모델 비용 실측. --allowedTools 권한 설정 (FX-REQ-344, P0) | Sprint 158 | ✅ | F351 동시 |
| **Sprint 159 — Core Pipeline + API** | | | | |
| F353 | D1 마이그레이션 + Prototype API — prototypes 테이블(D1) + POST/GET/PATCH /api/prototypes 3 라우트 + PrototypeService + Zod 스키마 + State Machine(queued→building→live/failed→dead_letter) (FX-REQ-345, P0) | Sprint 159 | ✅ | F351 선행 |
| F354 | Fallback 아키텍처 + 비용 모니터링 — CLI→API직접호출 자동 전환 + API 사용량/비용 실시간 추적 + 월 예산 상한 알림 (FX-REQ-346, P0) | Sprint 159 | ✅ | F353 동시 |
| **Sprint 160 — O-G-D 품질 루프 + Web 통합** | | | | |
| F355 | O-G-D 품질 루프 — Orchestrator(체크리스트 전처리) + Generator(--bare -p, Haiku) + Discriminator(Pass/Fail 판정) + 수렴 판정(max 3 rounds, ≥0.85 탈출) (FX-REQ-347, P0) | Sprint 160 | ✅ | F353 선행 |
| F356 | Prototype 대시보드 + 실사용자 피드백 Loop — 목록/상세/빌드로그/iframe 프리뷰 + BD팀 피드백 입력→Generator 재생성 자동 반영 + Slack 알림 (FX-REQ-348, P1) | Sprint 160 | ✅ | F353 선행. F355 병렬 |
| **Phase 17 — Self-Evolving Harness v2 (하네스 자가 발전 루프 완성)** | | | | PRD: `docs/specs/fx-harness-evolution/prd-final.md`. 전략: `docs/specs/self-evolving-harness-strategy.md` (FX-STRT-015 v3.0) |
| **Sprint 161 — 데이터 진단 + 패턴 감지** | | | | |
| F357 | 데이터 상태 진단 + 기준선 수립 — execution_events/task_histories 데이터 양·기간·품질 진단. 반복 실패 패턴 추출 가능성 확인. 기준선 보고서 생성 (FX-REQ-349, P0) | Sprint 161 | ✅ | PR #298. Match 100%, 18 tests |
| F358 | 반복 실패 패턴 감지 + Rule 초안 생성 — PatternDetector(source × severity 클러스터링) + RuleGenerator(LLM Haiku 기반 자연어 Rule 초안, 패턴 근거 주석 포함) (FX-REQ-350, P0) | Sprint 161 | ✅ | PR #298 |
| **Sprint 162 — 승인 플로우 + Rule 배치** | | | | |
| F359 | 세션 내 Rule 승인 플로우 — GuardRailDeployService + POST deploy API + builder 미들웨어 버그 수정. YAML frontmatter Rule 파일 생성 (FX-REQ-351, P0) | Sprint 162 | ✅ | PR #299. Match 97%, 10 tests 추가 |
| **Sprint 163 — O-G-D Loop 범용화** | | | | |
| F360 | O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리 (FX-REQ-352, P0) | Sprint 163 | ✅ | PR #301 |
| **Sprint 164 — 운영 지표 + 효과 측정** | | | | |
| F361 | 에이전트 자기 평가 연동 + Rule 효과 측정 (FX-REQ-353, P1) | Sprint 164 | ✅ | PR #300 |
| F362 | 운영 지표 대시보드 — Skill 재사용률 + 에이전트 활용률 + Dashboard 탭 (FX-REQ-354, P1) | Sprint 164 | ✅ | PR #300 |

| **Phase 18 — Offering Pipeline (AX BD 형상화 자동화)** | | | | PRD: `docs/specs/fx-offering-pipeline/prd-final.md`. 아키텍처: `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` |
| **Sprint 165 — Foundation: Skill 등록 + 디자인 토큰** | | | | |
| F363 | offering-html SKILL.md 등록 + ax-bd/shape/ 디렉토리 + INDEX.md (FX-REQ-355, P0) | Sprint 165 | ✅ | PR #302. Match 100% |
| F364 | HTML 템플릿 분리 — base.html + 17종 컴포넌트 + examples/KOAMI (FX-REQ-356, P0) | Sprint 165 | ✅ | PR #302 |
| F365 | 디자인 토큰 Phase 1 — design-tokens.md 컬러/타이포/레이아웃 (FX-REQ-357, P1) | Sprint 165 | ✅ | PR #302 |
| F366 | F275 Skill Registry 연동 — evolution: DERIVED 선언 (FX-REQ-358, P1) | Sprint 165 | ✅ | PR #302 |
| **Sprint 166 — Foundation: Agent 확장 + PPTX 설계** | | | | |
| F367 | offering-pptx SKILL.md 등록 + Cowork 연동 설계 (FX-REQ-359, P1) | Sprint 166 | ✅ | PR #303. Match 97% |
| F368 | ax-bd-offering-agent — shaping-orchestrator 확장, 6 capability (FX-REQ-360, P0) | Sprint 166 | ✅ | PR #303 |
| **Sprint 167 — Data Layer: D1 + CRUD** | | | | |
| F369 | D1 마이그레이션 — offerings/offering_versions/offering_sections/offering_design_tokens (FX-REQ-361, P0) | Sprint 167 | ✅ | PR #305. Match 99% |
| F370 | Offerings CRUD API — POST/GET/PUT/DELETE + Zod 스키마 + 서비스 (FX-REQ-362, P0) | Sprint 167 | ✅ | PR #305 |
| F371 | Offering Sections API — 18섹션 CRUD + 필수/선택 토글 (FX-REQ-363, P0) | Sprint 167 | ✅ | PR #305 |
| **Sprint 168 — Data Layer: Export + Validate** | | | | |
| F372 | Offering Export API — HTML/PDF export, base.html + 컴포넌트 렌더링 (FX-REQ-364, P0) | Sprint 168 | ✅ | PR #307. Match 100% |
| F373 | Offering Validate API — O-G-D Loop(F335) + Six Hats + Expert 호출 (FX-REQ-365, P0) | Sprint 168 | ✅ | PR #307 |
| **Sprint 169 — Full UI: 목록 + 위자드** | | | | |
| F374 | Offerings 목록 페이지 — 리스트 뷰, 상태 필터, 버전 히스토리 (FX-REQ-366, P0) | Sprint 169 | ✅ | PR #310. Match 100% |
| F375 | Offering 생성 위자드 — 발굴 연결 + 목적/포맷/목차 선택 (FX-REQ-367, P0) | Sprint 169 | ✅ | PR #310 |
| **Sprint 170 — Full UI: 에디터 + 검증 대시보드** | | | | |
| F376 | 섹션 에디터 + HTML 프리뷰 — 실시간 프리뷰, 섹션별 편집 (FX-REQ-368, P0) | Sprint 170 | ✅ | PR #309. Match 100% |
| F377 | 교차검증 대시보드 — GAN 추진론/반대론 + Six Hats + Expert 시각화 (FX-REQ-369, P1) | Sprint 170 | ✅ | PR #309 |
| **Sprint 171 — Integration: 어댑터 + 파이프라인** | | | | |
| F378 | 콘텐츠 어댑터 — 3가지 톤 변환 (executive/technical/critical) + UI (FX-REQ-370, P0) | Sprint 171 | ✅ | PR #312. Match 95% |
| F379 | discover → shape 자동 전환 — EventBus(F334) 이벤트 발행/소비 (FX-REQ-371, P0) | Sprint 171 | ✅ | PR #312 |
| **Sprint 172 — Integration: PPTX 구현** | | | | |
| F380 | offering-pptx 구현 — PPTX 생성 엔진 + 표준 목차 슬라이드 변환 (FX-REQ-372, P1) | Sprint 172 | ✅ | PR #313. Match 97% |
| **Sprint 173 — Polish: 토큰 에디터 + Prototype** | | | | |
| F381 | 디자인 토큰 Phase 2+3 — JSON 정규 + API + Web 실시간 에디터 (FX-REQ-373, P1) | Sprint 173 | ✅ | PR #314. Match 97% |
| F382 | prototype-builder 연동 — Offering → Phase 16 Builder 자동 호출 (FX-REQ-374, P1) | Sprint 173 | ✅ | PR #314 |
| **Sprint 174 — Polish: E2E + 메트릭** | | | | |
| F383 | E2E 파이프라인 테스트 + BD ROI 메트릭 수집 F274+F278 연동 (FX-REQ-375, P1) | Sprint 174 | ✅ | PR #315. Match 100% |
| **Phase 19 — Builder Evolution (Prototype 품질 자동화)** | | | | PRD: `docs/specs/fx-builder-evolution/prd-final.md`. 착수: Conditional (PoC 조건부) |
| **Sprint 175 — M0: 검증 PoC** | | | | |
| F384 | CLI `--bare` rate limit/안정성 PoC — subprocess 통합 + 장시간 테스트 (FX-REQ-376, P0) | Sprint 175 | ✅ | PR #304 |
| F385 | 5차원 평가 재현성 검증 — 동일 코드 3회 평가 ±10점 이내 + 인간 평가 상관관계 (FX-REQ-377, P0) | Sprint 175 | ✅ | PR #304 |
| **Sprint 176 — M1: 5차원 스코어링 엔진** | | | | F384, F385 선행 |
| F386 | 5차원 품질 스코어러 구현 — 빌드/UI/기능/PRD반영/코드품질 (FX-REQ-378, P0) | Sprint 176 | ✅ | PR #306 |
| F387 | 베이스라인 측정 + D1 저장 — 5종 프로토타입 점수 측정 + API 조회 (FX-REQ-379, P0) | Sprint 176 | ✅ | PR #306 |
| **Sprint 177 — M2+M3: CLI 통합 + 자동 개선** | | | | F384 선행 |
| F388 | CLI 듀얼 모드 — Claude Max CLI primary + API fallback 자동 전환 (FX-REQ-380, P0) | Sprint 177 | ✅ | PR #308 |
| F389 | Enhanced O-G-D 루프 — 타겟 피드백 + 5라운드 80점 수렴 + 장애 복구 (FX-REQ-381, P0) | Sprint 177 | ✅ | PR #308 |
| **Sprint 178 — M4: 품질 대시보드** | | | | |
| F390 | Builder Quality 대시보드 — 점수 카드 + 레이더 차트 + 개선 추이 (FX-REQ-382, P1) | Sprint 178 | ✅ | PR #311 |
| F391 | 사용자 피드백 루프 — BD팀/고객 수동 평가 + 자동 점수 상관관계 캘리브레이션 (FX-REQ-383, P1) | Sprint 178 | ✅ | PR #311 |

| **Phase 20 — AX BD MSA 재조정 (모놀리스 모듈화 + harness-kit)** | | | | PRD: `docs/specs/ax-bd-msa/prd-final.md`. 착수: Conditional(67점) + Ambiguity 0.095 → 사용자 확정 |
| **Phase 20-A: 모듈화 (Sprint 179~184) — 단일 Workers 내 분리** | | | | |
| **Sprint 179 — M1: 분류 + 아키텍처 결정** | | | | |
| F392 | 전체 라우트/서비스/스키마 서비스별 태깅 + D1 테이블 소유권 태깅 + 크로스 서비스 FK 목록 (FX-REQ-384, P0) | Sprint 179 | ✅ | PR #316. service-mapping.md(594줄) + d1-ownership.md(293줄) + adr-001-d1-shared-db.md |
| F393 | F268~F391 증분 124건 서비스 배정 확정 + MSA 설계서 v4 갱신 (FX-REQ-385, P0) | Sprint 179 | ✅ | PR #316. MSA 설계서 v4 갱신(+117줄) |
| **Sprint 180 — M1: harness-kit 패키지 생성** | | | | |
| F394 | harness-kit 패키지 — Workers scaffold + D1 setup + JWT 미들웨어 + CORS + 이벤트 인터페이스 + CI/CD 템플릿 (FX-REQ-386, P0) | Sprint 180 | ✅ | PR #317. packages/harness-kit/ (42파일, +2278줄) |
| F395 | `harness create` CLI 명령 PoC + ESLint 크로스서비스 접근 금지 룰 (FX-REQ-387, P0) | Sprint 180 | ✅ | PR #317. CLI + no-cross-module-import ESLint 룰 |
| **Sprint 181~184 — M2: 코드 모듈화** | | | | |
| F396 | Auth/SSO 모듈 분리 → `modules/auth/` + Dashboard/KPI/Wiki → `modules/portal/` (FX-REQ-388, P0) | Sprint 181~182 | ✅ | PR #318(auth 29파일) + PR #319(portal 115파일). Match 100% |
| F397 | 검증 → `modules/gate/` + 제품화/GTM → `modules/launch/` + Foundry-X 코어 정리 (FX-REQ-389, P0) | Sprint 183~184 | ✅ | PR #320(gate+launch) + PR #321(core 5도메인). Match 100% |
| **Phase 20-B: 분리 준비 (Sprint 185~188) — 인프라 + 이벤트 + IA 개편** | | | | |
| **Sprint 185~186 — M3: 이벤트 + 프록시 + IA** | | | | |
| F398 | 이벤트 카탈로그 8종 스키마 확정 + EventBus PoC + **Web IA 개편** (`/ax-bd/*` redirect, 사이드바 서비스 경계 그룹, "이관 예정" 라벨, 코어 메뉴 정리) (FX-REQ-390, P1) | Sprint 185 | ✅ | PR #322. events/(catalog+d1-bus+index) + D1 0114 + sidebar.tsx IA 개편 + sidebar-ia.test |
| F399 | Strangler Fig 프록시 레이어 + harness-kit 이벤트 유틸리티 (FX-REQ-391, P1) | Sprint 186 | ✅ | PR #323. D1EventBus + createEvent + Strangler MW + proxy 리팩토링. Match 100% |
| **Sprint 187~188 — M4: 통합 검증 + Production** | | | | |
| F400 | E2E 서비스별 태깅 + IA 변경 E2E 검증 + 전체 회귀 테스트 + Gate-X scaffold PoC (FX-REQ-392, P1) | Sprint 187 | ✅ | PR #324. E2E 48파일 서비스 태그 + Gate-X PoC scaffold. Match 100% |
| F401 | Production 배포 + smoke test + harness-kit 문서화 + 개발자 가이드 (FX-REQ-393, P1) | Sprint 188 | ✅ | Smoke test 7/7 + harness-kit README + developer-guide + migration-guide. Match 100% |
| **Phase 21: Gate-X 독립 서비스 (Sprint 189~) — PRD: `docs/specs/gate-x/prd-final.md`** | | | | |
| **Phase 21-A: 코어 API + 독립 배포 (M1, P0)** | | | | |
| F402 | Gate-X 독립 Workers 프로젝트 scaffold + wrangler.toml + D1 전용 DB 생성 (FX-REQ-394, P0) | Sprint 189 | ✅ | PR #326. packages/gate-x/ scaffold + wrangler.toml + D1 migrations |
| F403 | Gate 모듈 추출 — 7 routes + 7 services + 6 schemas 독립 Workers 이전 (FX-REQ-395, P0) | Sprint 189 | ✅ | PR #326. 39 files, +2,171줄. Gate 모듈 독립 추출 완료 |
| F404 | O-G-D 루프 비동기 아키텍처 — Cloudflare Queues + Durable Objects PoC (FX-REQ-396, P0) | Sprint 190 | ✅ | PR #328. Queue worker + DO OgdCoordinator + 비동기 검증 파이프라인 |
| F405 | JWT 독립 인증 + API Key 발급 + RBAC + CI/CD 파이프라인 (FX-REQ-397, P0) | Sprint 190 | ✅ | PR #328. 21 files, +1,747줄. JWT/API Key/RBAC + gate-x-deploy.yml |
| **Phase 21-B: 이벤트 연동 + Web UI + 다중 모델 (M2, P1)** | | | | |
| F406 | Foundry-X ↔ Gate-X 이벤트 연동 — D1EventBus + 이벤트 유실 복구 메커니즘 (FX-REQ-398, P1) | Sprint 191 | ✅ | PR #329. 13 files, +1,143줄. gate-event-bridge + event-status 라우트 + 복구 메커니즘 |
| F407 | Gate-X Web UI 대시보드 �� 검증 파이프라인 운영 + 리포트 (FX-REQ-399, P1) | Sprint 192 | ✅ | PR #330. 38 files, +3,150줄. Gate-X Web UI 대시보드 + 다중 AI 모델 |
| F408 | 다중 AI 모델 지원 — LLM 추상화 레이어 + 모델별 폴백 전략 (FX-REQ-400, P1) | Sprint 192 | ✅ | PR #330. LLM 추상화 레이어 + 모델별 폴백 전략 |
| **Phase 21-C: 확장 기능 (M3, P1~P2)** | | | | |
| F409 | 커스텀 검증 룰 엔진 — 사용자 정의 루브릭 + 검증 기준 관리 (FX-REQ-401, P1) | Sprint 193 | ✅ | 커스텀 룰 CRUD 6엔드포인트 + JSON DSL 조건 평가 + D1 migration + 24 tests |
| F410 | 외부 웹훅 연동 + 멀티테넌시 격리 — 테넌트별 데이터/API 분리 (FX-REQ-402, P2) | Sprint 194 | ✅ | PR #336. WebhookService + TenantService + D1 migration + tenant 격리 미들웨어 + 342 tests |
| **Phase 21-D: SaaS 기반 (M4, P2)** | | | | |
| F411 | 과금 체계 — API 호출량 추적 + 요금제 (Free/Pro/Enterprise) (FX-REQ-403, P2) | Sprint 195 | ✅ | PR #339. plan-service + usage-tracking-service + billing routes + D1 migration |
| F412 | SDK/CLI 클라이언트 — TypeScript SDK + CLI 도구 + API 문서 (FX-REQ-404, P2) | Sprint 196 | ✅ | @foundry-x/gate-x-sdk. GateXClient 3리소스 15메서드 + CLI 4커맨드 + 30 tests. Match 97% |
| **Phase 21-E: Foundry-X 사전 정리 (M5, P2)** | | | | |
| F413 | Foundry-X 수집 코드 격리 — `core/collection/` 분리 (4 routes + 5 services + 5 schemas) Discovery-X 이관 사전 정리 (FX-REQ-405, P2) | Sprint 197 | ✅ | PR #327. 35 files, +254줄. core/collection/ 모듈 분리 완료. Strangler Fig 사전 작업 |
| **Phase 22: Offering Skill v2 (Sprint 198~) — PRD: `docs/specs/axbd-offering/prd-final.md`** | | | | |
| **Phase 22-A: 표준화 + MVP (M1, P0)** | | | | |
| F414 | 표준 목차 엔진 — 가이드 18섹션 내장 + 필수/선택 자동 판단 (FX-REQ-406, P0) | Sprint 198 | ✅ | 20섹션 목차 + 경영 언어/KT 연계 원칙 내장. Match 100% |
| F415 | 디자인 시스템 v2 — 컬러/타이포/레이아웃/컴포넌트 12종 CSS variable 구현 (FX-REQ-407, P0) | Sprint 198 | ✅ | 5개 신규 컴포넌트 + design-tokens v2. Match 100% |
| F416 | 발굴 산출물 자동 매핑 — 2-0~2-8 단계별 섹션 매핑 테이블 (FX-REQ-408, P0) | Sprint 199 | ✅ | section-mapping.md + 역매핑 + 탐색 키워드. Match 100% |
| F417 | 경영 언어 원칙 적용 — 톤/표현 규칙 스킬 로직 내장 (FX-REQ-409, P0) | Sprint 199 | ✅ | writing-rules.md + KT 3축 + 고객 톤 3종. Match 100% |
| **Phase 22-B: KT 연계 + 교차검증 (M2, P0)** | | | | |
| F418 | KT 연계 원칙 강제 — 추진배경 3축 필수 체크 + KT 미연계 경고 (FX-REQ-410, P0) | Sprint 200 | ✅ | 3축 HARD STOP + SOFT WARN. Match 100% |
| F419 | GAN 교차검증 자동화 — 표준 질문 풀 + 추진론/반대론/판정 자동 생성 (FX-REQ-411, P0) | Sprint 200 | ✅ | cross-validation.md + 종합 판정. Match 100% |
| **Phase 22-C: 확장 기능 (M3, P1)** | | | | |
| F420 | PPTX 변환 — HTML→PPTX 변환 + offering-pptx 스킬 체이닝 (FX-REQ-412, P1) | Sprint 201 | ✅ | Step 9 PPTX 체이닝. Match 100% |
| F421 | 버전 이력 추적 — v0.1→v1.0 변경 이력 + diff 보기 (FX-REQ-413, P1) | Sprint 201 | ✅ | 버전 이력 자동 기록. Match 100% |
| F422 | 피드백 반영 자동화 — 임원 피드백→섹션별 자동 수정 + 변경 마커 (FX-REQ-414, P1) | Sprint 202 | ✅ | Step 5 v2.3 — 6단계 피드백 흐름. Match 100% |
| **Phase 22-D: Prototype Builder v2 (M4, P0) — PRD: `docs/specs/fx-builder-v2/prd-final.md`** | | | | |
| F423 | impeccable 디자인 스킬 통합 — 7도메인 참조문서 + 안티패턴을 Generator 프롬프트에 주입 (FX-REQ-415, P0) | Sprint 203 | ✅ | PR #337. 7 files, +851줄. impeccable 7도메인 참조문서 + Generator/Discriminator 통합 |
| F424 | 디자인 안티패턴 차단 — impeccable 안티패턴 목록을 Discriminator에 추가, 재생성 트리거 (FX-REQ-416, P0) | Sprint 203 | ✅ | PR #337. 안티패턴 체크리스트 + 재생성 트리거. Match 100% |
| F425 | PRD 정합성 LLM 판별 — prd 차원 키워드→LLM 의미 비교 교체 (FX-REQ-417, P0) | Sprint 204 | ✅ | PR #342. +682줄, 6 files. LLM 의미 비교 판별기 |
| F426 | 5차원 LLM 통합 판별 — 체크리스트→LLM 평가 전환 (FX-REQ-418, P0) | Sprint 204 | ✅ | PR #342. 5차원 LLM 통합 판별 + temp=0 structured JSON |
| F427 | Vision API 시각 평가 — 스크린샷 기반 UI 품질 LLM 평가 (FX-REQ-419, P0) | Sprint 205 | ✅ | PR #346. vision-evaluator.ts 374줄 + 테스트 170줄 |
| F428 | max-cli 본격 통합 — WSL CLI→Builder 파이프라인 연결 + API fallback (FX-REQ-420, P0) | Sprint 205 | ✅ | PR #346. cli-runner + fallback 확장 + cost-tracker |
| F429 | max-cli 큐 관리 — 단일 머신 빌드 큐잉 + 순차 실행 + 타임아웃 (FX-REQ-421, P0) | Sprint 206 | ✅ | PR #349. BuildQueue + 순차 실행 + 타임아웃. Match 97% |
| F430 | 디자인 커맨드 파이프라인 — /audit→/normalize→/polish O-G-D 루프 매핑 (FX-REQ-422, P1) | Sprint 206 | ✅ | PR #349. DesignPipeline + impeccable 커맨드 매핑 |
| F431 | 판별 피드백 구체화 — LLM 판별→구체적 수정 지시 변환 + Generator 자동 주입 (FX-REQ-423, P1) | Sprint 207 | ✅ | PR #351. ogd-feedback-converter + Generator/Orchestrator 통합. Match 100% |
| **Phase 23: Sprint Automation v2 (Sprint 208~) — Sprint Pipeline 종단 자동화** | | | | |
| **Phase 23-A: Pipeline E2E 자동화 (M1, P0)** | | | | |
| F432 | Sprint Pipeline 종단 자동화 — Phase 6(Gap Analyze 집계) + Phase 7(Auto Iterator) + Phase 8(Session-End) 추가 (FX-REQ-424, P0) | Sprint 243 | ✅ | `scripts/sprint-pipeline-finalize.sh` + `.claude/skills/sprint-pipeline/` project override. Match 95% |
| F433 | Sprint Monitor 고도화 — Pipeline 전체 Phase(6~8) 진행률 Gist 표시 + Monitor 생존 감시 + 자동 재시작 (FX-REQ-425, P0) | Sprint 243 | ✅ | `scripts/sprint-watch-liveness.sh` + sprint-watch SKILL.md 편집 (실데이터 연동 + finalize 트리거). Match 95% |
| **Phase 24: Discovery Native (Sprint 209~) — PRD: `docs/specs/fx-discovery-native/prd-final.md`** | | | | |
| **Phase 24-A: IA 정리 + 온보딩 (M1, P0)** | | | | |
| F434 | 사이드바 정리 — 2.발굴 + 3.형상화만 남기고 1/4/5/6단계 제거 (FX-REQ-426, P0) | Sprint 209 | ✅ | sidebar.json + 라우트 정리. Admin 메뉴 유지 |
| F435 | 위저드형 온보딩 — 시작하기 페이지에서 사업 아이템 등록 위저드 (FX-REQ-427, P0) | Sprint 209 | ✅ | 프롬프트 입력 또는 자료 업로드. 병렬: F434 |
| **Phase 24-B: 발굴 네이티브 전환 (M2, P0)** | | | | |
| F436 | 아이템 등록 CRUD — 사업 아이템 생성/조회/수정/삭제 (FX-REQ-428, P0) | Sprint 210 | ✅ | 기존 biz_items 또는 새 스키마. Clean Slate |
| F437 | 발굴 분석 대시보드 — 아이템별 11단계 분석 진행 상태 표시 (FX-REQ-429, P0) | Sprint 210 | ✅ | 단계별 카드/타임라인 UI. 병렬: F436 |
| F438 | 발굴 분석 실행 — AI 자동 수행 + 사용자 검토/보완 (FX-REQ-430, P0) | Sprint 211 | ✅ | 11단계 중 MVP 최소 3단계. F436 선행 |
| **Phase 24-C: 아이템 허브 + 형상화 연결 (M3, P0)** | | | | |
| F439 | 아이템 상세 페이지 — 기본정보 + 발굴결과 + 형상화 산출물 통합 (FX-REQ-431, P0) | Sprint 212 | ✅ | 파이프라인 진행 상태 표시. F438 선행 |
| F440 | 사업기획서 생성 — 발굴 분석 완료 후 AI 기반 자동 생성 (FX-REQ-432, P0) | Sprint 212 | ✅ | 발굴 결과 기반. 병렬: F439 |
| **Phase 25: Discovery Pipeline v2 (Sprint 213~) — PRD: `docs/specs/fx-discovery-pipeline-v2/prd-final.md`** | | | | |
| **Phase 25-A: 파일 업로드 + 자료 기반 분석 (M1, P0)** | | | | |
| F44| 파일 업로드 인프라 — R2 Presigned URL + 멀티 파일 업로드 UI + 파일 메타 D1 테이블 (FX-REQ-433, P0) | Sprint 213 | ✅ | R2 버킷 + presigned URL 서명 + 업로드 UI 컴포넌트 |
| F44| 문서 파싱 엔진 — PDF/PPT/DOCX → 텍스트 추출 + 구조화 (FX-REQ-434, P0) | Sprint 213 | ✅ | Workers AI 또는 외부 파싱 API. 병렬: F441 |
| F44| 자료 기반 발굴 입력 — 업로드 문서 파싱→아이템 등록 + 분석 컨텍스트 자동 주입 (FX-REQ-435, P0) | Sprint 214 | ✅ | F441+F442 선행. 온보딩 위저드 확장 |
| **Phase 25-B: 생성 고도화 (M2, P0)** | | | | |
| F44| 사업기획서 편집기 — 섹션별 인라인 편집 + AI 재생성 + 버전 이력 (FX-REQ-436, P0) | Sprint 215 | ✅ | 기존 생성 결과에 편집 레이어 추가. F440 기반 |
| F44| 기획서 템플릿 다양화 — 용도별 3종(내부보고/제안서/IR피치) + 톤/분량 커스텀 (FX-REQ-437, P0) | Sprint 215 | ✅ | 템플릿 선택 UI + 생성 파라미터. 병렬: F444 |
| F44| 내보내기 강화 — 사업기획서 PDF/PPTX 내보내기 + 디자인 토큰 적용 (FX-REQ-438, P0) | Sprint 216 | ✅ | F444 선행. 기존 offering-export 패턴 활용 |
| **Phase 25-C: E2E 흐름 보완 (M3, P1)** | | | | |
| F44| 파이프라인 상태 추적 — 아이템별 온보딩→발굴→형상화→Offering 전체 진행률 시각화 (FX-REQ-439, P1) | Sprint 217 | ✅ | 스테퍼/타임라인 UI + 상태 집계 API |
| F44| 단계 간 자동 전환 — 발굴 완료→형상화/기획서 자동 제안 + 원클릭 진행 (FX-REQ-440, P1) | Sprint 217 | ✅ | 파이프라인 이벤트 + CTA 버튼. 병렬: F447 |
| **Phase 25-D: 운영 품질 (M4, P1)** | | | | |
| F44| 에러/로딩 UX — API 실패 재시도 UI + 스켈레톤 로딩 + 빈 상태 안내 (FX-REQ-441, P1) | Sprint 218 | ✅ | 공통 ErrorBoundary + LoadingSkeleton 컴포넌트 |
| F450 | 반응형 + 접근성 — 모바일 대응 + ARIA 라벨 + 키보드 내비게이션 (FX-REQ-442, P1) | Sprint 218 | ✅ | Discovery 관련 페이지 대상. 병렬: F449 |
| **Phase 26: BD Portfolio Management (Sprint 219~) — 사업 포트폴리오 일괄 관리** | | | | |
| **Phase 26-A: 사업 아이템 일괄 등록 + 문서 연결 (M1, P0)** | | | | |
| F451 | Clean Sheet + 사업 아이템 일괄 등록 — 기존 데이터 초기화 + 4건(KOAMI/XR/IRIS/Deny) biz_items 등록 (FX-REQ-443, P0) | Sprint 219 | ✅ | D1 전체 삭제 + INSERT 4건 + pipeline_stages REGISTERED |
| F452 | 사업기획서/Offering 연결 — HTML 원본 R2 업로드 + D1 메타데이터 등록 + offerings 4건 (FX-REQ-444, P0) | Sprint 219 | ✅ | business_plan_drafts 4건 + offerings 4건 + uploaded_files 9건 |
| F453 | Prototype 역등록 — Deny PoC HTML을 Prototype v1으로 등록 (FX-REQ-445, P0) | Sprint 219 | ✅ | 기존 산출물 역분해 패턴 |
| **Phase 26-B: PRD 생성 파이프라인 (M2, P0)** | | | | |
| F454 | 1차 PRD 자동 생성 — 사업기획서 HTML 파싱 → PRD 자동 생성 (FX-REQ-446, P0) | Sprint 219 | ✅ | 4건 PRD MD 생성 + D1 biz_generated_prds 등록 |
| F455 | 2차 PRD 보강 — AI 자동 보강 (갭분석+유저스토리+비기능요구사항) (FX-REQ-447, P0) | Sprint 219 | ✅ | 4건 v2 생성 + D1 등록 |
| F456 | 최종 PRD 확정 — v1+v2 통합 PDCA 정렬 PRD 생성 + 버전 관리 (FX-REQ-448, P0) | Sprint 219 | ✅ | 4건 final 생성 + D1 version 3 등록 |
| **Phase 26-C: Prototype 생성 + 연결 (M3, P1)** | | | | |
| F457 | Prototype Builder 실행 — KOAMI 신규 + Deny v2 Prototype 자동 생성 (FX-REQ-449, P1) | Sprint 219 | ✅ | KOAMI 6화면 + Deny 3-Panel SOC |
| F458 | Prototype 등록 — R2 업로드 + D1 prototypes 등록 (FX-REQ-450, P1) | Sprint 219 | ✅ | R2 + D1 등록 완료. Deny v1+v2 2건 |
| **Phase 26-D: E2E 검색/편집 인프라 (M4, P1)** | | | | |
| F459 | 포트폴리오 연결 구조 검색 — Portfolio Graph API + 역조회 + 커버리지 (FX-REQ-451, P1) | Sprint 223 | ✅ | Graph API + PortfolioService + 8테이블 병렬조회 (Match 96%) |
| F460 | 포트폴리오 대시보드 — 카드목록 + 연결그래프 + 산출물미리보기 (FX-REQ-452, P1) | Sprint 223 | ✅ | PortfolioView + PipelineProgressBar + PortfolioGraph + 대시보드 카운트 연동 |
| **Phase 27: BD Quality System F461~F470** | | | | PRD: `docs/specs/fx-bd-quality-system/prd-final.md` |
| **Phase 27-A: QSA 에이전트 3종 (M1, P0)** | | | | |
| F461 | Prototype QSA 구현 — 5차원 품질/보안 Discriminator + First Principles Gate + CSS 정적 분석 (FX-REQ-453, P0) | Sprint 226 | ✅ | PrototypeQsaAdapter + 테스트 (PR #380, Match 98%) |
| F462 | Offering QSA 구현 — HTML/PPTX 품질/보안/디자인 판별 + 18섹션 구조 검증 (FX-REQ-454, P0) | Sprint 226 | ✅ | OfferingQsaAdapter + 테스트 (PR #380, Match 98%) |
| F463 | PRD QSA 구현 — PRD 완결성/논리성/실행가능성 판별 + 착수 판단 기준 (FX-REQ-455, P0) | Sprint 225 | ✅ | PrdQsaAdapter + 테스트 (PR #379, Match 100%) |
| **Phase 27-B: 파이프라인 GAP 복구 (M2, P0)** | | | | |
| F464 | Generation–Evaluation 정합성 — impeccable 7도메인 ↔ Discriminator 체���리스트 자동 정렬 (FX-REQ-456, P0) | Sprint 227 | ✅ | prototype-ogd-adapter.ts 수정 |
| F465 | Design Token → Generation 연결 — DesignTokenService 토큰을 prototype-styles.ts에 주입 (FX-REQ-457, P0) | Sprint 227 | ✅ | prototype-styles.ts 확장 |
| F466 | Feedback → Regeneration 루프 — feedback_pending Job의 피드백을 Generator에 전달하여 재생성 (FX-REQ-458, P0) | Sprint 228 | ✅ | triggerRegeneration + 피드백→OGD 루프 (PR #381, Match 96%) |
| F467 | Quality 데이터 통합 — ogd_rounds → prototype_quality 자동 적재 + 5차원 분해 (FX-REQ-459, P0) | Sprint 228 | ✅ | fromOgdResult + 자동 INSERT (PR #381, Match 96%) |
| **Phase 27-C: BD Sentinel 통합 (M3, P0)** | | | | |
| F468 | BD Sentinel 구현 — 7+ Sector 자율 감시 메타 오케스트레이터 + DDPEV 사이클 (FX-REQ-460, P0) | Sprint 229 | ✅ | bd-sentinel.md + SentinelAuditService (PR #382, Match 100%) |
| **Phase 27-D: 디자인 고도화 (P1)** | | | | |
| F469 | CSS Anti-Pattern Guard — 생성 시점 AI 기본 폰트/순수 흑백/비배수 spacing 사전 차단 (FX-REQ-461, P1) | Sprint 230 | ✅ | styleseed+impeccable 원칙 적용 |
| F470 | HITL Review → Action 연결 — revision_requested 리뷰가 피드백→재생성 자동 트리거 (FX-REQ-462, P1) | Sprint 230 | ✅ | review-service → feedback-service 연결 |
| **Phase 27.5: QSA PoC F471~F474** | | | | PRD: `docs/specs/fx-qsa-poc/prd-final.md` |
| F471 | QSA 실행 — KOAMI/Deny 2건 5차원 품질 측정 (FX-REQ-463, P0) | Sprint 232 | ✅ | KOAMI 96.3%→100%, Deny 85.0%→96.3% PASS |
| F472 | CSS Guard 적용 — 2건 guardCss() + CSS 변수 폰트 교체 (FX-REQ-464, P0) | Sprint 232 | ✅ | 안티패턴 3건→0건 |
| F473 | QSA 재평가 — 대시보드 Rubric 분기 + 전후 비교 (FX-REQ-465, P0) | Sprint 232 | ✅ | detectPrototypeType() + 8/8 테스트 |
| F474 | DesignToken→Generator 연결 + 산업별 프리셋 5종 (FX-REQ-466, P0) | Sprint 232 | ✅ | flattenTokens + findPreset (5산업) + 11/11 테스트 |
| **독립 트랙: 운영 개선** | | | | |
| F475 | Marker.io 피드백 파이프라인 점검 — [Marker.io] 제목 패턴 자동 감지 + Issue 코멘트 자동 알림 (FX-REQ-467, P1) | — | ✅ | webhook 패턴 감지 + PATCH 코멘트 자동화 + GitHub Project 등록 |
| F476 | 피드백 관리 대시보드 — Admin 메뉴에 feedback_queue 현황 + 상태 관리 UI (FX-REQ-468, P2) | — | ✅ | feedback-dashboard.tsx + E2E 8건 |
| F477 | 피드백 Agent 자동 PR 생성 — feedback-consumer Agent PR 실패 원인 해소 (FX-REQ-469, P2) | — | ✅ | consumer.sh 전면 재작성 + 3단계 fallback + retry |
| **Phase 28: Discovery 동기화 파이프라인 F478~F483** | | | | Plan: `docs/01-plan/features/discovery-item-detail-review.plan.md` |
| F478 | STATUS_CONFIG 매핑 보완 — biz_items.status 전체 상태(classifying/classified/evaluating/evaluated) UI 매핑 (FX-REQ-470, P0) | Sprint 233 | ✅ | PR #388, Match 100% |
| F479 | 분석 완료 → pipeline/discovery_stages 자동 전환 — evaluate 완료 시 REGISTERED→DISCOVERY + discovery_stages 동기화 (FX-REQ-471, P0) | Sprint 233 | ✅ | PR #388, Match 100% |
| F480 | AnalysisStepper → Discovery Stage 전체 스텝퍼 리뉴얼 — 3단계 자동→11단계 HITL 스텝퍼, v82 유형별 강도 반영 (FX-REQ-472, P1) | Sprint 234 | ✅ | PR #389, Match 91% |
| F481 | 평가결과서 HTML 자동 생성 스킬 — PRD-final 파싱→발굴단계완료 HTML 9탭 포맷 자동 변환, CLAUDE_AXBD 스킬로 통합 (FX-REQ-473, P0) | Sprint 235 | ✅ | PR #391, Match 100%, generate-evaluation-report 커맨드 + 템플릿 |
| F482 | bd_artifacts 자동 등록 파이프라인 — Claude Code 스킬 분석 완료 시 API 호출로 bd_artifacts + discovery_stages 자동 동기화 (FX-REQ-474, P0) | Sprint 235 | ✅ | PR #391, Match 100%, sync-artifacts API + 8 tests |
| F483 | 웹 평가결과서 뷰어 — Discovery 상세 페이지에 발굴단계완료 HTML 평가결과서 조회/공유 기능 (FX-REQ-475, P1) | Sprint 236 | ✅ | PR #393, Match 100%, EvaluationReportViewer + HTML API + 18 tests |
| **Phase 28-B: Discovery Detail UX v2 F484~F487** | | | | Plan: `docs/01-plan/features/discovery-detail-ux-v2.plan.md` |
| F484 | 파이프라인 진행률 UI 개선 — 현재 단계 강조 + 상태 라벨 + pulse 애니메이션 (FX-REQ-476, P1) | Sprint 237 | ✅ | PR #390, Match 100%, PipelineProgressStepper 리디자인 |
| F485 | 발굴 분석 결과 표시 + HITL 피드백 루프 — 완료 단계 결과 펼쳐보기 + 피드백 반영 재실행 (FX-REQ-477, P1) | Sprint 238 | ✅ | PR #392, Match 100%, DiscoveryStageStepper 결과뷰 + 재실행 |
| F486 | 9기준 체크리스트 UX 정리 — 역할/가이드 명확화, AI 자동 평가 연동 (FX-REQ-478, P2) | Sprint 238 | ✅ | PR #392, Match 100%, DiscoveryCriteriaPanel UX 개선 |
| F487 | 발굴 리포트 500 에러 수정 — ax_discovery_reports item_id/biz_item_id 컬럼 불일치 해소 (FX-REQ-479, P0) | Sprint 237 | ✅ | PR #390, Match 100%, team-reviews.ts SQL 컬럼 정정 |
| **Phase 29: 요구사항 거버넌스 자동화 F488~F489** | | | | drift 근본 원인 치료 — `--create-issue` 기본화(β) + 구조적 공백/실시간 drift 분리 리포트 + 회고 통합 소급 등록 루틴 |
| F488 | `/ax:req-manage new` `--create-issue` 기본화 (β: 스마트) + req-integrity 2카테고리 리포트 — gh/token 존재 시 자동 Issue 생성, 부재 시 `/tmp/req-issue-skip.log` 경고 기록. req-integrity는 *구조적 공백*(F100+ 미등록)과 *실시간 drift*(상태 불일치) 분리 집계 (FX-REQ-480, P0) | Sprint 240 | ✅ | PR #405, Match 100%, ax-marketplace 2개 스킬 수정, `--no-issue` opt-out |
| F489 | `/ax:gov-retro` 회고 통합 소급 등록 루틴 — Phase 완료 시 해당 Phase의 미등록 F-items 일괄 GitHub Issue 등록. Phase 27→26 역순 선별 전략, Issues 인플레이션 통제 (FX-REQ-481, P2) | — | ✅ | Issue #407 (F488 dogfood로 첫 생성), gov-retro Step 7 추가, ax-marketplace `72165f8` |
| F490 | E2E workflow shard 병렬화 — `.github/workflows/e2e.yml` Playwright shard matrix(3~4) + `timeout-minutes` 상향(15→30). PR #394에서 동일 runner 2회 연속 15m17s timeout 관측, 테스트 suite 증가로 단일 job 한계 초과 (FX-REQ-482, P2) | — | ✅ | TD-03 승격. F498/Task로 구현, PR #432 merged (2026-04-10) |
| F491 | 테스트 공유 Org 모드 — `DEFAULT_SHARED_ORG_ID` env var 도입으로 signup/google/setup-password 3 flow에서 개인 Org 자동 생성 대신 지정된 공유 Org(`org_452b33c1` = AX 컨설팅팀)에 멤버십 부여. env 미설정 시 기존 개인 Org 동작 유지(폴백), null-return 헬퍼 패턴. 기존 Google 유저도 첫 재로그인 시 공유 Org에 멱등 backfill. **2026-04-09 End-to-end 검증 완료** — sinclair.seo@ideaonaction.ai Google OAuth 가입 → 공유 Org member 합류 + biz_items 3개 노출 확인. 팀원 @gmail 5명 프로액티브 backfill + Org 이름 "AX BD's Org"→"AX 컨설팅팀" rename + D1 유저명 3건 정정(김기록→김기욱/김경민→김경림/천대영→현대영) 병행. Org 생성/전환 기능(`OrgSwitcher`, `POST /orgs`, `POST /auth/switch-org`)은 그대로 작동 — F491은 기본 착륙점만 고정 (FX-REQ-483, P3) | — | ✅ | 독립 트랙. PR #410 merged. `packages/api/src/modules/auth/services/shared-org.ts` 헬퍼, `wrangler.toml [vars]+[env.staging.vars]`, 테스트 4건(auth-shared-org.test.ts), 기존 auth 30 tests 회귀 없음. 롤백 절차: `project_f491_shared_org.md` |
| F492 | FileUploadZone API 경로 drift 수정 — BASE_URL 통일 (Pages 오리진 405 해소). `packages/web/src/components/feature/FileUploadZone.tsx`가 `apiBaseUrl=""` 기본값으로 `${apiBaseUrl}/api/files/presign` 상대경로 호출 → Pages(`fx.minu.best`) 오리진에서 405 Method Not Allowed 반환, 파일 업로드 파이프라인(F441~F443) 전체 무력화. 실제 실패 케이스: `AI 시대 생산성 향상 가이드.pdf` (2026-04-09 세션 #244 사용자 DEBUG 제보). 수정: `BASE_URL`을 `api-client.ts`에서 직접 import, 경로에서 `/api` 제거, `apiBaseUrl` prop 완전 제거(FileUploadZone + AttachedFilesPanel). E2E 시나리오 4종(PDF/PPTX/DOCX 성공 + PNG 거부) 추가로 회귀 방지 (FX-REQ-484, P1) | Sprint 241 | ✅ | PR #415 merged, Match 100%, 3436 tests pass. FileUploadZone+AttachedFilesPanel apiBaseUrl prop 제거, BASE_URL import, E2E 4종 추가. 배포 완료 |
