---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 5.1
status: Active
category: SPEC
system-version: 1.7.0
created: 2026-03-16
updated: 2026-03-19
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- **PRD**: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- **Phase**: Phase 3 진행 중 (멀티테넌시 + 외부 도구 연동) — Sprint 18 완료, Sprint 19 완료
- **Version**: 1.7.0

## §2 현재 상태

| 항목 | 상태 |
|------|------|
| Sprint 1 | ✅ 완료 (모노리포 + 핵심 모듈) |
| Sprint 2 | ✅ 완료 (커맨드 3개 + 템플릿 + CI + npm publish v0.1.1) |
| Sprint 3 | ✅ 완료 (Ink TUI + eslint + F21 프로젝트 관리 체계) |
| Sprint 4 | ✅ 완료 (UI 테스트 프레임워크 + status --watch) |
| Sprint 5 Part B | ✅ 완료 (하네스 산출물 동적 생성 F32~F36) |
| Sprint 5 Part A | ✅ 완료 (Frontend Design F26~F31, Match Rate ~90%) |
| PDCA Sprint 3 | ✅ 완료 (Match Rate 94%) |
| PDCA Sprint 4 | ✅ 완료 (Match Rate 97%) |
| PDCA Sprint 5B | ✅ 완료 (Match Rate 93%) |
| PDCA Sprint 5A | ✅ 완료 (Match Rate ~90%, 2 iterations) |
| Sprint 6 | ✅ 완료 (인프라: F37 92%, F39 97%, F40 100%, Overall 84%) |
| PDCA Sprint 6 | ✅ 완료 (Match Rate 84%, 2 iterations, F38 Sprint 7 이관) |
| Sprint 7 | ✅ 완료 (F38 98%, F41 72%, F42 95%, F43 90%, Overall 89%) |
| PDCA Sprint 7 | ✅ 완료 (Match Rate 89%, 1 iteration, Agent Teams 병렬) |
| Sprint 8 | ✅ 완료 (F44 92%, F45 96%, F46 94%, F47 90%, Overall 93%) |
| PDCA Sprint 8 | ✅ 완료 (Match Rate 93%) |
| Sprint 9 | ✅ 완료 (F48 97%, F49 92%, F50 91%, F51 95%, Overall 94%) |
| PDCA Sprint 9 | ✅ 완료 (Match Rate 94%, FX-RPRT-011) |
| Sprint 10 | ✅ 완료 (F52 97%, F53 92%, F54 94%, Overall 93%) |
| PDCA Sprint 10 | ✅ 완료 (Match Rate 93%, FX-RPRT-012) |
| Sprint 11 | ✅ 완료 (F55 95%, F56 88%, F57 100%, F58 91%, Overall 93%) |
| PDCA Sprint 11 | ✅ 완료 (Match Rate 93%, FX-RPRT-013) |
| Sprint 12 | ✅ 완료 (F59 100%, F60 95%, F61 95%, F63 85%, Overall ~93%) |
| PDCA Sprint 12 | ✅ 완료 (FX-RPRT-014 × 2: F59/F60 + F61/F63 분리 Report) |
| Sprint 13 | ✅ 완료 (F64 91%, F65 93%, F66 릴리스, Overall 93%) |
| Sprint 14 | ✅ 완료 (F67 92%, F68 92.5%, Overall 92%) |
| PDCA Sprint 14 | ✅ 완료 (FX-RPRT-016, Match Rate 92%) |
| Sprint 15 | ✅ 완료 (F70 92%, F71 90%, F72 92%, F73 100%, Overall 92%) |
| PDCA Sprint 15 | ✅ 완료 (FX-RPRT-017, Match Rate 92%) |
| Sprint 16 | ✅ 완료 (F75 92%, F76 91%, F77 미착수, Overall 91%) |
| PDCA Sprint 16 | ✅ 완료 (FX-RPRT-018, Match Rate 91%) |
| Sprint 17 | ✅ 완료 (F80 100%, F81 100%, F82 97%, Overall 98%) |
| PDCA Sprint 17 | ✅ 완료 (FX-RPRT-019, Match Rate 98%) |
| Sprint 18 | ✅ 완료 (F83 93%, F84 95%, F85 90%, F86 배포대기, Overall 93%) |
| PDCA Sprint 18 | ✅ 완료 (FX-RPRT-020, Match Rate 93%) |
| Sprint 20 | ✅ 완료 (F92 90%, 1 iteration) |
| PDCA Sprint 20 | ✅ 완료 (FX-RPRT-022, Match Rate 90%) |
| npm | foundry-x@0.5.0 published ✅ |
| typecheck | ✅ |
| build | ✅ |
| lint | ✅ (0 error) |
| tests | 399테스트 ✅ (API 패키지) + CLI 106 + Web 48 + 20 E2E |
| API endpoints | 73개 (15 routes) |
| API services | 30개 |
| D1 tables | 25개 (migrations 0001~0013) |
| D1 remote | ✅ 전부 적용 완료 |
| Workers | foundry-x-api.ktds-axbd.workers.dev ✅ v1.7.0 |
| Pages | fx.minu.best ✅ |

## §3 마일스톤

