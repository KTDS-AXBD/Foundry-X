# Changelog

All notable changes to the Foundry-X project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

### 세션 #69 (2026-03-21)
**Sprint 27: Phase 3-B 기술 기반 완성 — KPI 인프라 + Reconciliation + Hook 자동수정 (Match Rate 94%)**:
- ✅ F100 KPI 측정 인프라: KpiLogger 서비스 5 메서드 + 4 endpoints (track/summary/trends/events) + Analytics 대시보드 페이지
- ✅ F99 Git↔D1 Reconciliation: ReconciliationService + Cron Trigger 6h + 3 endpoints (run/status/history) + scheduled handler
- ✅ F101 Hook 자동수정: AutoFixService (max 2회 재시도 + 50줄 diff 제한) + AgentInbox escalation + AgentOrchestrator 통합
- ✅ D1 migration 0018: kpi_events + reconciliation_runs 테이블 + agent_tasks 컬럼 3개
- ✅ Agent Teams 2-Worker 병렬: W1(F100 KPI) 2m + W2(F99+F101) 2m30s, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan(FX-PLAN-028) → Design(FX-DSGN-028) → Do → Check(94%) → Report(FX-RPRT-028)
- ✅ PRD v5 MVP 기준 5/6 해소 (KPI K7/K8 + G1 Reconciliation + G7 AutoFix)

**신규 산출물**:
- 신규 파일: 11개 (kpi-logger.ts, kpi schema/route, reconciliation service/schema/route, auto-fix.ts, scheduled.ts, migration 0018, analytics/page.tsx)
- 수정 파일: 6개 (agent-orchestrator.ts, sse-manager.ts, index.ts, app.ts, sidebar.tsx, api-client.ts)
- 신규 API endpoints: 7개 (KPI 4 + Reconciliation 3), 총 104개

**검증 결과**:
- ✅ API 535/535 pass
- ✅ typecheck API + Web 0 errors
- ✅ Workers Cron Trigger 설정 완료

---

