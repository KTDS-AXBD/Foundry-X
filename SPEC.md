---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 5.29
status: Active
category: SPEC
system-version: Sprint 48
created: 2026-03-16
updated: 2026-03-23
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- **PRD**: [[FX-SPEC-PRD-V8]] (`docs/specs/prd-v8-final.md`) — v8: AI 에이전트 오케스트레이션 플랫폼 정체성 재정의
- **Phase**: **Phase 4 Go 판정 완료** → Phase 5 착수 (Agent Evolution 완결, 온보딩 병행)
- **Sprint**: 50
- **Package Versions**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0

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
| Sprint 22 | ✅ 완료 (F94 99%) |
| PDCA Sprint 22 | ✅ 완료 (FX-RPRT-023, Match Rate 99%) |
| Sprint 21 | ✅ 완료 (F93 93%, Overall 93%) |
| PDCA Sprint 21 | ✅ 완료 (FX-RPRT-021, Match Rate 93%) |
| Sprint 23 | ✅ 완료 (F95 91%, F97 92%) |
| PDCA Sprint 23 | ✅ 완료 (Match Rate 92%) |
| Sprint 24 | ✅ 완료 (F107 100%, F110 95%, F113 90%, F115 90%, Overall 95%) |
| PDCA Sprint 24 | ✅ 완료 (FX-RPRT-025, Match Rate 95%) |
| Sprint 25 | ✅ 완료 (F98 100%, F104 95%, Overall 97%) |
| PDCA Sprint 25 | ✅ 완료 (FX-RPRT-026, Match Rate 97%) |
| Sprint 26 | ✅ 완료 (F106 85%, F108 100%, F109 94%, F111 95%, Overall 94%) |
| PDCA Sprint 26 | ✅ 완료 (FX-RPRT-027, Match Rate 94%) |
| Sprint 27 | ✅ 완료 (F100 94%, F99 94%, F101 94%, Overall 94%) |
| PDCA Sprint 27 | ✅ 완료 (FX-RPRT-028, Match Rate 94%) |
| Sprint 28 | ✅ 완료 (F102 93%, F103 95%, F105 82%, Overall 93%) |
| PDCA Sprint 28 | ✅ 완료 (FX-RPRT-029, Match Rate 93%) |
| Sprint 29 | ✅ 완료 (F120 88%, F121 100%, F122 97%, Overall 93%) |
| PDCA Sprint 29 | ✅ 완료 (FX-RPRT-030, Match Rate 93%) |
| Sprint 30 | ✅ 완료 (F123 100%, F124 86%, F125 100%, F126 88%, F127 100%, F128 72%→, Overall 93%) |
| PDCA Sprint 30 | ✅ 완료 (FX-RPRT-031, Match Rate 93%) |
| Sprint 31 | ✅ 완료 (F129 100%, F130 95%, F131 90%, F132 95%, Overall 95%) |
| PDCA Sprint 31 | ✅ 완료 (FX-ANLS-031, Match Rate 95%) |
| Sprint 32 | ✅ 완료 (F156 ✅, F157 ✅) — PRD v5 완전성 점검 + Phase 5 로드맵 |
| Sprint 33 | ✅ 완료 (F153 ✅, F154 ✅, F155 ✅, Overall 94%) — Agent Evolution Track B |
| PDCA Sprint 33 | ✅ 완료 (track-b-dev-tools, Match Rate 94%) |
| Sprint 35 | ✅ 완료 (F143 85%, F142 96%, Overall 92%) — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 |
| PDCA Sprint 35 | ✅ 완료 (FX-RPRT-035, Match Rate 92%, 1 iteration) |
| Sprint 36 | ✅ 완료 (F136 96%, F137 96%, Overall 96%) — 태스크별 모델 라우팅 + Evaluator-Optimizer 패턴 |
| PDCA Sprint 36 | ✅ 완료 (FX-RPRT-036, Match Rate 96%) |
| Sprint 37 | ✅ 완료 (F138 95%, F139 95%, Overall 95%) — ArchitectAgent + TestAgent |
| PDCA Sprint 37 | ✅ 완료 (FX-RPRT-037, Match Rate 95%) |
| Sprint 38 | ✅ 완료 (F140 97%, F141 97%, Overall 97%) — SecurityAgent + QAAgent, 6종 역할 에이전트 완성 |
| PDCA Sprint 38 | ✅ 완료 (FX-RPRT-038, Match Rate 97%) |
| Sprint 39 | ✅ 완료 (F144 93%, F149 93%, F150 93%, Overall 93%) — Fallback 체인 + 프롬프트 게이트웨이 + 피드백 루프 |
| PDCA Sprint 39 | ✅ 완료 (FX-RPRT-039, Match Rate 93%) |
| Sprint 40 | ✅ 완료 (F145 91%, F148 91%, Overall 91%) — InfraAgent + 에이전트 자기 평가 |
| PDCA Sprint 40 | ✅ 완료 (FX-RPRT-040, Match Rate 91%) |
| Sprint 41 | ✅ 완료 (F146 94%, F147 94%, Overall 94%) — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 |
| PDCA Sprint 41 | ✅ 완료 (FX-RPRT-041, Match Rate 94%) |
| Sprint 42 | ✅ 완료 (F151 97%, F152 97%, Overall 97%) — 자동화 품질 리포터 + 에이전트 마켓플레이스 (**Track A 완결**) |
| PDCA Sprint 42 | ✅ 완료 (FX-RPRT-042, Match Rate 97%) |
| Sprint 43 | ✅ 완료 (F143 UI 95%, Overall 95%) — 모델 품질 대시보드 UI (TokensPage Model Quality 탭 + Agent×Model 히트맵) |
| PDCA Sprint 43 | ✅ 완료 (FX-RPRT-043, Match Rate 95%) |
| Sprint 44 | ✅ 완료 (F116 95%) — KT DS SR 시나리오 구체화 (SrClassifier + SrWorkflowMapper + 5 endpoints, Phase 5 고객 파일럿 준비) |
| PDCA Sprint 44 | ✅ 완료 (FX-RPRT-044, Match Rate 95%) |
| Sprint 45 | ✅ 완료 (F158~F161, Match 97%) — KPI 자동 수집 인프라 (페이지뷰 추적 + CLI 로깅 + Cron 집계 + 대시보드 연결) |
| PDCA Sprint 45 | ✅ 완료 (FX-RPRT-045, Match Rate 97%) |
| Sprint 46 | ✅ 완료 (F162+F163+F169, Match 91%) — PRD v8 재정의 + Azure PoC + SI R&R + 데모 환경 |
| Sprint 47 | ✅ 완료 (F164+F165+F166+F170, Match 93%) — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 + Adoption KPI 대시보드 |
| Sprint 48 | ✅ 완료 (F167+F168, Match 95%) — ML 하이브리드 SR 분류기 + SR 대시보드 UI |
| Sprint 49 | ✅ 완료 (F171+F172, Match 95%) — 대시보드 IA 재설계 + 인터랙티브 온보딩 투어 |
| Sprint 50 | ✅ 완료 (F173+F174, Match 100%) — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯 |
| npm | foundry-x@0.5.0 published ✅ |
| typecheck | ✅ |
| build | ✅ |
| lint | ✅ (0 error) |
| tests | 1029테스트 ✅ (API 패키지) + CLI 131 + Web 74 + ~55 E2E |
| API endpoints | 172개 (32 routes) |
| API services | 79개 |
| D1 tables | 50개 (migrations 0001~0031) |
| D1 remote | 0001~0031 전체 적용 완료 |
| Workers | foundry-x-api.ktds-axbd.workers.dev ✅ v2.4.0 |
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
| v1.8.0 | Sprint 20: 멀티테넌시 고도화 — Org CRUD 12 endpoints + roleGuard + Web UI (Match Rate 90%) | ✅ |
| v1.8.1 | Sprint 21: GitHub 양방향 동기화 고도화 — Issue→Task + 외부 PR 리뷰 + @foundry-x 코멘트 (Match Rate 93%) | ✅ |
| — | Sprint 22: Slack 고도화 — Interactive D1 실연동 + 채널별 알림 (Match Rate 99%) | ✅ |
| — | Sprint 23: PlannerAgent 고도화 + 테스트 커버리지 확장 (Match Rate 92%) | ✅ |
| **v2.0.0** | **Sprint 24: Phase 3 마무리 — 멀티 프로젝트 + Jira + 모니터링 + 워크플로우 (97 ep, 535 tests, Match Rate 95%)** | ✅ |
| v2.1.0 | Sprint 25~26: 기술 스택 점검(F98) + AXIS DS 전환(F104) + Phase 4 통합(F106/F108/F109/F111) | ✅ |
| v2.2.0 | Sprint 27~28: Phase 3 완결(F99~F103/F105) — KPI+Reconciliation+AutoFix+AutoRebase+Linting+Plumb | ✅ |
| v2.3.0 | Sprint 29: 실사용자 온보딩 기반(F120~F122) — 가이드 UI + 피드백 API + 체크리스트 (Match Rate 93%) | ✅ |
| v2.4.0 | Sprint 30: 프로덕션 배포 동기화 + Phase 4 Conditional Go + 품질 강화 (F123~F128, Match Rate 93%) | ✅ |
| v2.5 | Sprint 31: 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 + 로그인 UI (F129~F133, Match Rate 95%) | ✅ |
| — | **⚡ 버전 정책 전환 (F134)** — 이후 프로젝트는 Sprint N, 패키지는 Independent SemVer | — |
| Sprint 32 | PRD v5 완전성 점검 + Phase 4→5 전환 로드맵 (F156/F157, 거버넌스 Sprint) | ✅ |
| Sprint 33 | Agent Evolution Track B — gstack 스킬 설치 + claude-code-router + OpenRouter (F153~F155, Match Rate 94%) | ✅ |
| Sprint 35 | 모델 비용/품질 대시보드(F143) + Sprint 워크플로우 템플릿(F142) — 630 tests, Match Rate 92% | ✅ |
| Sprint 36 | 태스크별 모델 라우팅(F136) + Evaluator-Optimizer 패턴(F137) — 666 tests, Match Rate 96% | ✅ |
| Sprint 37 | ArchitectAgent(F138) + TestAgent(F139) — 714 tests, Match Rate 95% | ✅ |
| Sprint 38 | SecurityAgent(F140) + QAAgent(F141) — 745 tests, Match Rate 97% | ✅ |
| Sprint 39 | Fallback 체인(F144) + 프롬프트 게이트웨이(F149) + 피드백 루프(F150) — 792 tests, Match Rate 93% | ✅ |
| Sprint 40 | InfraAgent(F145) + 에이전트 자기 평가(F148) — 835 tests, Match Rate 91% | ✅ |
| Sprint 41 | 에이전트 역할 커스터마이징(F146) + 멀티모델 앙상블 투표(F147) — 877 tests, Match Rate 94% | ✅ |
| Sprint 42 | 자동화 품질 리포터(F151) + 에이전트 마켓플레이스(F152) — 925 tests, Match Rate 97%, **Agent Evolution Track A 완결** | ✅ |
| Sprint 44 | KT DS SR 시나리오 구체화(F116) — 953 tests, Match Rate 95%, **Phase 5 고객 파일럿 준비** | ✅ |

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