| 버전 | 마일스톤 | 상태 |
|:----:|----------|:----:|
| v0.1.0 | Sprint 1: 모노리포 + 핵심 모듈 | ✅ |
| v0.2.0 | Sprint 2: CLI 커맨드 + 템플릿 + 배포 | ✅ |
| v0.3.0 | Sprint 3: Ink TUI + eslint + 안정화 | ✅ |
| v0.3.1 | Sprint 3 마무리: npm 배포 + F21 프로젝트 관리 체계 구축 | ✅ |
| v0.4.0 | Sprint 4: UI 테스트 프레임워크 + Ink 실시간 업데이트 | ✅ |
| v0.5.0 | Sprint 5: Frontend Design (F26~F31) + 하네스 확장 (F32~F36) | ✅ |
| — | **Phase 1 Go 판정** | ✅ Go (2026-03-17) |
| v0.6.0 | Sprint 6: Cloudflare 인프라 + D1 + JWT 인증 + RBAC | ✅ |
| v0.7.0 | Sprint 7: OpenAPI 전환 + D1 실데이터 + shadcn/ui + 테스트 176건 | ✅ |
| v0.8.0 | Sprint 8: 서비스 레이어 + SSE + NL→Spec + Production Site (Match Rate 93%) | ✅ |
| v0.9.0 | Sprint 9: 프로덕션 배포 + E2E + 에이전트 오케스트레이션 (Match Rate 94%) | ✅ |
| v0.10.0 | Sprint 10: 에이전트 실연동 + NL→Spec 충돌 감지 (Match Rate 93%) | ✅ |
| v0.11.0 | Sprint 11: SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 (Match Rate 93%) | ✅ |
| v0.12.0 | Sprint 12: ouroboros 패턴 + Generative UI + MCP 실 구현 + 테스트 352건 (Match Rate ~93%) | ✅ |
| **v1.0.0** | **Phase 2 릴리스: 33 endpoints + 14 services + 352 tests + MCP + Generative UI** | ✅ |
| v1.1.0 | Sprint 13: MCP Sampling/Prompts + 에이전트 자동 PR 파이프라인 (41 endpoints, 388 tests) | ✅ |
| v1.2.0 | Sprint 14: MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 (50 endpoints, 429 tests) | ✅ |
| v1.3.0 | Sprint 15: PlannerAgent + 에이전트 inbox + git worktree 격리 (57 endpoints, 307 API tests) | ✅ |
| v1.4.0 | Sprint 16: PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 (57 endpoints, 313 API tests) | ✅ |
| v1.5.0 | Sprint 17: AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 | ✅ |
| v1.6.0 | Sprint 18: 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 (342 tests, Match Rate 93%) | ✅ |
| v1.7.0 | Sprint 19: AgentInbox 스레드 답장 — ThreadReplyForm + API 보강 + 통합 테스트 | ✅ |

## §4 성공 지표

| 지표 | 목표 | 현재 |
|------|------|------|
| CLI 주간 호출/사용자 | 10회+ | — (내부 사용 시작 전) |
| `--no-verify` 우회 비율 | < 20% | 0% (hook 미우회) |
| sync 후 수동 수정 파일 | 감소 추세 | — |
| 결정 승인율 | > 70% | — |
| 하네스 무결성 통과율 (K6) | > 95% | — |

### Phase 1 Go 판정 (2026-03-17)

**판정: Go** — Phase 2 진행

**PRD Go 조건 대비:**

| 조건 | 충족 여부 | 근거 |
|------|:---------:|------|
| NPS 6+ (5명 대상) | N/A | 내부 팀 온보딩 전 (1인 개발 단계) |
| CLI 주간 사용률 60%+ | N/A | 동일 사유 |
| "없으면 불편" 피드백 2명+ | N/A | 동일 사유 |

**정성 판정 근거 (Product Owner 판단):**
1. **Phase 1 기술 산출물 완성**: CLI v0.5.0 — 3개 커맨드 + Ink TUI + 4개 Builder + 106 테스트, PDCA 93~97%
2. **Phase 2 프로토타입 검증**: API 서버(15 endpoints) + 웹 대시보드(6 pages) 프레임워크 구축 완료
3. **전체 F-item 36건 DONE**: Sprint 1~5 모든 기능 항목 완료, Tech Debt 0건
4. **Kill 조건 미해당**: CLI 완성 ✅, 온보딩 대상자 확보는 Phase 2에서 팀원 합류 시 병행

**비고:** KPI K1~K4는 실사용자 온보딩 후 Phase 2에서 측정. Phase 1은 기술 기반 구축 목적 달성으로 Go 판정.

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

## §6 Execution Plan

### Sprint 1 (v0.1.0) ✅
- [x] 모노리포 구조 생성 (FX-REQ-001 DONE)
- [x] packages/shared 타입 정의 (FX-REQ-002 DONE)
- [x] harness 모듈 6개 구현 (FX-REQ-003 DONE)
- [x] PlumbBridge 래퍼 구현 (FX-REQ-004 DONE)
- [x] services 모듈 3개 구현 (FX-REQ-005 DONE)
- [x] typecheck + build 통과

### Sprint 2 (v0.2.0) ✅
- [x] init 커맨드 — harness detect→generate 파이프라인 (FX-REQ-006 DONE)
- [x] sync 커맨드 — PlumbBridge review 연동 (FX-REQ-007 DONE)
- [x] status 커맨드 — Triangle Health Score 표시 (FX-REQ-008 DONE)
- [x] 하네스 템플릿 3종 생성 (FX-REQ-009 DONE)
- [x] 검증 스크립트 2개 작성 (FX-REQ-010 DONE)
- [x] typecheck ✅ tests 35/35 ✅
- [x] npm publish + npx 검증 (FX-REQ-011 DONE)
- [x] ADR-000 작성 (FX-REQ-012 DONE)
- [x] 내부 계약 문서 2건 (FX-REQ-013 DONE, FX-REQ-014 DONE)

### Sprint 3 (v0.3.0) ✅
- [x] eslint flat config 설정 + 기존 코드 lint fix (FX-REQ-019 DONE)
- [x] Ink TUI 공통 컴포넌트 — StatusBadge, HealthBar, ProgressStep, Header, ErrorBox (FX-REQ-015 DONE)
- [x] non-TTY 감지 + Ink/plain 분기 유틸 (FX-REQ-020 DONE)
- [x] status 커맨드 Ink TUI 전환 (FX-REQ-016 DONE)
- [x] init 커맨드 Ink TUI 전환 (FX-REQ-017 DONE)
- [x] sync 커맨드 Ink TUI 전환 (FX-REQ-018 DONE)
- [x] 프로젝트 관리 점검 및 개선 — GitHub Projects + Branch Protection + 온보딩 가이드 (FX-REQ-021 DONE)
- [x] 기존 35개 테스트 통과 + typecheck + build + lint 검증

