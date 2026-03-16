---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 1.0
status: Active
category: SPEC
system-version: 0.2.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- **PRD**: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- **Phase**: Phase 1 (MVP, Month 1-3) — CLI + Plumb
- **Version**: 0.2.0

## §2 현재 상태

| 항목 | 상태 |
|------|------|
| Sprint 1 | ✅ 완료 (모노리포 + 핵심 모듈) |
| Sprint 2 | ✅ 완료 (커맨드 3개 + 템플릿 + CI + npm publish v0.1.1) |
| PDCA | ✅ 완료 (Match Rate 93%, Report 작성 완료) |
| typecheck | ✅ |
| build | ✅ |
| tests | 8파일 35테스트 ✅ |

## §3 마일스톤

| 버전 | 마일스톤 | 상태 |
|:----:|----------|:----:|
| v0.1.0 | Sprint 1: 모노리포 + 핵심 모듈 | ✅ |
| v0.2.0 | Sprint 2: CLI 커맨드 + 템플릿 + 배포 | ✅ |
| v0.3.0 | Sprint 3: Ink TUI + eslint + 안정화 | 🔧 |

## §4 성공 지표

| 지표 | 목표 | 현재 |
|------|------|------|
| CLI 주간 호출/사용자 | 10회+ | — |
| `--no-verify` 우회 비율 | < 20% | — |
| sync 후 수동 수정 파일 | 감소 추세 | — |
| 결정 승인율 | > 70% | — |

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

### Sprint 3 — 진행 중 (v0.3.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F15 | Ink TUI 공통 컴포넌트 (FX-REQ-015, P1) | v0.3 | 📋 | ui/components/ + ui/render.tsx |
| F16 | status 커맨드 Ink TUI 전환 (FX-REQ-016, P1) | v0.3 | 📋 | StatusView.tsx |
| F17 | init 커맨드 Ink TUI 전환 (FX-REQ-017, P1) | v0.3 | 📋 | InitView.tsx |
| F18 | sync 커맨드 Ink TUI 전환 (FX-REQ-018, P1) | v0.3 | 📋 | SyncView.tsx |
| F19 | eslint flat config 설정 (FX-REQ-019, P1) | v0.3 | 📋 | TD-02 해소 |
| F20 | non-TTY 폴백 (FX-REQ-020, P2) | v0.3 | 📋 | CI/pipe 환경 대응 |
| F21 | 프로젝트 관리 점검 및 개선 (FX-REQ-021, P0) | v0.3 | 📋 | BluePrint/WBS/요구사항/산출물 현행화 + 팀 공유·리뷰 시스템 |

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

### Sprint 3 (v0.3.0)
- [ ] eslint flat config 설정 + 기존 코드 lint fix (FX-REQ-019)
- [ ] Ink TUI 공통 컴포넌트 — StatusBadge, HealthBar, ProgressStep, Header, ErrorBox (FX-REQ-015)
- [ ] non-TTY 감지 + Ink/plain 분기 유틸 (FX-REQ-020)
- [ ] status 커맨드 Ink TUI 전환 (FX-REQ-016)
- [ ] init 커맨드 Ink TUI 전환 (FX-REQ-017)
- [ ] sync 커맨드 Ink TUI 전환 (FX-REQ-018)
- [ ] **[긴급]** 프로젝트 관리 점검 및 개선 — BluePrint/WBS/요구사항/산출물 현행화 + 팀 공유·리뷰 시스템 (FX-REQ-021)
- [ ] 기존 35개 테스트 통과 + typecheck + build + lint 검증

## §7 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Node.js 20, Commander + Ink |
| SDD Engine | Python, Plumb (subprocess) |
| 빌드 | pnpm workspace, Turborepo, tsc |
| 테스트 | vitest |
| Git 연동 | simple-git |

## §8 Tech Debt

| TD# | 등록일 | 항목 | 영향 |
|-----|:------:|------|------|
| ~~TD-01~~ | 2026-03-16 | ~~index.ts에 Commander 설정 미구현 (placeholder)~~ | ~~해소 (Sprint 2 — F6/F7/F8 커맨드 구현)~~ |
| TD-02 | 2026-03-16 | eslint 미설정 (package.json에 lint script 있으나 미설치) | lint 검증 불가 |

## §9 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — Sprint 1 완료 소급 등록, Sprint 2 계획 |