### Sprint 22 (v1.8+) — Slack 고도화 (Interactive D1 실연동 + 채널별 알림) ✅
- [x] D1 migration 0014: slack_notification_configs 테이블 (FX-REQ-094 DONE)
- [x] SlackService 확장 — 이벤트 타입 8개 + Block Kit 빌더 5개 + eventToCategory() (FX-REQ-094 DONE)
- [x] SSEManager 카테고리 라우팅 — forwardToSlack 리팩토링 + fallback (FX-REQ-094 DONE)
- [x] Interactive D1 실 연동 — plan_approve/reject → agent_plans 갱신 + race condition 방어 (FX-REQ-094 DONE)
- [x] 알림 설정 CRUD 4 endpoints — GET/PUT/DELETE/POST /orgs/:orgId/slack/configs (FX-REQ-094 DONE)
- [x] Zod 스키마 4개 — Category, Config, Upsert, Test (FX-REQ-094 DONE)
- [x] 테스트 +32건 — 블록 빌더 5 + 매핑 5 + D1 연동 8 + 라우팅 7 + CRUD 7 (FX-REQ-094 DONE)
- [x] typecheck ✅ + 471 tests 전부 pass (PDCA 99%)

### Sprint 21 (v1.8.0) — GitHub 양방향 동기화 고도화 ✅
- [x] PR 자동 리뷰 실 연동 — GitHubSyncService 확장 (FX-REQ-093 DONE)
- [x] Issue→Task 자동 생성 — webhook issue 이벤트 → agent_tasks INSERT (FX-REQ-093 DONE)
- [x] typecheck + build + tests 통과 (PDCA 93%)