### 세션 #68 (2026-03-21)
**Sprint 26: Phase 4 통합 — 프론트엔드 + SSO + API BFF + D1 스키마 (Match Rate 94%)**:
- ✅ F108 SSO 인증 통합: JWT Hub Token (services[] 클레임) + org_services 테이블 + 4 endpoints (token, verify, services GET/PUT)
- ✅ F109 API BFF 프록시: Service Bindings 설정 + /api/dx/*, /api/aif/* 프록시 라우트 + Hub Token 검증 미들웨어
- ✅ F106 프론트엔드 통합: ServiceContainer iframe + postMessage SSO 토큰 전달 + discovery/, foundry/ 서브 라우트 + Sidebar 서비스 네비게이션
- ✅ F111 D1 스키마 통합: service_entities + entity_links 메타데이터 테이블 + EntityRegistry + EntitySyncService + 5 entities API endpoints
- ✅ D1 migration 0017: 3 테이블 (org_services, service_entities, entity_links) + 인덱스 4개
- ✅ Agent Teams 2-Worker 병렬 실행: W1(SSO+BFF) 2m45s + W2(Frontend+Data) 2m15s, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan(FX-PLAN-027) → Design(FX-DSGN-027) → Do → Check(94%) → Report(FX-RPRT-027)
- ✅ 무 반복 첫 통과: 5개 partial item (all Low-Medium priority, scope 관리 성공)

**신규 산출물**:
- 신규 파일: 14개 (sso.ts, sso-routes.ts, service-proxy.ts, proxy-routes.ts, ServiceContainer.tsx, discovery/page, foundry/page, entity-registry.ts, entity-sync.ts, entities-routes.ts + 3 schemas)
- 수정 파일: 9개 (auth.ts, env.ts, app.ts, wrangler.toml, sidebar.tsx, api-client.ts + 테스트 헬퍼)
- 신규 API endpoints: 11개 (SSO 4 + BFF 2 + Entities 5)

**검증 결과**:
- ✅ API 535/535 pass (신규 +11 endpoints)
- ✅ Web 48/48 pass (신규 +3 E2E: service-integration.spec.ts)
- ✅ typecheck 5/5 clean / Lint 0 warnings
- ✅ D1 migration 0017 remote 적용 완료 (총 30 테이블)

---

### 세션 #67 (2026-03-20)
**Sprint 25: 기술 스택 점검 + AXIS DS UI 전환 (Match Rate 97%)**:
- ✅ F98 기술 스택 감사: 3개 서비스 호환성 매트릭스 + Kill 조건 Go 판정 (Cloudflare 완전 호환)
- ✅ F104 AXIS DS 전환: @axis-ds/ui-react 11 컴포넌트 + 테마 시스템 + 토큰 표준화 + @base-ui/react 제거
- ✅ 의존성 최적화: @base-ui/react, next-themes 제거 (-2) + @axis-ds/* 추가 (+3)
- ✅ PDCA: Plan(FX-PLAN-026) → Design → Do(1m30s) → Check(97%) → Report(FX-RPRT-026)
- ✅ Agent Teams 2-Worker: CSS/테마 + 컴포넌트 병렬, File Guard 0 이탈

**검증 결과**:
- ✅ API 535/535, Web 48/48, typecheck 5/5 clean
- ✅ v2.0.0 workers 배포 완료

---

### 세션 #57 (2026-03-19)
**F93 GitHub 양방향 동기화 고도화 — Sprint 21 PDCA 전주기 완료 (Match Rate 93%)**:
- ✅ Issue→Task 자동 생성: `foundry-x` 라벨 옵트인 + 라벨→taskType/agent 자동 매핑
- ✅ 외부 PR AI 리뷰 API: POST/GET /github/pr/:prNumber/review (5분 쿨다운)
- ✅ PR 코멘트 인터랙션: @foundry-x review/status/approve/help
- ✅ 리뷰 결과 자동 포스팅: GitHub Review + score 기반 라벨링 (sdd/quality/security)
- ✅ Webhook org 라우팅: org별 webhook secret 매핑 + 글로벌 폴백
- ✅ Agent Teams 병렬 구현: Worker 2명, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan → Design → Do → Check(93%) → Report

**검증 결과**:
- ✅ 435/435 테스트 (신규 +69건), typecheck 5/5, 신규 5파일 + 수정 6파일

### 세션 #56 (2026-03-19)
**Sprint 20: F92 멀티테넌시 고도화 — PDCA 전주기 완료 (Match Rate 90%)**:
- ✅ Org CRUD API 12 endpoints (POST/GET/PATCH /orgs, members CRUD, invitations, switch-org, accept)
- ✅ roleGuard 미들웨어 + OrgService (CRUD + 멤버 + 초대/수락 플로우)
- ✅ D1 migration 0013: org_invitations 테이블 + 인덱스 3개
- ✅ Web UI: OrgSwitcher 드롭다운 + Org 설정 + 멤버 관리 페이지 + api-client 12 함수
- ✅ Shared types: Organization, OrgMember, OrgInvitation, OrgRole, ORG_ROLE_HIERARCHY
- ✅ 테스트: API 399 (기존 366 + 신규 33) + Web 48 (기존 45 + 신규 3) = 447 tests
- ✅ Typecheck: 5/5 패키지 clean
- ✅ D1 0013 remote 적용 완료
- ✅ PDCA: Plan(FX-PLAN-023) → Design(FX-DSGN-021) → Do → Check(68%→90%) → Report(FX-RPRT-022)

**검증 결과**:
- ✅ typecheck 5/5 / API 399 pass / Web 48 pass

---

### 세션 #53 (2026-03-19)
**ax 스킬 카테고리 리네임 + ax-req-integrity 신규 스킬**:
- ✅ ax 스킬 16개 번호체계→카테고리체계 리네임 (ax-session-*, ax-req-*, ax-code-*, ax-git-*, ax-gov-*, ax-infra-*)
- ✅ ax-req-integrity 신규 — SPEC↔GitHub↔ExPlan 3-way 정합성 검증 (check/fix/report)
- ✅ F91 GitHub Issue #98 생성 + Org Project 등록
- ✅ SPEC §2 인프라 수치 추가 (endpoints 61, services 29, D1 24, Workers/Pages)
- ✅ MEMORY.md Workers v1.5.0→v1.6.0 + API tests 313→366 보정
- ✅ ax-config push: 30 files → Sinclair-Seo/ax-config.git

---

## v1.6.0 릴리스 (2026-03-19)
**Sprint 18: 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동**
- ✅ F83: organizations + org_members 테이블 + tenantGuard 미들웨어 + JWT orgId 확장 (D1 migration 0011~0012)
- ✅ F84: GitHubSyncService — Issues/PR 양방향 동기화 + webhook 확장 + 17 tests
- ✅ F85: SlackService — Block Kit 알림 + /foundry-x 슬래시 커맨드 + SSE→Slack 브릿지 + 12 tests
- ✅ F86: D1 0001~0012 remote 전부 적용 + Workers v1.6.0 배포 완료
- ✅ PDCA 전주기 완료 (Match Rate 93%, FX-RPRT-020)
- ✅ 342 API tests 통과, typecheck 5/5
- ✅ SPEC 소급 등록 — squash merge(#89) 유실 복구, SPEC v4.7

---

## v1.5.0 릴리스 (2026-03-19)
**Sprint 17: AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합**
- ✅ F80: McpRegistry.createServerPreset() AI Foundry 프리셋 + ProposedStep.externalTool 타입
- ✅ F81: inbox 스레드 라우트 GET /:parentMessageId/thread + AgentInboxPanel 스레드 UI (groupByThread + flat/threaded 토글)
- ✅ F82: createPlanAndWait() 폴링 승인 대기 + executePlan() executing→completed/failed 라이프사이클
- ✅ F82: PlanTimeoutError/PlanRejectedError/PlanCancelledError 에러 클래스
- ✅ F82: SSEEvent 4종 (waiting/executing/completed/failed) + Plan API 2 endpoints (get/execute)
- ✅ F82: D1 migration 0010 (agent_plans execution_* 5컬럼)
- ✅ PDCA 전주기 완료 (Match Rate 98%, FX-RPRT-019)
- ✅ 313 API tests 통과, typecheck 5/5

---

## v1.4.0 릴리스 (2026-03-18)
**Sprint 16: PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포**
- ✅ F75: PlannerAgent Mock→Claude API 전환 — analyzeCodebase() + 3단계 폴백 + 6 신규 테스트
- ✅ F76: AgentInboxPanel.tsx 신규 161 LOC + AgentPlanCard shared import + api-client 6함수 + Plans/Inbox 탭
- ✅ F77: D1 migration 0009 remote 확인 (22 테이블) + CI/CD deploy 성공 + v1.4.0 bump
- ✅ Agent Teams 병렬 실행 (W1: F75 backend, W2: F76 frontend)
- ✅ PDCA 전주기 완료 (Match Rate 91%, FX-RPRT-018)
- ✅ 313 API tests 통과, typecheck 5/5

---

## v1.3.0 릴리스 (2026-03-18)
**Sprint 15: PlannerAgent + AgentInbox + WorktreeManager**
- ✅ D1 migration 0009 remote 적용 (agent_plans + agent_messages + agent_worktrees)
- ✅ Workers 재배포 (v1.3.0 코드, 57 endpoints)
- ✅ Pages 재배포 (fx.minu.best)
- ✅ version bump 1.2.0 → 1.3.0 (5 packages)
- ✅ SPEC system-version 1.3.0 + F69 DONE
- ✅ git tag v1.3.0

---

## 세션 42 (2026-03-18)
**Sprint 15 PDCA 전주기 — F70 PlannerAgent + F71 Agent Inbox + F72 git worktree (v1.3.0, Match Rate 92%)**:
- ✅ SPEC 보정: Sprint 14 §6 체크박스 + v1.2.0 마일스톤 + frontmatter 동기화
- ✅ FX-PLAN-016: Sprint 15 Plan 작성 (F70~F73 4개 F-item)
- ✅ FX-DSGN-016: Sprint 15 Design 작성 (서비스 설계 + API + 테스트 계획)
- ✅ shared/agent.ts: +6 타입 (AgentPlan, AgentMessage, WorktreeInfo + SSE 데이터)
- ✅ D1 migration 0009: agent_plans + agent_messages + agent_worktrees 3 테이블
- ✅ planner-agent.ts: PlannerAgent 서비스 6 메서드 + 상태 머신 7 상태
- ✅ agent-inbox.ts: AgentInbox 4 메서드 + inbox route 3 endpoints
- ✅ worktree-manager.ts: gitExecutor DI + D1 영속 + async 확장
- ✅ agent-orchestrator.ts: +5 메서드 (setPlannerAgent, createPlanAndWait, executePlan, setWorktreeManager, executeTaskIsolated)
- ✅ sse-manager.ts: +4 SSE 이벤트 (plan.created/approved/rejected, message.received)
- ✅ Agent Teams 시도 (W1+W2) → API overloaded → Leader 직접 구현
- ✅ Gap Analysis: 82% → Act 1회 → 92%
- ✅ FX-RPRT-017: Sprint 15 완료 보고서

**검증 결과**:
- ✅ typecheck 0 errors / API 307 tests pass / +29 신규 테스트

---

## 세션 41 (2026-03-18)
**F73 제품 포지셔닝 재점검 — 기존 서비스 연동 계획 + 정체성 재정립 (P0, DONE)**:
- ✅ F73 등록: /ax-10-req new → SPEC.md + GitHub Issue #63 + Project 동기화
- ✅ Discovery-X / AXIS Design System / AI Foundry 3개 리포 GitHub API 분석
- ✅ FX-RESEARCH-014 검토 반영 (open-swe + ClawTeam 패턴)
- ✅ Sprint 15 Plan (FX-PLAN-016) §5 F73 전용 섹션 추가 — 서비스 프로파일, 관계 모델, 연동 경로 3건(C1/C2/C3), 정체성 재정립
- ✅ 제품 정체성 재정립: "소프트웨어 팀의 AI 에이전트 통제 레이어"
- ✅ F73 DONE 전환: SPEC.md ✅ + Issue #63 closed + Project Done
- ✅ SPEC v3.5: F73 등록 + Execution Plan 체크박스 3건 완료

**검증 결과**: CLAUDE.md currency ✅, Migration drift ⏭️ (D1 미사용)

---

## 세션 39 (2026-03-18)
**F69 v1.2.0 릴리스 + Phase 3 기반 문서**:
- ✅ CHANGELOG [1.2.0] 릴리스 섹션 작성 (F67 MCP Resources + F68 Merge Queue + F69 릴리스)
- ✅ Version bump: cli 1.0.0→1.2.0, api/web/shared 1.1.0→1.2.0
- ✅ multitenancy.design.md (FX-DSGN-016) — Phase 3 멀티테넌시 설계 (W1 Agent)
- ✅ phase-3-roadmap.md (FX-PLAN-016) — Phase 3 로드맵 Sprint 15~20 (W2 Agent)
- ✅ SPEC v3.3: §3 v1.2.0✅ + §5 F69✅ + §6 Sprint 14 체크박스 전체 보정
- ✅ git tag v1.2.0 (annotated)
- ✅ Agent Teams: W1(멀티테넌시설계) + W2(Phase3로드맵) 병렬 (파일 충돌 0, 범위 이탈 2건 정리)

**검증 결과**: CLAUDE.md currency ✅, Migration drift ✅

---

## [1.2.0] - 2026-03-18

### Summary
**Sprint 14 완료** — MCP Resources 리소스 발견·읽기·구독(F67, 92%) + 멀티 에이전트 동시 PR Merge Queue(F68, 92.5%) + v1.2.0 릴리스(F69). Overall Match Rate 92%. Agent Teams 병렬 구현 (W1 MCP Resources, W2 Merge Queue, 파일 충돌 0). 전체 429 tests (API 278 + CLI 106 + Web 45) + 20 E2E. 50 endpoints + 15 D1 tables + 19 services.

### Added
- **F67 MCP Resources + Notifications** (Match Rate 92%)
  - McpResourcesClient — listResources, readResource, subscribeResource, unsubscribeResource, listResourceTemplates
  - McpRunner 확장 — listResources 실제 구현 + readResource + listResourceTemplates + onNotification
  - McpTransport — SseTransport notification 분기 처리
  - MCP API 4 endpoints: GET /mcp/servers/:id/resources, GET /mcp/servers/:id/resources/templates, POST /mcp/servers/:id/resources/read, POST /mcp/servers/:id/resources/subscribe
  - McpResourcesPanel.tsx + ResourceViewer.tsx — Resources 브라우저 UI
  - SSE mcp.resource.updated 이벤트 추가
  - shared/agent.ts: McpResource, McpResourceTemplate, McpResourceContent, McpResourceSubscription 타입
  - 테스트 15건: mcp-resources 8 + mcp-runner 4 + mcp-routes-resources 3

- **F68 멀티 에이전트 동시 PR + 충돌 해결** (Match Rate 92.5%)
  - MergeQueueService — enqueue, detectConflicts, calculateMergeOrder, processNext, getQueueStatus, updatePriority
  - AgentOrchestrator 확장 — executeParallel + executeParallelWithPr (Promise.allSettled 병렬 실행)
  - GitHubService 확장 — getModifiedFiles, updateBranch (rebase), getPrStatuses 3 메서드
  - Agent API 5 endpoints: POST /agents/parallel, GET /agents/parallel/:id, GET /agents/queue, PATCH /agents/queue/:id/priority, POST /agents/queue/process
  - D1 migration 0008: merge_queue + parallel_executions 테이블
  - MergeQueuePanel.tsx + ConflictDiagram.tsx + ParallelExecutionForm.tsx — Merge Queue UI
  - SSE agent.queue.* 4 이벤트 (updated, conflict, merged, rebase)
  - shared/agent.ts: MergeQueueEntry, ConflictReport, ConflictPair, ParallelExecution, ParallelExecutionResult, ParallelPrResult, SSE 이벤트 타입
  - 테스트 25건: merge-queue 10 + orchestrator-parallel 6 + github-extended 4 + routes-queue 5

- **F69 v1.2.0 릴리스 + Phase 3 기반**
  - multitenancy.design.md — Phase 3 멀티테넌시 설계 (FX-DSGN-016)
  - phase-3-roadmap.md — Phase 3 로드맵 Sprint 15~20 (FX-PLAN-016)
  - CHANGELOG v1.2.0 + version bump (1.1.0 → 1.2.0)
  - SPEC v3.3 갱신 (Sprint 14 Execution Plan 보정 + F69 완료)

### Changed
- McpRunner: listResources() 스텁 → 실제 구현 + readResource + subscribeResource + onNotification
- McpTransport (SseTransport): notification 메시지 분기 처리
- AgentOrchestrator: setMergeQueue() + executeParallel() + executeParallelWithPr()
- GitHubService: 3 메서드 추가 (기존 읽기/쓰기 → merge queue 지원)
- SSEManager: 5 신규 이벤트 (mcp.resource.updated + agent.queue.* 4종)

### Technical Details
- MCP Resources: notification 기반 자동 갱신, mimeType 기반 렌더링 (JSON/text/image/binary)
- Merge Queue: greedy merge order 알고리즘 (충돌 없는 PR 우선 → priority → 생성 시간)
- Parallel Execution: Promise.allSettled 기반 (일부 실패 시 나머지 유지)
- Rebase 전략: GitHub updateBranch API (server-side rebase) 시도 → 실패 시 conflict 상태

### PDCA Documents
- FX-PLAN-015: Sprint 14 F67/F68/F69 Plan
- FX-DSGN-015: Sprint 14 상세 설계 (MCP Resources + Merge Queue + Phase 3)
- FX-ANLS-014: Sprint 14 Gap Analysis (F67 92%, F68 92.5%, Overall 92%)
- FX-RPRT-016: Sprint 14 Completion Report
- FX-DSGN-016: Phase 3 멀티테넌시 설계 (Draft)
- FX-PLAN-016: Phase 3 로드맵 (Draft)

---

## 세션 38 (2026-03-18)
**Sprint 14 PDCA 완료 — MCP Resources + 멀티 에이전트 동시 PR (v1.2.0)**:
- ✅ F67 MCP Resources (92%): McpResourcesClient + McpRunner resources 실 구현 + notification 수신 + 4 API endpoints + Resources 브라우저 + 15 tests
- ✅ F68 멀티 에이전트 동시 PR (92.5%): MergeQueueService + executeParallel + 파일 충돌 감지 + rebase 자동 시도 + 5 API endpoints + Queue/Conflict/Parallel UI + SSE 실시간 + 25 tests
- ✅ Agent Teams: Do(W1 MCP + W2 Queue) + Check(W1 F67 Gap + W2 F68 Gap) 4회 병렬 (충돌 0)
- ✅ 429 total tests (API 278 + CLI 106 + Web 45), +41 from Sprint 13
- ✅ 50 API endpoints (+9), 15 D1 tables (+2), 13 SSE events (+5), 23 Web components (+5)
- ✅ PDCA Match Rate 92%, Iteration 1회 (Must Fix 3건: agents/page 탭 + SSE 연동 + autoResolvable)

**검증 결과**: typecheck ✅ 5/5, tests 429/429 ✅

---

## 세션 37 (2026-03-18)
**Sprint 13 PDCA 완료 — MCP Sampling/Prompts + 에이전트 자동 PR**:
- ✅ F64 MCP Sampling/Prompts (91%): McpSamplingHandler + McpPromptsClient + 4 API endpoints + McpPromptsPanel + 15 tests
- ✅ F65 에이전트 자동 PR (93%): PrPipelineService + ReviewerAgent + GitHubService 확장 + 7-gate auto-merge + 4 API endpoints + 37 tests
- ✅ Agent Teams W1/W2 병렬 구현 (파일 충돌 0)
- ✅ 388 total tests (API 237 + CLI 106 + Web 45), +34 from Sprint 12
- ✅ 41 API endpoints (v0.12.0 33 + Sprint 13 8)
- ✅ 13 D1 테이블 (v0.12.0 11 + 0007 migration: mcp_sampling_log + agent_prs)
- ✅ PDCA Report FX-RPRT-015 (Match Rate 93%)

---

## 세션 36 (2026-03-18)
**CLAUDE.md 품질 개선 + Sprint 13 계획 커밋**:
- ✅ CLAUDE.md improver: 파일 카운트 수정, Sprint 이력 압축(35줄→8줄), API/Web/E2E 명령 추가, PostgreSQL→D1 수정
- ✅ Sprint 13 미커밋 반영: SPEC v3.0, F64~F66 타입 정의, Plan/Design 문서
- ✅ ax-13-selfcheck 8/8 PASS

---

## [1.1.0] - 2026-03-18

### Summary
**Sprint 13 완료** — MCP Sampling/Prompts 양방향 통합(F64, 91%) + 에이전트 자동 PR 파이프라인(F65, 93%) + v1.1.0 릴리스. Overall Match Rate 93%. Agent Teams 병렬 구현 (W1 MCP, W2 PR, 파일 충돌 0). 전체 388 tests (API 237 + CLI 106 + Web 45) + 22 E2E. 41 endpoints + 13 D1 tables.

### Added
- **F64 MCP Sampling + Prompts** (Match Rate 91%)
  - McpSamplingHandler — sampling/createMessage 처리 + 보안 게이트(모델 화이트리스트, 토큰 한도, rate limit)
  - McpPromptsClient — prompts/list + prompts/get (McpRunner 확장)
  - MCP API 4 endpoints: GET/POST /mcp/servers/:id/prompts, POST /mcp/servers/:id/sampling, GET /mcp/sampling/log
  - McpPromptsPanel.tsx — 프롬프트 브라우저 UI
  - D1 mcp_sampling_log 테이블 (서버별 Sampling 이력)
  - shared/agent.ts: McpPrompt, McpPromptArgument, McpSamplingMessage, McpSamplingLog 타입
  - 테스트 15건: mcp-sampling 6 + mcp-prompts 5 + mcp-routes-prompts 4

- **F65 에이전트 자동 PR 파이프라인** (Match Rate 93%)
  - PrPipelineService — 8-step 오케스트레이션 (record → branch → commit → PR → check → review → merge 판정)
  - ReviewerAgent — LLM 기반 PR diff 분석 + SDD/Quality/Security 점수 계산
  - GitHubService 확장 — 8 메서드 (createBranch, createCommitWithFiles, createPR, getPrDiff, mergePR, createPrReview, getCheckRuns, deleteBranch)
  - Auto-merge 7-gate: CI + SDD≥80 + Quality≥70 + Security=0(critical/high) + Daily Limit + Human Approval(선택) + autoMerge flag
  - Agent PR API 4 endpoints: POST /agents/pr, GET /agents/pr/:id, POST /agents/pr/:id/review, POST /agents/pr/:id/merge
  - AgentPrCard.tsx + PrReviewPanel.tsx + AutoMergeSettings.tsx
  - SSE 4 이벤트: agent.pr.created, reviewed, merged, review_needed
  - D1 agent_prs 테이블 (에이전트 PR 추적)
  - shared/agent.ts: AgentPr, PrReviewResult, PrReviewComment, PrPipelineConfig, SSE event types
  - 테스트 37건: pr-pipeline 8 + reviewer-agent 6 + github-pr 4 + routes 6 (추가)

- **F66 v1.1.0 릴리스 준비**
  - D1 migration 0007 (mcp_sampling_log + agent_prs)
  - SPEC v3.1 갱신 (Sprint 13 F64/F65 등록)
  - CLAUDE.md 현재 상태 갱신 (v1.1.0)
  - E2E 4건 예정 (agent-pr-pipeline + mcp-prompts + workspace tabs + agents page integration)

### Changed
- McpRunner: listPrompts() + getPrompt() 메서드 추가
- GitHubService: PR 작성 기능 추가 (기존 읽기 → 읽기/쓰기)
- SSEManager: agent.pr.* 4 이벤트 타입 확장
- AgentOrchestrator: executeTaskWithPr() 선택 메서드 추가

### Technical Details
- MCP Sampling: in-memory sliding window rate limit (분당 10회), 허용 모델 화이트리스트, maxTokens 상한
- PR Pipeline: octokit 재활용, GitHub Tree API 5-step commit, Squash merge 전략
- ReviewerAgent: JSON 기반 structured output + clamp(0, 100) 점수 정규화
- Branch naming: agent/{agentId}/{taskType}-{timestamp}

### PDCA Documents
- FX-PLAN-014: Sprint 13 F64/F65/F66 Plan
- FX-DSGN-014: Sprint 13 상세 설계 (MCP + PR Pipeline)
- FX-ANLS-013: Sprint 13 Gap Analysis (F64 91%, F65 93%, Overall 93%)
- FX-RPRT-015: Sprint 13 Completion Report

---

## [0.12.0] - 2026-03-18

### Summary
**Sprint 12 완료** — ouroboros 패턴(F59, 100%) + Generative UI(F60, 95%) + MCP 실 구현(F61, 95%) + 테스트 보강(F63, 85%). Overall Match Rate ~93%. Agent Teams 병렬 구현 (2 Pane × 2 Workers). 전체 352 tests + 20 E2E.

### Added
- **F59 ouroboros 패턴 차용** (Match Rate 100%)
  - AmbiguityScore 타입 + calculateAmbiguity 유틸 (shared/agent.ts)
  - ambiguity-score.md 기준서 (ax-14-req-interview references)
  - ax-14 Phase 4에 Ambiguity Score 게이트 삽입 (≤0.2 = Green)
  - plan-plus Ontological Question 단계 추가
  - gap-detector Semantic 검증 가이드
- **F60 Generative UI 도입** (Match Rate 95%)
  - UIHint 타입 (layout, sections[], html?, actions[])
  - DynamicRenderer — UIHint 기반 레이아웃 분기
  - SectionRenderer — type별 렌더러 (text/code/diff/chart/diagram/table)
  - WidgetRenderer — sandboxed iframe + ResizeObserver
  - AgentTaskResult 리팩토링 — uiHint 분기 + LegacyRenderer 하위 호환
  - ClaudeApiRunner UIHint 생성 프롬프트 확장
  - generative-ui.test.tsx 11건
- **F61 MCP 실 구현** (Match Rate 95%)
  - SseTransport — fetch+ReadableStream SSE 파싱 (Workers 호환)
  - HttpTransport — 범용 fetch 기반 (fallback)
  - McpRunner — McpAgentRunner 구현 (tools/call + 결과 변환)
  - McpServerRegistry — D1 CRUD + findServerForTool + 도구 캐시
  - 0006_mcp_servers.sql D1 migration
  - routes/mcp.ts 5 endpoints (CRUD + test + tools)
  - schemas/mcp.ts Zod 스키마
  - McpServerCard.tsx 대시보드 UI
  - workspace/page.tsx MCP Servers 탭
  - api-client.ts MCP API 함수 5개
  - mcp-transport.test.ts 12건 + mcp-runner.test.ts 11건 + mcp-registry.test.ts 4건 + mcp-routes.test.ts 5건
- **F63 테스트 커버리지 강화** (Match Rate 85%)
  - mcp-integration.test.ts 5건 (selectRunner + executeTask MCP 통합)
  - service-integration.test.ts 3건 (CRUD lifecycle + findServerForTool)
  - e2e/helpers/sse-helpers.ts (waitForSSEEvent + injectSSECollector)
  - e2e/mcp-server.spec.ts 2건 (등록 폼 + 연결 테스트)

### Changed
- AgentOrchestrator: mcpRegistry 옵셔널 주입 + selectRunner() MCP 자동 선택
- app.ts: MCP 라우트 등록 + OpenAPI "MCP" 태그
- shared/agent.ts: McpServerInfo + McpTestResult + UIHint + SectionType 타입

### PDCA Documents
- FX-PLAN-012: Sprint 12 F59/F60 Plan
- FX-PLAN-013: Sprint 12 Stabilization F61/F62/F63 Plan
- FX-DSGN-013: Sprint 12 Stabilization Design
- FX-ANLS-012: Sprint 12 Stabilization Gap Analysis (F61 95%, F63 85%)
- FX-RPRT-014: Sprint 12 Completion Report (× 2: F59/F60 + F61/F63)

---

### 세션 33~34 (2026-03-18)
**Sprint 12 F59+F60 구현 — ouroboros 패턴 + Generative UI PDCA 전주기**:
- ✅ F59: AmbiguityScore 타입 + calculateAmbiguity + ambiguity-score.md 기준서 + ax-14 Phase 4-B/C
- ✅ F60: UIHint 타입 + ClaudeApiRunner 확장 + WidgetRenderer + SectionRenderer + DynamicRenderer + AgentTaskResult 리팩토링
- ✅ Agent Teams 2회 (sprint12: W1+W2 코드, s12fix: W1+W2 갭 해소) — 파일 충돌 0건
- ✅ 테스트 290→352건 (+62, API 201 + Web 45 + CLI 106), typecheck 5/5
- ✅ PDCA Plan(FX-PLAN-012) + Design(FX-DSGN-013) + Analysis(FX-ANLS-012) + Report(FX-RPRT-014)
- ✅ Match Rate: 초기 68% → Iteration 후 ~90%

**이전: Sprint 12 REQ 등록 — ouroboros 패턴 + Generative UI 리서치**:
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