### Sprint 4 (v0.4.0) ✅
- [x] ink-testing-library 설치 + vitest.config.ts TSX 패턴 추가 (FX-REQ-022 DONE)
- [x] test-data.ts 중앙 팩토리 생성 (FX-REQ-022 DONE)
- [x] 공통 컴포넌트 테스트 5개 — Header(3), StatusBadge(5), HealthBar(7), ProgressStep(6), ErrorBox(3) (FX-REQ-023 DONE)
- [x] View 테스트 3개 — StatusView(3), InitView(2), SyncView(2) (FX-REQ-024 DONE)
- [x] render.tsx 4-branch 분기 테스트 5개 (FX-REQ-024 DONE)
- [x] StatusWatchView.tsx — fs.watch + debounce + useInput('q') (FX-REQ-025 DONE)
- [x] status.ts --watch, --interval 옵션 추가 (FX-REQ-025 DONE)
- [x] 71개 테스트 전부 통과 + typecheck + build + lint 검증

### Sprint 5 (v0.5.0) — Frontend Design + 하네스 확장
**Part A: Frontend Design** ✅
- [x] 팀 정보 공유 대시보드 (FX-REQ-026 DONE)
- [x] Human Readable Document + Wiki (FX-REQ-027 DONE)
- [x] 아키텍처 뷰 — 4탭 (FX-REQ-028 DONE)
- [x] 개인 워크스페이스 — ToDo, Message, Setting (FX-REQ-029 DONE)
- [x] Agent 투명성 뷰 — AgentCard + SSE (FX-REQ-030 DONE)
- [x] Token/비용 관리 — Summary + 비용 테이블 (FX-REQ-031 DONE)

**Part B: 하네스 산출물 확장** ✅
- [x] 동적 ARCHITECTURE.md 생성 — RepoProfile 기반 모듈 맵 (FX-REQ-032 DONE)
- [x] 동적 CONSTITUTION.md 생성 — 스택별 경계 규칙 (FX-REQ-033 DONE)
- [x] 동적 CLAUDE.md + AGENTS.md 생성 — 커맨드 자동 감지 (FX-REQ-034 DONE)
- [x] verify.ts 강화 — 플레이스홀더 잔존·일관성 (FX-REQ-035 DONE)
- [x] 하네스 신선도 검사 — status에서 갱신 시점 비교 (FX-REQ-036 DONE)
- [x] 22파일 106테스트 전부 통과 + typecheck + build + lint 검증

### Sprint 6 (v0.6.0) — 인프라 + 인증 ✅
- [x] Cloudflare Workers 배포 파이프라인 — wrangler.toml + deploy.yml (FX-REQ-037 DONE)
- [x] D1 스키마 6테이블 + Drizzle ORM + 마이그레이션 + seed (FX-REQ-039 DONE)
- [x] JWT 인증 (signup/login/refresh) + RBAC (admin/member/viewer) 미들웨어 적용 (FX-REQ-040 DONE)
- [x] OpenAPI 3.1 계약서 — Sprint 7 완료 (FX-REQ-038 DONE, Match 98%)
- [x] 38파일 145테스트 전부 통과 + typecheck + build + lint 검증
- [x] PDCA 2회 iteration — 61% → 84% (F37+F39+F40 = 96%)

### Sprint 7 (v0.7.0) — OpenAPI + 실데이터 + Web 고도화 ✅
- [x] OpenAPI 3.1 전환 — createRoute 17 endpoints + Zod 21스키마 (FX-REQ-038 DONE, Match 98%)
- [x] API 실데이터 연결 — D1 전환, data-reader 제거 (FX-REQ-041 DONE, Match 72%)
- [x] shadcn/ui + 다크모드 + 반응형 — 웹 컴포넌트 고도화 (FX-REQ-042 DONE, Match 95%)
- [x] 테스트 스위트 — D1 mock + auth/middleware 테스트 (FX-REQ-043 DONE, Match 90%)
- [x] 31파일 176테스트 전부 통과 + typecheck + build 검증
- [x] PDCA 1회 iteration — Agent Teams 병렬, Overall 89%

### Sprint 8 (v0.8.0) — API 완성 + 핵심 기능 ✅
- [x] requirements GitHub API + KV 캐시 (FX-REQ-041 DONE)
- [x] health/integrity/freshness 실데이터 전환 (FX-REQ-041 DONE)
- [x] SSE 실시간 통신 — Agent/Sync 상태 스트리밍 (FX-REQ-044 DONE)
- [x] NL→Spec 변환 — LLM 통합 파이프라인 (FX-REQ-045 DONE)
- [x] Wiki Git 동기화 — D1 ↔ Git 양방향 (FX-REQ-046 DONE)
- [x] Production Site Design — fx.minu.best 랜딩+대시보드 통합 (FX-REQ-047 DONE)
- [x] ~~Workers 프로덕션 재배포~~ (Sprint 9 F48에서 대체)
- [x] ~~npm publish foundry-x@0.8.0~~ (v0.5.0→v1.0.0 직행, 건너뜀)
- [x] 42파일 216테스트 전부 통과 + typecheck + build + lint 검증 (PDCA 93%)

### Sprint 9 (v0.9.0) — 프로덕션 배포 + E2E + 에이전트 오케스트레이션 ✅
- [x] Workers secrets 설정 + D1 migration remote 적용 (FX-REQ-048 DONE)
- [x] Pages deploy job 복원 + 배포 Runbook 작성 (FX-REQ-048 DONE)
- [x] Playwright E2E 인프라 설정 + CI 통합 (FX-REQ-049 DONE)
- [x] 크리티컬 패스 E2E: login→dashboard→agents→spec-generator (FX-REQ-049 DONE)
- [x] API 통합 테스트 — 서비스 간 호출 검증 (FX-REQ-049 DONE)
- [x] 에이전트 Capability 실 정의 + Constraint 강제 로직 (FX-REQ-050 DONE)
- [x] 에이전트 브랜치 기반 격리 — PR 기반 작업 흐름 (FX-REQ-050 DONE)
- [x] Smoke test + health check 강화 (FX-REQ-051 DONE)
- [x] Workers + Pages 프로덕션 배포 검증 (FX-REQ-048 DONE)
- [x] typecheck + build + tests 통과 — 48파일 241테스트 ✅ (PDCA 94%)