### Sprint 23 — PlannerAgent 고도화 + 테스트 커버리지 확장 ✅
- [x] FileContextCollector 서비스 — 파일 컨텍스트 수집 + 관련도 점수 (FX-REQ-095 DONE)
- [x] planner-prompts 서비스 — 분석 모드별 시스템 프롬프트 분리 (FX-REQ-095 DONE)
- [x] analyzeCodebase() 리팩토링 — 3단계 분석 파이프라인 (FX-REQ-095 DONE)
- [x] D1 migration 0015 — agent_plans 분석 메타데이터 컬럼 추가 (FX-REQ-095 DONE)
- [x] E2E 5개 spec — org-settings + org-members + workspace-nav + tokens + slack-config (FX-REQ-097 DONE)
- [x] API 보강 12건 — org-invitation-delete + webhook-extended + slack-config edge (FX-REQ-097 DONE)
- [x] typecheck ✅ + 502 tests 전부 pass (PDCA 92%)

### Sprint 24 (v2.0.0) — Phase 3 마무리: 멀티 프로젝트 + Jira + 모니터링 + 워크플로우 ✅
- [x] 멀티 프로젝트 대시보드 — ProjectOverviewService + 라우트 3ep + ProjectCard UI (FX-REQ-107 DONE)
- [x] Webhook 일반화 + Jira 연동 — WebhookRegistry + JiraAdapter + 라우트 5ep (FX-REQ-110 DONE)
- [x] 모니터링 + 옵저버빌리티 — MonitoringService + AlertRule + 라우트 5ep (FX-REQ-113 DONE)
- [x] 에이전트 워크플로우 빌더 — WorkflowEngine + 라우트 5ep + React Flow UI (FX-REQ-115 DONE)
- [x] D1 migration 0016 — 4 tables (projects, jira_configs, alert_rules, workflow_definitions)
- [x] typecheck ✅ + 535 tests 전부 pass + Workers v2.0.0 배포 (PDCA 95%)

### Sprint 25 — 기술 스택 점검 + AXIS DS UI 전환 ✅
- [x] 기술 스택 점검 — Discovery-X/AI Foundry/AXIS DS 호환성 매트릭스 작성, Kill→Go (FX-REQ-098 DONE)
- [x] AXIS DS UI 전환 — shadcn/ui → AXIS DS 11 컴포넌트 전환 + 디자인 토큰 통합 (FX-REQ-104 DONE)
- [x] typecheck ✅ + PDCA 97%

### Sprint 26 (v2.1.0) — Phase 4 통합: SSO + BFF + iframe + D1 엔티티 ✅
- [x] 프론트엔드 통합 — iframe + postMessage SSO (FX-REQ-106 DONE)
- [x] 인증 SSO 통합 — Hub Token + org_services (FX-REQ-108 DONE)
- [x] API BFF→통합 — Service Bindings + HTTP 폴백 (FX-REQ-109 DONE)
- [x] D1 스키마 통합 — entity_registry + links (FX-REQ-111 DONE)
- [x] D1 migration 0017 + typecheck ✅ + PDCA 94%

### Sprint 27 — Phase 3-B 기술 기반 완성 ✅
- [x] KPI 측정 인프라 — KpiLogger + /analytics 대시보드 + 4 endpoints (FX-REQ-100 DONE)
- [x] Git↔D1 Reconciliation — ReconciliationService + Cron 6h + 3 endpoints (FX-REQ-099 DONE)
- [x] 에이전트 hook 자동 수정 — AutoFixService LLM 2-retry + human escalation (FX-REQ-101 DONE)
- [x] D1 migration 0018 (kpi_events + reconciliation_runs) + typecheck ✅ + PDCA 94%

### Sprint 28 — Phase 3 완결: AutoRebase + Semantic Linting + Plumb 판정 ✅
- [x] 에이전트 자동 rebase — AutoRebaseService 3-retry + LLM 충돌 해결 (FX-REQ-102 DONE)
- [x] Semantic Linting — ESLint 커스텀 룰 3종 + hasSuggestions 수정 예시 (FX-REQ-103 DONE)
- [x] Plumb Track B 판정 — Stay Track A, ADR-001, 재판정 2026-09 (FX-REQ-105 DONE)
- [x] typecheck ✅ + PDCA 93%

