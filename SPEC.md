---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 1.8
status: Active
category: SPEC
system-version: 0.6.0
created: 2026-03-16
updated: 2026-03-17
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- **PRD**: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- **Phase**: Phase 2 (API + Web + 에이전트 오케스트레이션) — Sprint 7 완료 (89%), Sprint 8 준비
- **Version**: 0.6.0

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
| npm | foundry-x@0.5.0 published ✅ |
| typecheck | ✅ |
| build | ✅ |
| lint | ✅ (0 error) |
| tests | 31파일 176테스트 ✅ (CLI 106 + API 43 + Web 27) |

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