### Sprint 10 (v0.10.0) — 에이전트 실연동 + NL→Spec 충돌 감지 ✅
- [x] Workers secrets 설정 + D1 migration remote 적용 (FX-REQ-052 DONE)
- [x] Workers + Pages 프로덕션 배포 + smoke test 검증 (FX-REQ-052 DONE)
- [x] AgentRunner 추상화 계층 + ClaudeApiRunner 구현 (FX-REQ-053 DONE)
- [x] MCP 어댑터 인터페이스 설계 (FX-REQ-053 DONE)
- [x] 에이전트 실행 → agent_tasks 실데이터 기록 (FX-REQ-053 DONE)
- [x] NL→Spec 기존 명세 충돌 감지 엔진 (FX-REQ-054 DONE)
- [x] 충돌 표시 + 사용자 선택 UI (수락/거절/수정) (FX-REQ-054 DONE)
- [x] typecheck + build + tests 276건 통과 (PDCA 93%)

### Sprint 11 (v0.11.0) — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 ✅
- [x] SSE agent.task.started/completed 이벤트 전파 (FX-REQ-055 DONE)
- [x] agents/page.tsx SSE task 이벤트 핸들링 + 실시간 UI (FX-REQ-055 DONE)
- [x] Playwright agent execute E2E — 실행→결과 확인 흐름 (FX-REQ-056 DONE)
- [x] Playwright conflict resolution E2E — 충돌 감지→해결 흐름 (FX-REQ-056 DONE)
- [x] API 통합 테스트 추가 — agent-runner + conflict-detector (FX-REQ-056 DONE)
- [x] wrangler.toml ENVIRONMENT vars 설정 + deploy.yml 환경 분리 (FX-REQ-057 DONE)
- [x] GitHub Actions 자동 배포 트리거 (PR merge → deploy) (FX-REQ-057 DONE)
- [x] MCP 1.0 스펙 리뷰 + 프로토콜 설계 문서 (FX-REQ-058 DONE)
- [x] McpAgentRunner 구현 계획 + 인터페이스 확정 (FX-REQ-058 DONE)
- [x] typecheck + build + tests 290건 통과 + 18 E2E specs (PDCA 93%)

### Sprint 12 (v0.12.0) — ouroboros 패턴 + Generative UI + MCP + 테스트 ✅
- [x] ouroboros Ambiguity Score 정량화 모듈 도입 — ax-14-req-interview 강화 (FX-REQ-059 DONE)
- [x] Socratic 질문법 + 온톨로지 분석 — plan-plus 스킬 강화 (FX-REQ-059 DONE)
- [x] 3-stage Evaluation 패턴 — bkit PDCA Check 단계 고도화 (FX-REQ-059 DONE)
- [x] Generative UI Widget Renderer — sandboxed iframe + CSS 변수 주입 (FX-REQ-060 DONE)
- [x] 에이전트 결과 인터랙티브 렌더링 — Decision Matrix 기반 시각화 (FX-REQ-060 DONE)
- [x] CopilotKit useComponent 패턴 — 대시보드 동적 시각화 (FX-REQ-060 DONE)
- [x] MCP SseTransport 구현 — fetch+ReadableStream SSE 파싱 (FX-REQ-061 DONE)
- [x] McpAgentRunner 구현 — taskType → MCP tool.call() 변환 + 결과 파싱 (FX-REQ-061 DONE)
- [x] MCP 서버 연결 설정 UI — workspace 페이지 MCP Servers 탭 (FX-REQ-061 DONE)
- [x] CHANGELOG v0.12.0 + SPEC/CLAUDE.md 갱신 (FX-REQ-062 DONE)
- [x] 프로덕션 최종 배포 + D1 migration remote + v1.0.0 태그 (FX-REQ-062 DONE)
- [x] MCP E2E + SSE 헬퍼 + 통합 테스트 (FX-REQ-063 DONE)
- [x] API 통합 테스트 확대 — MCP runner + 서비스 간 호출 검증 (FX-REQ-063 DONE)
- [x] typecheck + build + tests 352건 통과 + 20 E2E specs (PDCA ~93%)

### Sprint 13 (v1.1.0) — MCP Sampling/Prompts + 에이전트 자동 PR ✅
- [x] MCP SamplingHandler — 서버→클라이언트 LLM 호출 위임 (FX-REQ-064 DONE)
- [x] MCP PromptsClient — prompts/list + prompts/get (FX-REQ-064 DONE)
- [x] MCP API 4 endpoints + Prompts 브라우저 UI (FX-REQ-064 DONE)
- [x] PrPipelineService — branch→commit→PR→merge 전체 자동화 (FX-REQ-065 DONE)
- [x] ReviewerAgent — cross-agent PR 리뷰 (FX-REQ-065 DONE)
- [x] GitHubService 확장 — createBranch, createPR, mergePR + 5 메서드 (FX-REQ-065 DONE)
- [x] Auto-merge 7-gate 판정 — SDD + Quality + CI + Security (FX-REQ-065 DONE)
- [x] SSE agent.pr.* 이벤트 4종 + 대시보드 PR 상태 UI (FX-REQ-065 DONE)
- [x] D1 migration 0007 — agent_prs + mcp_sampling_log (FX-REQ-064, FX-REQ-065 DONE)
- [x] CHANGELOG v1.1.0 + version bump (FX-REQ-066 DONE)
- [x] ~~D1 migration remote 적용 + 프로덕션 배포~~ (Sprint 14 F69에서 일괄 적용)
- [x] typecheck + build + tests 388건 통과 (PDCA 93%)