### Sprint 30 (v2.4.0) — 프로덕션 배포 동기화 + Phase 4 Go 판정 + 품질 강화 ✅
- [x] D1 migration 0018 remote 적용 — Workers v2.2.0 배포 완료 (FX-REQ-123 DONE)
- [x] Workers v2.2.0 프로덕션 배포 + smoke test (FX-REQ-123 DONE)
- [x] F106 프론트엔드 통합 개선 — postMessage 6종 + Skeleton + ErrorBoundary (FX-REQ-124 DONE)
- [x] KPI 추적 대시보드 UI — K7/K8/K9 위젯 + Conditional Go (FX-REQ-125 DONE)
- [x] Phase 4 Go 판정 문서 작성 — Conditional Go (FX-REQ-125 DONE)
- [x] Harness Evolution Rules 자동 감지 — 4규칙 + 2ep + SSE (FX-REQ-126 DONE)
- [x] PRD v5 MVP 체크리스트 갱신 — 6/6 ✅ + codegen 보류 (FX-REQ-127 DONE)
- [x] Phase 4 통합 경로 E2E — 4시나리오 (FX-REQ-128 DONE)
- [x] API 에러 응답 표준화 — ErrorResponse 스키마 통일 (FX-REQ-128 DONE)
- [x] typecheck ✅ + PDCA 93%

### Sprint 29 (v2.3.0) — 실사용자 온보딩 기반: 가이드 UI + 피드백 API + 체크리스트 ✅
- [x] 온보딩 가이드 UI — /getting-started 페이지 + 기능카드 5종 + FAQ 5종 (FX-REQ-120 DONE)
- [x] 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + NpsSummaryWidget (FX-REQ-121 DONE)
- [x] 온보딩 체크리스트 — 사용자별 진행률 + KpiLogger 연동 (FX-REQ-122 DONE)
- [x] D1 migration 0019 + typecheck ✅ + PDCA 93%

### Sprint 31 (v2.5) — 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 ✅
- [x] D1 migration 0018~0019 remote 적용 — 전체 적용 확인 (FX-REQ-129 DONE)
- [x] Workers v2.4.0 프로덕션 배포 + smoke test — fe2f72a7 (FX-REQ-129 DONE)
- [x] SPEC.md §1/§2/§3 보정 — v5.9, system-version 2.4.0, 마일스톤 ✅ (FX-REQ-130 DONE)
- [x] Sprint 29/30 Execution Plan 체크박스 동기화 (FX-REQ-130 DONE)
- [x] MEMORY.md 보정 — Workers v2.4.0/D1/검증수치/다음작업 (FX-REQ-130 DONE)
- [x] ServiceContainer FX_NAVIGATE router.push 연결 + serviceName breadcrumb (FX-REQ-131 DONE)
- [x] E2E 보강 — ErrorResponse + Harness Rules + 온보딩 플로우 + KPI 대시보드 +6 tests (FX-REQ-131 DONE)
- [x] 온보딩 킥오프 체크리스트 문서 — S1~S5 + Go/Kill 기준 + 지원 체계 (FX-REQ-132 DONE)
- [x] 로그인/회원가입 UI — /login 페이지 + auth-store + 사이드바 인증 + fetchApi 401 수정 (FX-REQ-133 DONE)
- [x] typecheck ✅ + PDCA 95%

### Sprint 32 — PRD v5 완전성 점검 + Phase 4→5 전환 로드맵 ✅
- [x] PRD v5 G1~G12 갭 항목 상태 검증 — 9건 완료, 1건 진행(G10), 2건 수요 대기(G2/G5) (FX-REQ-156 DONE)
- [x] Phase 3 산출물 완료 검증 — 11/11 항목 ✅ (FX-REQ-156 DONE)
- [x] Phase 4 산출물 완료 검증 — 11/12 항목 ✅, G2 GitLab P3 수요 대기 (FX-REQ-156 DONE)
- [x] Phase 5 미착수 F-item Layer 1~4 분류 + 의존성 문서화 (FX-REQ-157 DONE)
- [x] 온보딩 4주 추적 계획 — K7/K8/K9/K12 측정 방법 + W1~W4 활동 정의 (FX-REQ-157 DONE)
- [x] Phase 4 최종 Go/Pivot/Kill 판정 기준 수치화 (FX-REQ-157 DONE)
- [x] SPEC.md §2/§5/§6 Sprint 32 반영

### Sprint 35 — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 ✅
- [x] D1 migration 0021 — model_execution_metrics 테이블 + 인덱스 4개 (FX-REQ-143 DONE)
- [x] ModelMetricsService — recordExecution + getModelQuality + getAgentModelMatrix (FX-REQ-143 DONE)
- [x] GET /tokens/model-quality + GET /tokens/agent-model-matrix endpoints (FX-REQ-143 DONE)
- [x] Sprint 워크플로우 템플릿 3종 — Standard(10노드) + Fast(6노드) + Review-Heavy(9노드) (FX-REQ-142 DONE)
- [x] 조건 평가기 3종 — match_rate_met + test_coverage_met + peer_review_approved (FX-REQ-142 DONE)
- [x] SprintContext 변수 체계 + GET /orgs/:orgId/workflows/sprint-templates (FX-REQ-142 DONE)
- [x] 테스트 +47 (630 total) + typecheck ✅ + PDCA 92% (1 iteration)

### Sprint 37 — ArchitectAgent + TestAgent ✅
- [x] architect-agent.ts — ArchitectAgent 서비스 (analyzeArchitecture + reviewDesignDoc + analyzeDependencies) (FX-REQ-138 DONE)
- [x] architect-prompts.ts — 아키텍처 분석 시스템 프롬프트 3종 (FX-REQ-138 DONE)
- [x] test-agent.ts — TestAgent 서비스 (generateTests + analyzeCoverage + suggestEdgeCases) (FX-REQ-139 DONE)
- [x] test-agent-prompts.ts — 테스트 생성 시스템 프롬프트 3종 (FX-REQ-139 DONE)
- [x] agent.ts routes — 4개 엔드포인트 추가 (architect 2 + test 2) (FX-REQ-138, FX-REQ-139 DONE)
- [x] agent.ts schemas — Architecture + Test 요청/응답 스키마 (FX-REQ-138, FX-REQ-139 DONE)
- [x] agent-orchestrator.ts — spec-analysis→ArchitectAgent, test-generation→TestAgent 위임 (FX-REQ-138, FX-REQ-139 DONE)
- [x] architect-agent.test.ts — 20개 테스트 (FX-REQ-138 DONE)
- [x] test-agent.test.ts — 28개 테스트 (FX-REQ-139 DONE)
- [x] typecheck ✅ + lint ✅ + 714 tests ✅ + 기존 회귀 0건 (PDCA 95%)

### Sprint 38 — SecurityAgent + QAAgent ✅
- [x] security-agent.ts — SecurityAgent 서비스 (scanVulnerabilities + analyzePRDiff + checkOWASPCompliance) (FX-REQ-140 DONE)
- [x] security-agent-prompts.ts — 보안 분석 시스템 프롬프트 3종 (FX-REQ-140 DONE)
- [x] qa-agent.ts — QAAgent 서비스 (runBrowserTest + validateAcceptanceCriteria + detectRegressions) (FX-REQ-141 DONE)
- [x] qa-agent-prompts.ts — QA 테스트 시스템 프롬프트 3종 (FX-REQ-141 DONE)
- [x] agent.ts routes — 4개 엔드포인트 추가 (security 2 + qa 2) (FX-REQ-140, FX-REQ-141 DONE)
- [x] agent.ts schemas — Security + QA 요청/응답 스키마 (FX-REQ-140, FX-REQ-141 DONE)
- [x] agent-orchestrator.ts — security-review→SecurityAgent, qa-testing→QAAgent 위임 (FX-REQ-140, FX-REQ-141 DONE)
- [x] security-agent.test.ts — 16개 테스트 (FX-REQ-140 DONE)
- [x] qa-agent.test.ts — 15개 테스트 (FX-REQ-141 DONE)
- [x] typecheck ✅ + lint ✅ + 745 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 39 — Fallback 체인 + 프롬프트 게이트웨이 + 피드백 루프 ✅
- [x] fallback-chain.ts — FallbackChainService (executeWithFallback + classifyError + recordFailover) (FX-REQ-144 DONE)
- [x] prompt-gateway.ts — PromptGatewayService (sanitize + abstractCode + 4종 기본규칙) (FX-REQ-149 DONE)
- [x] agent-feedback-loop.ts — AgentFeedbackLoopService (captureFailure + submitFeedback + applyLearning) (FX-REQ-150 DONE)
- [x] D1 migration 0023 — fallback_events + prompt_sanitization_rules + agent_feedback 3테이블 (FX-REQ-144, FX-REQ-149, FX-REQ-150 DONE)
- [x] agent.ts routes — 6개 엔드포인트 추가 (fallback 2 + gateway 2 + feedback 2) (FX-REQ-144, FX-REQ-149, FX-REQ-150 DONE)
- [x] typecheck ✅ + lint ✅ + 792 tests ✅ + 기존 회귀 0건 (PDCA 93%)

### Sprint 40 — InfraAgent + 에이전트 자기 평가 ✅
- [x] infra-agent.ts — InfraAgent 서비스 (analyzeInfra + simulateChange + validateMigration) (FX-REQ-145 DONE)
- [x] infra-agent-prompts.ts — 인프라 분석 시스템 프롬프트 3종 (FX-REQ-145 DONE)
- [x] agent-self-reflection.ts — AgentSelfReflection (reflect + shouldRetry + enhanceWithReflection 래퍼) (FX-REQ-148 DONE)
- [x] agent.ts routes — 5개 엔드포인트 추가 (infra 3 + reflection 2) (FX-REQ-145, FX-REQ-148 DONE)
- [x] agent-orchestrator.ts — infra-analysis→InfraAgent 위임, AgentTaskType 9→10종 (FX-REQ-145 DONE)
- [x] typecheck ✅ + lint ✅ + 835 tests ✅ + 기존 회귀 0건 (PDCA 91%)

### Sprint 41 — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 ✅
- [x] custom-role-manager.ts — CustomRoleManager (D1 CRUD + BUILTIN_ROLES 7종 + systemPromptOverride + custom:* 위임) (FX-REQ-146 DONE)
- [x] ensemble-voting.ts — EnsembleVoting (allSettled 병렬 + 3종 투표 majority/quality-score/weighted) (FX-REQ-147 DONE)
- [x] D1 migration 0024 — custom_agent_roles 테이블 (FX-REQ-146 DONE)
- [x] agent.ts routes — 7개 엔드포인트 추가 (custom-roles CRUD 5 + ensemble 2) (FX-REQ-146, FX-REQ-147 DONE)
- [x] typecheck ✅ + lint ✅ + 877 tests ✅ + 기존 회귀 0건 (PDCA 94%)