### Sprint 14 (v1.2.0) — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 ✅
- [x] McpResourcesClient — listResources, readResource, subscribeResource (FX-REQ-067 DONE)
- [x] McpRunner 확장 — onNotification, resources/updated 핸들링 (FX-REQ-067 DONE)
- [x] MCP API 4 endpoints (resources/list, templates, read, subscribe) (FX-REQ-067 DONE)
- [x] McpResourcesPanel + ResourceViewer UI (FX-REQ-067 DONE)
- [x] MergeQueueService — enqueue, detectConflicts, calculateMergeOrder, processNext (FX-REQ-068 DONE)
- [x] AgentOrchestrator 확장 — executeParallel, executeParallelWithPr (FX-REQ-068 DONE)
- [x] GitHubService 확장 — getModifiedFiles, updateBranch, getPrStatuses (FX-REQ-068 DONE)
- [x] Agent API 5 endpoints (parallel, queue) (FX-REQ-068 DONE)
- [x] D1 migration 0008 — merge_queue + parallel_executions (FX-REQ-068 DONE)
- [x] MergeQueuePanel + ConflictDiagram + ParallelExecutionForm UI (FX-REQ-068 DONE)
- [x] D1 migration 0007+0008 remote 적용 + 프로덕션 배포 (FX-REQ-069 DONE)
- [x] v1.2.0 릴리스 — CHANGELOG + version bump + git tag (FX-REQ-069 DONE)
- [x] ~~multitenancy.design.md~~ (Sprint 18 F83에서 구현으로 대체) + ~~phase-3-roadmap.md~~ (Sprint 15 F73에서 대체)
- [x] ~~E2E 테스트 — Merge Queue + MCP Resources~~ (Sprint 19+ 이관)
- [x] typecheck + build + tests 429건 통과 (PDCA 92%)