### Sprint 42 — 자동화 품질 리포터 + 에이전트 마켓플레이스 (Agent Evolution Track A 완결) ✅
- [x] automation-quality-reporter.ts — AutomationQualityReporter (5테이블 집계 + 6종 개선규칙 + 스냅샷 캐시) (FX-REQ-151 DONE)
- [x] agent-marketplace.ts — AgentMarketplace (publish + install + rate + 3 D1 테이블) (FX-REQ-152 DONE)
- [x] D1 migration 0025 — automation_quality_snapshots 테이블 (FX-REQ-151 DONE)
- [x] D1 migration 0026 — agent_marketplace_items + agent_marketplace_installs + agent_marketplace_ratings 테이블 (FX-REQ-152 DONE)
- [x] routes — 9개 엔드포인트 추가 (quality-report 3 + marketplace 6) (FX-REQ-151, FX-REQ-152 DONE)
- [x] typecheck ✅ + lint ✅ + 925 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 44 — KT DS SR 시나리오 구체화 (F116, Phase 5 고객 파일럿 준비) ✅
- [x] SrClassifier 서비스 — 규칙 기반 5종 SR 유형 자동 분류 (FX-REQ-116 DONE)
- [x] SrWorkflowMapper 서비스 — 유형별 에이전트 워크플로우 DAG 매핑 (FX-REQ-116 DONE)
- [x] sr.ts schemas — Zod 스키마 6종 + 응답 타입 2종 (FX-REQ-116 DONE)
- [x] sr.ts routes — 5개 엔드포인트 (CRUD + 워크플로우 실행) (FX-REQ-116 DONE)
- [x] D1 migration 0027 — sr_requests + sr_workflow_runs + 인덱스 4개 (FX-REQ-116 DONE)
- [x] SR 유형 분류 체계 문서 + 데모 시나리오 2종 (FX-REQ-116 DONE)
- [x] templates/kt-ds-sr/CLAUDE.md 업데이트 (FX-REQ-116 DONE)
- [x] typecheck ✅ + 953 tests ✅ + 기존 회귀 0건 (PDCA 95%)