### Sprint 15 (v1.3.0) — PlannerAgent + 에이전트 inbox 통신 + git worktree 격리 ✅
- [x] PlannerAgent 서비스 — 코드베이스 분석 + 계획 수립 6 메서드 (FX-REQ-070 DONE)
- [x] AgentPlanCard.tsx — 계획 표시 + 수락/수정/거절 UI (FX-REQ-070 DONE, WIP 활용)
- [x] POST /agents/plan 엔드포인트 3개 + D1 agent_plans 테이블 (FX-REQ-070 DONE)
- [x] AgentOrchestrator.createPlanAndWait + executePlan (FX-REQ-070 DONE)
- [x] D1 agent_messages 테이블 — 에이전트 간 비동기 메시지 큐 (FX-REQ-071 DONE)
- [x] POST/GET /agents/inbox/* API 엔드포인트 3개 (FX-REQ-071 DONE)
- [x] SSE agent.message.received 이벤트 추가 (FX-REQ-071 DONE)
- [x] WorktreeManager 서비스 — gitExecutor DI + D1 영속 (FX-REQ-072 DONE)
- [x] AgentOrchestrator worktree 격리 모드 통합 — executeTaskIsolated (FX-REQ-072 DONE)
- [x] 제품 포지셔닝 리서치 — Foundry-X 정체성 재정립 + 기존 서비스 연동 범위 확정 (FX-REQ-073 DONE)
- [x] Discovery-X / AXIS Design System / AI Foundry 자산 분석 + 재활용 계획 (FX-REQ-073 DONE)
- [x] Sprint 15 최종 스코프 재정의 (FX-REQ-073 결과 반영) (FX-REQ-073 DONE)
- [x] typecheck + build + tests 307건 통과 (PDCA 92%)

### Sprint 16 (v1.4.0) — PlannerAgent LLM + AgentInboxPanel UI + 배포 ✅
- [x] PlannerAgent createPlan() Mock→Claude API 실 호출 전환 (FX-REQ-075 DONE)
- [x] PlannerAgent 전용 시스템 프롬프트 + JSON schema 응답 파싱 (FX-REQ-075 DONE)
- [x] API 에러 시 Mock 폴백 로직 (FX-REQ-075 DONE)
- [x] planner-agent.test.ts 확장 — LLM mock + 파싱 성공/실패 (FX-REQ-075 DONE)
- [x] AgentPlanCard.tsx shared import 전환 (inline 타입 삭제) (FX-REQ-076 DONE)
- [x] AgentInboxPanel.tsx 신규 — 메시지 목록 + 타입별 렌더링 + ack + SSE (FX-REQ-076 DONE)
- [x] agents/page.tsx inbox 탭 추가 + AgentPlanCard 통합 (FX-REQ-076 DONE)
- [x] api-client.ts 확장 — plan/inbox API 함수 6개 (FX-REQ-076 DONE)
- [x] D1 migration 0009 remote 적용 — 22테이블 확인 (FX-REQ-077 DONE)
- [x] Workers + Pages 프로덕션 재배포 + smoke test — CI/CD 성공 (FX-REQ-077 DONE)
- [x] version bump v1.4.0 + SPEC + git tag (FX-REQ-077 DONE)
- [x] typecheck + build + tests 통과 (313건)

### 단독: F74 프로젝트 소개 페이지 전면 개편
- [x] 랜딩 페이지 Hero 섹션 — "사람과 AI가 함께 만드는 곳" (FX-REQ-074 DONE)
- [x] Features 섹션 — 3 Pillars (에이전트 통제/조직 지식/실험-코드) (FX-REQ-074 DONE)
- [x] Pricing 섹션 삭제 (FX-REQ-074 DONE)
- [x] Architecture 섹션 신규 — 4-Layer 블루프린트 (FX-REQ-074 DONE)
- [x] Roadmap 섹션 신규 — Phase 1~4 타임라인 (FX-REQ-074 DONE)
- [x] BluePrint 섹션 신규 — AX BD팀 생태계 다이어그램 (FX-REQ-074 DONE)
- [x] Navbar/Footer 업데이트 — v1.3.0 + Ecosystem 링크 (FX-REQ-074 DONE)

### Sprint 17 (v1.5.0) — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 ✅
- [x] AI Foundry MCP 연동 설계 문서 작성 — 서비스 등록 흐름 + 인증 전략 (FX-REQ-080 DONE)
- [x] MCP 서버 등록 API 확장 — AI Foundry 전용 프리셋 + 연결 검증 (FX-REQ-080 DONE)
- [x] PlannerAgent 외부 MCP 호출 경로 — AI Foundry tool.call() 통합 (FX-REQ-080 DONE)
- [x] AgentInbox 스레드 라우트 — GET /agents/inbox/:parentMessageId/thread (FX-REQ-081 DONE)
- [x] AgentInboxPanel 스레드 UI — 대화 맥락 그룹핑 + 토글 뷰 (FX-REQ-081 DONE)
- [x] api-client getInboxThread() 함수 추가 (FX-REQ-081 DONE)
- [x] createPlanAndWait() 승인 대기 메커니즘 — 폴링 (FX-REQ-082 DONE)
- [x] executePlan() 라이프사이클 — executing/completed/failed 상태 추적 (FX-REQ-082 DONE)
- [x] agent_plans 테이블 확장 — execution_* 컬럼 추가 (D1 migration 0010) (FX-REQ-082 DONE)
- [x] Plan 관리 API 2 endpoints — get/execute (FX-REQ-082 DONE)
- [x] typecheck + build + tests 313건 통과 (PDCA 98%)

### Sprint 18 (v1.6.0) — 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 ✅
- [x] D1 migration 0011: organizations + org_members 테이블 (FX-REQ-083 DONE)
- [x] D1 migration 0012: org_id 컬럼 (projects, agents, mcp_servers) + GitHub 컬럼 (FX-REQ-083 DONE)
- [x] tenantGuard 미들웨어 — JWT orgId + DB 멤버십 검증 (FX-REQ-083 DONE)
- [x] Login/Signup org 자동 할당 + Refresh org 재조회 (FX-REQ-083 DONE)
- [x] routes/agent + mcp에 org_id 필터 적용 (FX-REQ-083 DONE)
- [x] GitHubSyncService — syncTaskToIssue + syncIssueToTask + syncPrStatus (FX-REQ-084 DONE)
- [x] webhook.ts issues + pull_request 이벤트 핸들러 확장 (FX-REQ-084 DONE)
- [x] GitHub 양방향 동기화 테스트 17건 (FX-REQ-084 DONE)
- [x] SlackService — sendNotification + handleSlashCommand + handleInteraction (FX-REQ-085 DONE)
- [x] Slack routes 2개 — /slack/commands + /slack/interactions (FX-REQ-085 DONE)
- [x] SSE→Slack 브릿지 — 에이전트 이벤트 실시간 전파 (FX-REQ-085 DONE)
- [x] Slack 테스트 12건 (FX-REQ-085 DONE)
- [x] typecheck + build + tests 342건 통과 (PDCA 93%)
- [x] D1 migrations 0011~0012 remote 적용 완료 (FX-REQ-086 DONE, 2026-03-19 00:14:02)
- [x] Workers 프로덕션 배포 완료 (FX-REQ-086 DONE, Version ae45aab5)

### Sprint 19 (v1.7.0) — AgentInbox 스레드 답장 ✅
- [x] ThreadReplyForm 컴포넌트 — 답장 입력 폼 + type/subject/payload 필드 (FX-REQ-087 DONE)
- [x] ThreadDetailView — getInboxThread() 연동 + 스레드 전체 대화 표시 (FX-REQ-087 DONE)
- [x] AgentInboxPanel 스레드 클릭 → ThreadDetailView 전환 UX (FX-REQ-087 DONE)
- [x] 답장 알림 SSE 이벤트 — agent.message.thread_reply 전파 (FX-REQ-088 DONE)
- [x] 스레드 읽음 처리 — ackThread() 일괄 확인 메서드 (FX-REQ-088 DONE)
- [x] mock-d1 agent_messages 테이블 추가 + 인덱스 (FX-REQ-089 DONE)
- [x] inbox 라우트 통합 테스트 — 5 endpoints 전체 커버리지 (FX-REQ-089 DONE)
- [x] Playwright E2E — 스레드 답장 흐름 시나리오 4건 (FX-REQ-089 DONE)
- [x] typecheck + build + tests 356건 통과 (PDCA 100%)

### 단독: F78 Production 사이트 E2E 테스트 ✅
- [x] Playwright 프로덕션 config — baseURL: fx.minu.best (FX-REQ-078 DONE)
- [x] smoke test E2E — health check + 랜딩 페이지 로딩 검증 (FX-REQ-078 DONE)
- [x] 크리티컬 패스 E2E — 랜딩→대시보드→에이전트→spec-generator 흐름 (FX-REQ-078 DONE)
- [x] CI 연동 — deploy.yml prod-e2e job 추가, smoke-test 후 Playwright 실행 (FX-REQ-078 DONE)

### 단독: F79 UI/UX 전면 리디자인 — AXIS Design System 연동 ✅
- [x] AXIS DS 토큰 체계 분석 + Foundry-X tailwind 매핑 (FX-REQ-079 DONE)
- [x] 랜딩 페이지 AXIS DS 기반 리디자인 (FX-REQ-079 DONE)
- [x] 대시보드 레이아웃 + 컴포넌트 AXIS DS 전환 (FX-REQ-079 DONE)
- [x] shadcn/ui → AXIS DS CSS 변수 자동 전환 (FX-REQ-079 DONE — 코드 변경 없이 토큰 매핑)

### 단독: F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동 ✅
- [x] gatherExternalToolInfo() 메서드 구현 — mcpRegistry active 서버 도구 수집 (FX-REQ-090 DONE)
- [x] PLANNER_SYSTEM_PROMPT 확장 — external_tool type + externalTool 스키마 가이드 (FX-REQ-090 DONE)
- [x] analyzeCodebase() 수정 — 도구 목록 프롬프트 주입 (FX-REQ-090 DONE)
- [x] 테스트 7건 — mcpRegistry mock + external_tool 파싱 검증 (FX-REQ-090 DONE)
- [x] typecheck + lint + 기존 테스트 통과 — 363건 전부 pass (FX-REQ-090 DONE)

### 단독: F91 executePlan() repoUrl 실제 리포 URL 연동 ✅
- [x] executePlan() 시그니처 변경 — options?: { repoUrl?, branch? } (FX-REQ-091 DONE)
- [x] context.repoUrl에 options.repoUrl 반영 + 폴백 (FX-REQ-091 DONE)
- [x] POST /plan/:id/execute 라우트에서 repoUrl/projectId 조회 + 전달 (FX-REQ-091 DONE)
- [x] schemas/plan.ts — executePlanSchema 옵션 추가 (FX-REQ-091 DONE)
- [x] 테스트 3건 — repoUrl 전달/미전달/branch 검증 (FX-REQ-091 DONE)
- [x] mock-d1 agent_plans 스키마 실제 마이그레이션 정렬 (FX-REQ-091 DONE)
- [x] typecheck ✅ + 366 tests 전부 pass (FX-REQ-091 DONE)

### 미배정 — Phase 3 잔여

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F92 | 멀티테넌시 고도화 — org 전환 UI, org별 격리 강화, 초대/권한 관리 (FX-REQ-092, P1) | v1.8+ | ✅ | Match Rate 90% |
| F93 | GitHub 양방향 동기화 고도화 — PR 자동 리뷰 실 연동, Issue→Task 자동 생성 (FX-REQ-093, P1) | v1.8+ | 🔧 | Sprint 20 |
| F94 | Slack 고도화 — Interactive 메시지 (승인/거절 버튼), 채널별 알림 설정 (FX-REQ-094, P2) | v1.8+ | 📋 | — |
| F95 | PlannerAgent 고도화 — 실 LLM 기반 코드베이스 분석 정확도 개선 (FX-REQ-095, P2) | v1.8+ | 📋 | — |
| F96 | v1.7.0 프로덕션 배포 — Sprint 19 코드 + D1 migration remote 적용 (FX-REQ-096, P0) | v1.7 | ✅ | Workers 50e9c494 배포 완료 |
| F97 | 테스트 커버리지 확장 — E2E (멀티테넌시, GitHub/Slack 흐름) (FX-REQ-097, P2) | v1.8+ | 📋 | — |

## §7 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Node.js 20, Commander + Ink |
| API Server | TypeScript, Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), Drizzle ORM |
| Auth | JWT (hono/jwt) + PBKDF2 (Web Crypto) + RBAC |
| Web Dashboard | Next.js 14, React 18, Zustand |
| SDD Engine | Python, Plumb (subprocess) |
| 빌드 | pnpm workspace, Turborepo, tsc |
| 테스트 | vitest, ink-testing-library |
| CI/CD | GitHub Actions, wrangler-action, pages-action |
| Git 연동 | simple-git |

## §8 Tech Debt

| TD# | 등록일 | 항목 | 영향 |
|-----|:------:|------|------|
| ~~TD-01~~ | 2026-03-16 | ~~index.ts에 Commander 설정 미구현 (placeholder)~~ | ~~해소 (Sprint 2 — F6/F7/F8 커맨드 구현)~~ |
| ~~TD-02~~ | 2026-03-16 | ~~eslint 미설정 (package.json에 lint script 있으나 미설치)~~ | ~~해소 (세션 #10 — F19 eslint flat config)~~ |

## §9 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — Sprint 1 완료 소급 등록, Sprint 2 계획 |
| 1.1 | 2026-03-17 | Sprint 4 완료 — F22~F25 추가, 테스트 71건, Match Rate 97% |
| 1.2 | 2026-03-17 | Sprint 5 계획 — F26~F36 Frontend Design 6건 + 하네스 확장 5건 등록 (P1) |
| 1.3 | 2026-03-17 | Sprint 5 완료 — Part A F26~F31 DONE + Part B F32~F36 DONE, API+Web 패키지 추가 |
| 1.4 | 2026-03-17 | Phase 1 Go 판정 — v0.5.0 마일스톤 + Go 판정 근거 + Phase 2 전환 기록 |
| 1.5 | 2026-03-17 | Sub-Sprint D — API 36테스트 + Web 18테스트 추가, v0.5.0 버전 범프, 총 160테스트 |
| 1.6 | 2026-03-17 | Phase 2 F-items 섹션 추가 — F37~F40 소급 등록 (phase-2.plan 기준 통일), sprint-6-infra Plan 작성 |
| 1.7 | 2026-03-17 | Sprint 6 완료 — F37/F39/F40 DONE, F38 Sprint 7 이관, v0.6.0, 145테스트, PDCA 84% |
| 1.8 | 2026-03-17 | Sprint 7 완료 — F38/F41/F42/F43 DONE, v0.7.0, 176테스트, PDCA 89% |
| 1.9 | 2026-03-17 | Sprint 8 계획 — F44~F46 등록, F41 잔여 + SSE + NL→Spec + Wiki Git |
| 2.0 | 2026-03-17 | F47 Production Site Design 등록 — fx.minu.best 랜딩+대시보드 통합 (P1) |
| 2.1 | 2026-03-18 | Sprint 8 완료 — 서비스 레이어 9개 + 216 tests + Match Rate 93% |
| 2.2 | 2026-03-18 | Sprint 8 F44~F47 ✅ 보정 + Sprint 9 계획 — F48~F51 등록 (배포+E2E+오케스트레이션) |
| 2.3 | 2026-03-18 | Sprint 9 완료 보정 — F48~F51 ✅, §6 체크박스 갱신, system-version 0.9.0, §2 Sprint 8/9 현황 추가 |
| 2.4 | 2026-03-18 | Sprint 10 계획 — F52~F54 등록 (프로덕션 실배포+에이전트 실연동+NL→Spec 충돌 감지) |
| 2.5 | 2026-03-18 | Sprint 10 완료 보정 — F52~F54 ✅, 276 tests, v0.10.0 + Sprint 11 계획 F55~F58 등록 |
| 2.6 | 2026-03-18 | Sprint 11 완료 — F55~F58 ✅, 290 tests + 18 E2E, v0.11.0, PDCA 93% |
| 2.7 | 2026-03-18 | Sprint 12 계획 — F59(ouroboros 패턴 차용) + F60(Generative UI 도입) 등록, P1 |
| 2.8 | 2026-03-18 | Sprint 12 확장 — F61(MCP 실 구현) + F62(v1.0.0 릴리스) + F63(테스트 보강) 등록 |
| 2.9 | 2026-03-18 | Sprint 12 완료 — F59~F61/F63 ✅, 352 tests + 20 E2E, system-version 0.12.0, §2/§3/§6 갱신 |
| 3.0 | 2026-03-18 | Sprint 13 계획 — F64(MCP Sampling/Prompts) + F65(에이전트 자동 PR) + F66(v1.1.0) 등록 |
| 3.1 | 2026-03-18 | Sprint 13 완료 — F64(91%) + F65(93%) ✅, 388 tests, system-version 1.1.0, F66 릴리스 진행 |
| 3.2 | 2026-03-18 | Sprint 14 계획 — F67(MCP Resources) + F68(멀티 에이전트 동시 PR) + F69(v1.2.0+Phase 3) 등록 |
| 3.3 | 2026-03-18 | Sprint 15 계획 — F70(PlannerAgent, P1) + F71(Agent inbox, P1) + F72(git worktree, P2) 등록. 출처: FX-RESEARCH-014 |
| 3.4 | 2026-03-18 | SPEC 보정 — §6 Sprint 14 체크박스 갱신, v1.2.0 마일스톤 ✅, frontmatter 3.0→3.4 + system-version 1.2.0 |
| 3.5 | 2026-03-18 | F73 추가 — 제품 포지셔닝 재점검(P0, Improvement), Sprint 15 스코프 확장, Issue #63 |
| 3.6 | 2026-03-18 | Sprint 15 완료 — F70~F72 ✅, F73 ✅, 307 API tests, system-version 1.3.0, PDCA 92% |
| 3.7 | 2026-03-18 | F74 등록 — 프로젝트 소개 페이지 전면 개편 (P1, 단독 작업, FX-REQ-074) |
| 3.8 | 2026-03-18 | Sprint 16 계획 — F75(PlannerAgent LLM, P1) + F76(AgentInboxPanel UI, P1) + F77(프로덕션 배포, P2) 등록 |
| 3.9 | 2026-03-18 | Sprint 16 완료 — F75(92%) + F76(91%) ✅, F77 미착수, 313 API tests, Match Rate 91%, PDCA 전주기 완료 |
| 4.0 | 2026-03-18 | F78+F79 단독 작업 등록 — Production E2E(P1, FX-REQ-078) + AXIS DS 전면 리디자인(P1, FX-REQ-079) |
| 4.1 | 2026-03-18 | Sprint 17 계획 — F80(AI Foundry MCP, P1) + F81(AgentInbox 스레드, P1) + F82(PlannerAgent Orchestrator, P1) 등록 |
| 4.2 | 2026-03-19 | F78+F79 완료 — F78 Production E2E(94%) + F79 AXIS DS 리디자인(96%) ✅, PDCA 전주기 Agent Teams ×5 |
| 4.3 | 2026-03-19 | Sprint 17 완료 보정 — F80(100%)+F81(100%)+F82(97%) ✅, §1/§2/§3/§5/§6 갱신, REQ sync 82건, GitHub Issues+Project 일괄 동기화 |
| 4.4 | 2026-03-19 | Sprint 19 계획 — F87(ThreadReplyForm UI, P1) + F88(스레드 API 보강, P1) + F89(통합 테스트+E2E, P2) 등록, v1.7.0 마일스톤 |
| 4.5 | 2026-03-19 | Sprint 19 완료 — F87(100%)+F88(100%)+F89(100%) ✅, 356 tests, PDCA 100%, archived |
| 4.6 | 2026-03-19 | F90 등록 — PlannerAgent gatherExternalToolInfo() 프롬프트 연동 (P2, 단독 작업, FX-REQ-090) |
| 4.7 | 2026-03-19 | Sprint 18 소급 등록 — F83(멀티테넌시,93%)+F84(GitHub,95%)+F85(Slack,90%)+F86(릴리스) §5/§6 추가, v1.6.0 마일스톤 ✅, system-version 1.6.0 |
| 4.8 | 2026-03-19 | F91 등록 + 요구사항 정합성 — F91 executePlan() repoUrl(P2) §5/§6 추가, GitHub Issues F83~F89 등록(#91~#97), Execution Plan 미완료 5건 정리 |
| 4.9 | 2026-03-19 | Phase 3 잔여 F92~F97 등록 — 멀티테넌시 고도화(P1) + GitHub 고도화(P1) + Slack 고도화(P2) + PlannerAgent 고도화(P2) + v1.7.0 배포(P0) + 테스트 커버리지(P2) |
| 5.0 | 2026-03-19 | F96 v1.7.0 프로덕션 배포 완료 — Workers 50e9c494 배포 ✅, system-version 1.7.0, D1 12/12 적용 완료 |
| 5.1 | 2026-03-19 | Sprint 20 F92 완료 — 멀티테넌시 고도화(90%), Org CRUD 12 endpoints, roleGuard, OrgSwitcher UI, 399+48 tests, D1 0013 적용, 73 endpoints |