### Sprint 45 — KPI 자동 수집 인프라 (Phase 5 온보딩 데이터 기반) ✅
- [x] useKpiTracker 훅 — Next.js usePathname() + useEffect로 page_view 자동 전송 (FX-REQ-158 DONE)
- [x] api-client.ts KPI 함수 — getKpiSnapshotTrend() + KpiSnapshot 타입 (FX-REQ-158 DONE)
- [x] CLI postRun hook — init/status/sync 완료 후 cli_invoke 이벤트 전송 (FX-REQ-159 DONE)
- [x] kpi_snapshots D1 테이블 — 일별 KPI 집계 스냅샷 (FX-REQ-160 DONE)
- [x] Cron 집계 로직 — K7(WAU) + K8(에이전트 완료율) + K11(SDD 정합률) 자동 산출 (FX-REQ-160 DONE)
- [x] KPI 대시보드 실데이터 바인딩 — Phase4Kpi API → UI 연결 (FX-REQ-161 DONE)
- [x] typecheck ✅ + lint ✅ + 961+131+68 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 50 — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯 ✅
- [x] 초대 링크 생성 UI + 복사 버튼 — 관리자 멤버 화면에서 1클릭 URL 생성 (FX-REQ-173 DONE)
- [x] 비밀번호 설정 페이지 — `/invite/[token]` public route, 토큰 검증 + 비밀번호 입력 (FX-REQ-173 DONE)
- [x] 초대 수락 자동 로그인 — 비밀번호 설정 완료 → JWT 발급 → /getting-started 리다이렉트 (FX-REQ-173 DONE)
- [x] 초대 상태 UI 개선 — 멤버 목록에 대기/수락/만료 뱃지 표시 (FX-REQ-173 DONE)
- [x] 플로팅 피드백 위젯 — `(app)/layout.tsx` 전역 삽입, NPS + 코멘트 (FX-REQ-174 DONE)
- [x] 피드백 컨텍스트 자동 첨부 — 현재 페이지 경로 + 세션 시간 (FX-REQ-174 DONE)
- [x] 주간 사용 요약 API — `GET /kpi/weekly-summary` (FX-REQ-174 DONE)
- [ ] 프로덕션 배포 — Sprint 48~50 코드 Workers/Pages 반영
- [x] typecheck ✅ + lint ✅ + tests 통과 + PDCA 100%

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
| F112 | GitLab API 지원 — octokit + GitLab API 두 플랫폼 추상화 (FX-REQ-112, P3) | v2.2+ | 📋 | PRD v5 G2, 수요 확인 후 |
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
| F117 | 외부 고객사 파일럿 — SR 자동화 성공 사례 기반 제안 + 데모 (FX-REQ-117, P1) | v3.0 | 📋 | PRD v5 G9, Phase 5 |
| F118 | 모노리포→멀티리포 분리 검토 — 고객 배포 요구에 따라 판단 (FX-REQ-118, P3) | v3.0+ | 📋 | PRD v5 G5, 수요 시 |
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
| F179 | 사업 아이템 수집 채널 통합 — Agent 자동 수집 + Field-driven + IDEA Portal 연계 (FX-REQ-179, P1) | TBD | 📋 | 1단계 수집 자동화 |
| F180 | 사업계획서 초안 자동 생성 — Discovery-X 발굴 결과 기반 B2B 사업계획서 초안 (FX-REQ-180, P2) | TBD | 📋 | 3단계 형상화 |
| F181 | Prototype 자동 생성 — 디자인시스템 기반 사업 아이템 데모 Prototype 자동 생성 (FX-REQ-181, P2) | TBD | 📋 | 3단계 형상화, 손해사정 Prototype 참고 |
| F182 | 5시작점 분류 + 경로 안내 — 아이디어/시장·타겟/고객문제/기술/기존서비스 시작점 식별 + 분석 경로 매핑 (FX-REQ-182, P0) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.1 #1+#2, Conditional Go |
| F183 | Discovery 9기준 체크리스트 + 예외처리 — 9개 완료기준 충족 관리 + 미달성 시 재분석/루프백 (FX-REQ-183, P0) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.1 #3+#6 |
| F184 | pm-skills 실행 가이드 + 컨텍스트 관리 — 18개 스킬 단계별 안내 + 분석 데이터 흐름 자동화 (FX-REQ-184, P0) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.1 #4+#7 |
| F185 | PRD 자동 생성 — Discovery 9기준 충족 시 분석 결과→PRD 템플릿 자동 매핑 (FX-REQ-185, P0) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.1 #5 |
| F186 | 다중 AI 검토 파이프라인 — PRD를 ChatGPT/Gemini/DeepSeek API로 자동 검토 + 스코어카드 (FX-REQ-186, P1) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.2 #1, ax-req-interview 연동 |
| F187 | 멀티 페르소나 사전 평가 — KT DS 8개 역할 에이전트 AI 평가 + 레이더 차트 + G/K/R 판정 (FX-REQ-187, P1) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.2 #2, BDP-001 2-9 |
| F188 | Six Hats 토론 — PRD에 대한 6모자 관점 20턴 토론 자동 수행 (FX-REQ-188, P2) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.2 #3 |
| F189 | Discovery 진행률 대시보드 — 9개 기준 달성 현황 시각화 (FX-REQ-189, P2) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.2 #4 |
| F190 | 시장/트렌드 데이터 자동 연동 — 외부 시장·경쟁사·트렌드 데이터 API 연동 + 자동 요약 (FX-REQ-190, P2) | TBD | 📋 | [[FX-SPEC-BDP-002-PRD]] §4.2 #5 |

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
| 5.2 | 2026-03-19 | Sprint 22 F94 완료 — Slack 고도화(99%), Interactive D1 실연동 + 채널별 알림 4 endpoints, 471 tests, D1 0014 적용 |
| 5.3 | 2026-03-20 | 정합성 보정 — Sprint 21/23 완료 반영, F95 PlannerAgent 고도화(91%) + F97 테스트 확장(92%), system-version 1.8.1, D1 tables 26→23 수정(실제 CREATE TABLE 기준), Workers v1.8.1, 502 tests, D1 0015 적용 |
| 5.4 | 2026-03-20 | PRD v5 F98~F118 등록 — 통합 플랫폼 비전, Phase 3-B~D + Phase 4 A~E + Phase 5 재구조화, 구 F98~F101→F107/F110/F113/F115 번호 재배정 |
| 5.5 | 2026-03-20 | Sprint 24 결과 반영 — F107(멀티프로젝트,100%)+F110(Jira,95%)+F113(모니터링,90%)+F115(워크플로우,90%) ✅, system-version 2.0.0, 97 ep, 39 svc, 535 tests, D1 0016(27 tables), Workers v2.0.0 |
| 5.6 | 2026-03-20 | Sprint 25 완료 — F98(기술 스택 점검,100% Kill→Go)+F104(AXIS DS 전환,95% 11컴포넌트) ✅, @axis-ds/* 3패키지 도입, @base-ui/react+next-themes 제거, Match Rate 97% |
| 5.7 | 2026-03-21 | Sprint 26~28 소급 반영 — F99/F100/F101 ✅(Sprint 27), F102/F103/F105 ✅(Sprint 28), Execution Plan Sprint 25~28 추가, 마일스톤 v2.1.0/v2.2.0 완료, Phase→4 갱신, system-version 2.2.0 |
| 5.8 | 2026-03-21 | Sprint 30 계획 — F123~F128 등록 (배포 동기화 P0 + Phase 4 Go 판정 P1 + 품질 강화 P1 + 기술부채 P2), Execution Plan 추가, 마일스톤 v2.4.0 추가 |
| 5.9 | 2026-03-22 | Sprint 31 계획 — F129~F132 등록 (프로덕션 동기화 P0 + SPEC 정합성 P0 + Match Rate 보강 P1 + 온보딩 킥오프 P1), Execution Plan 추가, 마일스톤 v2.5 추가 |
| 5.10 | 2026-03-22 | Sprint 31 완료 — F129(100%)+F130(95%)+F131(90%)+F132(95%) ✅, Workers v2.4.0 재배포, SPEC drift 0건, E2E +6, 온보딩 킥오프 문서, Match Rate 95% |
| 5.11 | 2026-03-22 | SPEC drift 보정 — system-version 2.4.0→2.5, D1 32→33테이블(0020 Google OAuth), §1 Sprint 31 반영, .gitignore 빌드 아티팩트 추가 |
| 5.12 | 2026-03-22 | F134 버전 정책 전환 — system-version→Sprint 31, §1 Package Versions 추가, §3 전환선+Sprint 32행, §5 F134 등록, §10 버전 정책 섹션 신설, package.json 4개 Independent SemVer 리셋 (cli 0.5.0, api/web/shared 0.1.0) |
| 5.13 | 2026-03-22 | Agent Evolution PRD + Track B 완료 — F135~F155 등록 (21건, Phase 5 Agent Evolution), Six Hats 20턴 토론, GitHub Issues #131~#151 + Org Project 동기화, Sprint 33 등록 (F153+F154+F155 Track B 개발 도구, Match Rate 94%), system-version Sprint 33 |
| 5.14 | 2026-03-22 | Sprint 32 완료 — F156(PRD v5 완전성 점검)+F157(Phase 5 로드맵) ✅, §2/§3/§5/§6 갱신, G1~G12 매핑 완료(9완료+1진행+2수요), Phase 5 Layer 1~4 분류, 온보딩 4주 추적 계획 |
| 5.15 | 2026-03-22 | Sprint 35 완료 — F143(모델 비용/품질 대시보드,85%)+F142(Sprint 워크플로우 템플릿,96%) ✅, ModelMetricsService+D1 0021+3 endpoints, Sprint 워크플로우 3종+조건 3종+SprintContext, 630 tests (+47), Match Rate 92%, Agent Team 2-Worker 병렬(11m 45s), system-version Sprint 35 |
| 5.16 | 2026-03-22 | Sprint 36 완료 — F136(태스크별 모델 라우팅)+F137(Evaluator-Optimizer 패턴) ✅, ModelRouter+createRoutedRunner+D1 0022, EvaluatorOptimizer+3종 EvaluationCriteria+3 endpoints, 666 tests (+36), Match Rate 96%, Agent Team 2-Worker 병렬(3m 15s), system-version Sprint 36 |
| 5.17 | 2026-03-22 | Sprint 37 완료 — F138(ArchitectAgent)+F139(TestAgent) ✅, architect-agent+architect-prompts+test-agent+test-agent-prompts 4서비스, AgentOrchestrator 역할 위임 통합, 4 endpoints, 714 tests (+48), Match Rate 95%, Agent Team 2-Worker 병렬(4m 45s), Track A P0 5/5 완료, system-version Sprint 37 |
| 5.18 | 2026-03-22 | Sprint 38~42 일괄 drift 보정 — §1 Sprint 31→42 + Phase 5a 완결, §2 수치 갱신(925 tests, 152 ep, 74 svc, 44 tables, 0001~0026), §2 Sprint 40~42 4행 추가, §3 Sprint 40~42 마일스톤 3행, §5 F151/F152 📋→✅, §6 Sprint 38 체크박스 보정 + Sprint 39~42 Execution Plan 5개 섹션 추가, system-version Sprint 42 |
| 5.19 | 2026-03-22 | Sprint 45 계획 — F158~F161 등록 (KPI 자동 수집 인프라: 페이지뷰 추적 P0 + CLI 로깅 P1 + Cron 집계 P0 + 대시보드 연결 P1), §2/§5/§6 갱신, system-version Sprint 45 |
| 5.24 | 2026-03-23 | SPEC drift 보정 — §1 PRD v5→v8 참조 갱신, §5 F162/F163/F169 📋→✅ (Sprint 46 완료 반영 누락 수정) |
| 5.25 | 2026-03-23 | Sprint 48 계획 — F167(ML 하이브리드 SR 분류기, P1)+F168(SR 대시보드 UI, P2) 📋→🔧, Plan 문서 작성 |
| 5.26 | 2026-03-23 | Sprint 48 완료 — F167(95%)+F168(95%) ✅, HybridSrClassifier+SR대시보드, 1029 API(+30)+74 Web(+6), D1 0031, 172 ep, 79 svc, system-version Sprint 48 |
| 5.23 | 2026-03-23 | 정합성 보정 — §2 수치 갱신(999 API/131 CLI/68 Web tests, 169 ep, 78 svc, 49 tables, 0001~0030), Sprint 46~47 상태 2행 추가, GitHub Issue F164~F166 닫힘+F170 생성+닫힘, system-version Sprint 47 |
| 5.27 | 2026-03-23 | Sprint 50 계획 — F173(팀원 셀프 온보딩 플로우, P0)+F174(인앱 피드백 위젯, P1) 📋 등록, §2/§5/§6 갱신, Plan 문서 작성 |
| 5.28 | 2026-03-23 | Sprint 50 완료 — F173(100%)+F174(100%) ✅, 2-Worker Agent Team(7m, 0 revert), 3 NEW endpoints + 2 MODIFY, 4 NEW components, 1051 API(+22)+73 Web, D1 0032, Match Rate 100% |
| 5.29 | 2026-03-23 | Phase 5b 사업개발 프로세스 — AX-Discovery-Process v0.8 분석, F175~F181 📋 등록 (사업 아이템 분류/분석파이프라인/패키징/멀티페르소나/수집채널/사업계획서/Prototype), [[FX-SPEC-BDP-001]] 생성 |

## §10 버전 정책

### 프로젝트 마일스톤
- **Sprint N**: 프로젝트 진행 상태 추적 (Sprint 32부터 적용)
- 이전(Sprint 1~31): v0.1~v2.5 형식 사용 (이력 보존, 소급 수정 안 함)

### 패키지 버전 (Independent SemVer 2.0)

| 패키지 | 현재 버전 | 배포 대상 | 버전 증가 기준 |
|--------|----------|----------|--------------|
| packages/cli | 0.5.0 | npm registry | CLI 기능 변경 |
| packages/api | 0.1.0 | Cloudflare Workers | API endpoint 변경 |
| packages/web | 0.1.0 | Cloudflare Pages | UI 기능 변경 |
| packages/shared | 0.1.0 | 내부 전용 | 타입/인터페이스 변경 |

### 0.x 기간 버전 증가 규칙

| 변경 유형 | 버전 증가 | 예시 |
|----------|----------|------|
| 하위 비호환 변경 | 0.MINOR.0 | 0.1.0 → 0.2.0 |
| 새 기능 추가 | 0.minor.PATCH | 0.1.0 → 0.1.1 |
| 버그 수정 | 0.minor.PATCH | 0.1.1 → 0.1.2 |

### 1.0.0 전환 기준

패키지별 독립 판단. 아래 두 조건 **모두** 충족 시 승격:
1. 외부 사용자가 프로덕션에서 실제 사용 중
2. 공개 API 하위 호환성 정책 수립 + API 문서화 완료
